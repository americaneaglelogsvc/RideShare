import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * ApprovalService — CANONICAL §RIDE-PAY-050 "Maker-checker approval flows"
 *
 * Sensitive operations require two-person authorization:
 *   - bulk_payout: payouts exceeding threshold
 *   - tenant_suspension: suspend a tenant's operations
 *   - driver_suspension: suspend a driver from dispatch
 *   - policy_publish: publish pricing/compliance policies
 *
 * Flow: Maker creates request → Checker approves/rejects → Action executes
 * Requests expire after 24h if not actioned.
 */

export interface ApprovalRequest {
  id: string;
  tenant_id: string;
  request_type: 'bulk_payout' | 'tenant_suspension' | 'driver_suspension' | 'policy_publish';
  requested_by: string;
  approved_by?: string;
  payload: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  expires_at: string;
  created_at: string;
  resolved_at?: string;
}

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);
  private readonly EXPIRY_HOURS = 24;

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Create a new approval request (maker step).
   */
  async createRequest(
    tenantId: string,
    requestedBy: string,
    requestType: ApprovalRequest['request_type'],
    payload: Record<string, any>,
  ): Promise<ApprovalRequest> {
    const supabase = this.supabaseService.getClient();

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.EXPIRY_HOURS);

    const { data, error } = await supabase
      .from('approval_requests')
      .insert({
        tenant_id: tenantId,
        request_type: requestType,
        requested_by: requestedBy,
        payload,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to create approval request: ${error.message}`);

    this.logger.log(`Approval request created: ${data.id} type=${requestType} by=${requestedBy}`);
    return data;
  }

  /**
   * Approve a pending request (checker step).
   * The approver must be different from the requester (maker ≠ checker).
   */
  async approve(requestId: string, approvedBy: string): Promise<ApprovalRequest> {
    const supabase = this.supabaseService.getClient();

    const { data: request } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single();

    if (!request) throw new NotFoundException('Pending approval request not found');

    // Enforce maker ≠ checker
    if (request.requested_by === approvedBy) {
      throw new ForbiddenException('Maker-checker violation: approver cannot be the same as requester');
    }

    // Check expiry
    if (new Date(request.expires_at) < new Date()) {
      await supabase
        .from('approval_requests')
        .update({ status: 'expired', resolved_at: new Date().toISOString() })
        .eq('id', requestId);
      throw new BadRequestException('Approval request has expired');
    }

    const { data, error } = await supabase
      .from('approval_requests')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to approve: ${error.message}`);

    this.logger.log(`Approval granted: ${requestId} type=${request.request_type} checker=${approvedBy}`);
    return data;
  }

  /**
   * Reject a pending request.
   */
  async reject(requestId: string, rejectedBy: string, reason?: string): Promise<ApprovalRequest> {
    const supabase = this.supabaseService.getClient();

    const { data: request } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single();

    if (!request) throw new NotFoundException('Pending approval request not found');

    const { data, error } = await supabase
      .from('approval_requests')
      .update({
        status: 'rejected',
        approved_by: rejectedBy,
        resolved_at: new Date().toISOString(),
        payload: { ...request.payload, rejection_reason: reason },
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to reject: ${error.message}`);

    this.logger.log(`Approval rejected: ${requestId} by=${rejectedBy} reason="${reason || 'none'}"`);
    return data;
  }

  /**
   * List pending approval requests for a tenant.
   */
  async listPending(tenantId: string): Promise<ApprovalRequest[]> {
    const supabase = this.supabaseService.getClient();

    // Auto-expire stale requests first
    await supabase
      .from('approval_requests')
      .update({ status: 'expired', resolved_at: new Date().toISOString() })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    const { data, error } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  /**
   * List all requests (admin view, any status).
   */
  async listAll(tenantId: string, limit = 50): Promise<ApprovalRequest[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  /**
   * Check if an action requires approval based on type and payload thresholds.
   */
  requiresApproval(requestType: string, payload: Record<string, any>): boolean {
    switch (requestType) {
      case 'bulk_payout':
        return (payload.total_amount_cents || 0) > 500000; // > $5,000
      case 'tenant_suspension':
      case 'driver_suspension':
        return true; // Always requires approval
      case 'policy_publish':
        return true; // Always requires approval
      default:
        return false;
    }
  }
}
