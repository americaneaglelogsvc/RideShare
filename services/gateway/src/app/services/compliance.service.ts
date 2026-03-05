import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from './supabase.service';

/**
 * M11.4: Tenant-Specific Compliance Vault
 *
 * Key principles:
 * - Private Vault: Documents uploaded for Tenant A are strictly invisible to Tenant B.
 * - Hard-Gate: If a driver's documents for Tenant A are EXPIRED or REJECTED,
 *   DispatchService excludes them from Tenant A offers. They remain eligible
 *   for Tenant B if their Tenant B documents are valid.
 * - The compliance check is enforced at the PostGIS RPC level via check_driver_compliance().
 */

export interface ComplianceDocument {
  id: string;
  tenantId: string;
  driverIdentityId: string;
  driverProfileId: string;
  documentType: string;
  documentName: string;
  fileUrl?: string;
  status: string;
  issuedDate?: string;
  expiryDate?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Upload / register a compliance document for a driver within a specific tenant.
   * The document is ONLY visible to that tenant — strict tenant isolation.
   */
  async uploadDocument(params: {
    tenantId: string;
    driverIdentityId: string;
    driverProfileId: string;
    documentType: string;
    documentName: string;
    fileUrl?: string;
    fileHash?: string;
    issuedDate?: string;
    expiryDate?: string;
    metadata?: Record<string, any>;
  }): Promise<ComplianceDocument> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('compliance_documents')
      .insert({
        tenant_id: params.tenantId,
        driver_identity_id: params.driverIdentityId,
        driver_profile_id: params.driverProfileId,
        document_type: params.documentType,
        document_name: params.documentName,
        file_url: params.fileUrl,
        file_hash: params.fileHash,
        issued_date: params.issuedDate,
        expiry_date: params.expiryDate,
        status: 'pending_review',
        metadata: params.metadata || {},
      })
      .select('*')
      .single();

    if (error) {
      // Handle unique constraint violation (active doc already exists for this type)
      if (error.code === '23505') {
        throw new BadRequestException(
          `An active ${params.documentType} document already exists for this driver in this tenant. ` +
          'Please expire or reject the existing document first.',
        );
      }
      throw new BadRequestException('Failed to upload document: ' + error.message);
    }

    this.logger.log(
      `M11.4: Document "${params.documentType}" uploaded for driver ${params.driverProfileId} (tenant ${params.tenantId})`,
    );

    return this.mapDocument(data);
  }

  /**
   * List all compliance documents for a driver within a specific tenant.
   * Tenant A cannot see Tenant B documents — strict isolation.
   */
  async listDocuments(
    tenantId: string,
    driverProfileId: string,
  ): Promise<ComplianceDocument[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('compliance_documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('driver_profile_id', driverProfileId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException('Failed to list documents: ' + error.message);
    return (data || []).map((d: any) => this.mapDocument(d));
  }

  /**
   * Review (approve / reject) a compliance document.
   */
  async reviewDocument(
    tenantId: string,
    documentId: string,
    decision: 'approved' | 'rejected',
    reviewedBy: string,
    rejectionReason?: string,
  ): Promise<ComplianceDocument> {
    const supabase = this.supabaseService.getClient();

    const updatePayload: Record<string, any> = {
      status: decision,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (decision === 'rejected' && rejectionReason) {
      updatePayload.rejection_reason = rejectionReason;
    }

    const { data, error } = await supabase
      .from('compliance_documents')
      .update(updatePayload)
      .eq('id', documentId)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending_review')
      .select('*')
      .single();

    if (error || !data) {
      throw new NotFoundException('Document not found or not in pending_review status');
    }

    this.logger.log(
      `M11.4: Document ${documentId} ${decision} by ${reviewedBy} (tenant ${tenantId})`,
    );

    return this.mapDocument(data);
  }

  /**
   * Check if a driver is compliant for a given tenant.
   * Uses the PostGIS RPC function check_driver_compliance() when available,
   * falls back to direct query.
   */
  async isDriverCompliant(
    tenantId: string,
    driverProfileId: string,
  ): Promise<{ compliant: boolean; issues: string[] }> {
    const supabase = this.supabaseService.getClient();
    const issues: string[] = [];

    try {
      // Try PostGIS RPC first
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'check_driver_compliance',
        { p_tenant_id: tenantId, p_driver_profile_id: driverProfileId },
      );

      if (!rpcError && rpcResult !== null) {
        if (!rpcResult) {
          issues.push('Driver has expired or rejected compliance documents');
        }
        return { compliant: !!rpcResult, issues };
      }
    } catch {
      // RPC not available, fall through to manual check
    }

    // Fallback: manual check
    const { data: expiredDocs } = await supabase
      .from('compliance_documents')
      .select('id, document_type, expiry_date')
      .eq('tenant_id', tenantId)
      .eq('driver_profile_id', driverProfileId)
      .eq('status', 'approved')
      .not('expiry_date', 'is', null)
      .lt('expiry_date', new Date().toISOString().split('T')[0]);

    if (expiredDocs && expiredDocs.length > 0) {
      for (const doc of expiredDocs) {
        issues.push(`${doc.document_type} expired on ${doc.expiry_date}`);
      }

      // Mark them as expired
      const expiredIds = expiredDocs.map((d: any) => d.id);
      await supabase
        .from('compliance_documents')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .in('id', expiredIds);
    }

    const { data: rejectedDocs } = await supabase
      .from('compliance_documents')
      .select('id, document_type, rejection_reason')
      .eq('tenant_id', tenantId)
      .eq('driver_profile_id', driverProfileId)
      .eq('status', 'rejected');

    if (rejectedDocs && rejectedDocs.length > 0) {
      for (const doc of rejectedDocs) {
        issues.push(`${doc.document_type} rejected: ${doc.rejection_reason || 'no reason given'}`);
      }
    }

    return { compliant: issues.length === 0, issues };
  }

  /**
   * Get all drivers with expiring documents within N days for a tenant.
   * Used by admin dashboard for proactive compliance management.
   */
  async getExpiringDocuments(
    tenantId: string,
    daysAhead: number = 30,
  ): Promise<any[]> {
    const supabase = this.supabaseService.getClient();
    const cutoffDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data, error } = await supabase
      .from('compliance_documents')
      .select('id, driver_profile_id, driver_identity_id, document_type, document_name, expiry_date, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'approved')
      .not('expiry_date', 'is', null)
      .lte('expiry_date', cutoffDate)
      .order('expiry_date', { ascending: true });

    if (error) throw new BadRequestException('Failed to fetch expiring documents');
    return data || [];
  }

  /**
   * Get compliance summary for all drivers in a tenant.
   */
  async getTenantComplianceSummary(tenantId: string): Promise<{
    totalDrivers: number;
    compliantDrivers: number;
    nonCompliantDrivers: number;
    pendingReview: number;
    expiringIn30Days: number;
  }> {
    const supabase = this.supabaseService.getClient();

    // Get all active driver profiles for this tenant
    const { data: profiles } = await supabase
      .from('driver_profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    const totalDrivers = profiles?.length || 0;

    // Count documents by status
    const { data: docs } = await supabase
      .from('compliance_documents')
      .select('driver_profile_id, status, expiry_date')
      .eq('tenant_id', tenantId);

    const pendingReview = (docs || []).filter((d: any) => d.status === 'pending_review').length;

    const cutoff30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const expiringIn30Days = (docs || []).filter(
      (d: any) => d.status === 'approved' && d.expiry_date && d.expiry_date <= cutoff30 && d.expiry_date >= today,
    ).length;

    // Determine compliant vs non-compliant
    const driversWithIssues = new Set<string>();
    for (const doc of docs || []) {
      if (doc.status === 'expired' || doc.status === 'rejected') {
        driversWithIssues.add(doc.driver_profile_id);
      }
      if (doc.status === 'approved' && doc.expiry_date && doc.expiry_date < today) {
        driversWithIssues.add(doc.driver_profile_id);
      }
    }

    return {
      totalDrivers,
      compliantDrivers: totalDrivers - driversWithIssues.size,
      nonCompliantDrivers: driversWithIssues.size,
      pendingReview,
      expiringIn30Days,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // CANONICAL §3.7: D-14 and D-1 compliance expiry notifications
  // ═══════════════════════════════════════════════════════════════

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleExpiryNotifications() {
    this.logger.log('Running D-14/D-1 compliance expiry notification scan...');
    const supabase = this.supabaseService.getClient();

    const now = new Date();
    const d14 = new Date(now);
    d14.setDate(d14.getDate() + 14);
    const d1 = new Date(now);
    d1.setDate(d1.getDate() + 1);

    const d14Date = d14.toISOString().split('T')[0];
    const d1Date = d1.toISOString().split('T')[0];
    const todayDate = now.toISOString().split('T')[0];

    // Find documents expiring in exactly 14 days
    const { data: d14Docs } = await supabase
      .from('compliance_documents')
      .select('*, driver_profiles(driver_identity_id)')
      .eq('status', 'approved')
      .eq('expiry_date', d14Date);

    // Find documents expiring in exactly 1 day
    const { data: d1Docs } = await supabase
      .from('compliance_documents')
      .select('*, driver_profiles(driver_identity_id)')
      .eq('status', 'approved')
      .eq('expiry_date', d1Date);

    let notified = 0;

    for (const doc of (d14Docs || [])) {
      await this.sendExpiryNotification(doc, 14);
      notified++;
    }

    for (const doc of (d1Docs || [])) {
      await this.sendExpiryNotification(doc, 1);
      notified++;
    }

    // Auto-expire documents past expiry date
    const { data: expired } = await supabase
      .from('compliance_documents')
      .update({ status: 'expired' })
      .eq('status', 'approved')
      .lt('expiry_date', todayDate)
      .select('id');

    const expiredCount = expired?.length || 0;
    this.logger.log(`Compliance expiry scan complete: ${notified} notifications sent, ${expiredCount} documents auto-expired`);
  }

  private async sendExpiryNotification(doc: any, daysRemaining: number) {
    const supabase = this.supabaseService.getClient();

    const urgency = daysRemaining <= 1 ? 'URGENT' : 'WARNING';
    const message = `${urgency}: Your ${doc.document_type} (${doc.document_name}) expires in ${daysRemaining} day(s) on ${doc.expiry_date}. Please upload a renewed document to remain eligible for dispatch.`;

    // Log the notification
    try {
      const { error } = await supabase.from('notifications').insert({
        tenant_id: doc.tenant_id,
        user_id: doc.driver_profile_id,
        type: 'compliance_expiry',
        title: `${urgency}: Document Expiring in ${daysRemaining} Day(s)`,
        body: message,
        metadata: {
          document_id: doc.id,
          document_type: doc.document_type,
          expiry_date: doc.expiry_date,
          days_remaining: daysRemaining,
        },
      });
      if (error) throw error;
      this.logger.debug(`Expiry notification sent: doc=${doc.id} driver=${doc.driver_profile_id} days=${daysRemaining}`);
    } catch (err: any) {
      this.logger.warn(`Failed to send expiry notification for doc ${doc.id}: ${err.message}`);
    }
  }

  private mapDocument(d: any): ComplianceDocument {
    return {
      id: d.id,
      tenantId: d.tenant_id,
      driverIdentityId: d.driver_identity_id,
      driverProfileId: d.driver_profile_id,
      documentType: d.document_type,
      documentName: d.document_name,
      fileUrl: d.file_url,
      status: d.status,
      issuedDate: d.issued_date,
      expiryDate: d.expiry_date,
      reviewedBy: d.reviewed_by,
      reviewedAt: d.reviewed_at,
      rejectionReason: d.rejection_reason,
      createdAt: d.created_at,
    };
  }
}
