import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from './supabase.service';
import * as crypto from 'crypto';

/**
 * M12.3: Final Legal & Compliance Hardening — ConsentService
 *
 * - Tenant-Specific Terms: When a driver joins a tenant, they must
 *   cryptographically sign that tenant's "Service Agreement" stored
 *   in the DocumentVault.
 * - Data Privacy: Automate PII masking for any trip older than 2 years
 *   to maintain clean data hygiene.
 * - US State-specific compliance (California vs. New York).
 */

export interface ConsentRecord {
  id: string;
  tenantId: string;
  driverIdentityId: string;
  driverProfileId: string;
  documentType: string;
  documentVersion: string;
  documentHash: string;
  signatureHash: string;
  signedAt: string;
  expiresAt?: string;
  revokedAt?: string;
}

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Record a driver's cryptographic signature on a tenant's service agreement.
   * The signature_hash is SHA256(identity_id + document_hash + signed_at).
   */
  async signAgreement(params: {
    tenantId: string;
    driverIdentityId: string;
    driverProfileId: string;
    documentType: string;
    documentVersion: string;
    documentContent: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt?: string;
  }): Promise<ConsentRecord> {
    const supabase = this.supabaseService.getClient();

    const signedAt = new Date().toISOString();

    // Hash the document content for integrity verification
    const documentHash = crypto
      .createHash('sha256')
      .update(params.documentContent)
      .digest('hex');

    // Create cryptographic signature: SHA256(identity_id + document_hash + signed_at)
    const signatureHash = crypto
      .createHash('sha256')
      .update(`${params.driverIdentityId}:${documentHash}:${signedAt}`)
      .digest('hex');

    // Check if there's already an active consent of this type
    const { data: existing } = await supabase
      .from('consent_records')
      .select('id, document_version')
      .eq('tenant_id', params.tenantId)
      .eq('driver_identity_id', params.driverIdentityId)
      .eq('document_type', params.documentType)
      .is('revoked_at', null)
      .single();

    // If existing consent is for an older version, revoke it
    if (existing && existing.document_version !== params.documentVersion) {
      await supabase
        .from('consent_records')
        .update({
          revoked_at: new Date().toISOString(),
          revocation_reason: `Superseded by version ${params.documentVersion}`,
        })
        .eq('id', existing.id);
    } else if (existing && existing.document_version === params.documentVersion) {
      // Already signed this exact version — return existing
      const { data: full } = await supabase
        .from('consent_records')
        .select('*')
        .eq('id', existing.id)
        .single();
      return this.mapConsent(full);
    }

    const { data, error } = await supabase
      .from('consent_records')
      .insert({
        tenant_id: params.tenantId,
        driver_identity_id: params.driverIdentityId,
        driver_profile_id: params.driverProfileId,
        document_type: params.documentType,
        document_version: params.documentVersion,
        document_hash: documentHash,
        signature_hash: signatureHash,
        ip_address: params.ipAddress,
        user_agent: params.userAgent,
        signed_at: signedAt,
        expires_at: params.expiresAt,
      })
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException('Failed to record consent: ' + error.message);
    }

    this.logger.log(
      `M12.3: Driver ${params.driverIdentityId} signed ${params.documentType} v${params.documentVersion} for tenant ${params.tenantId}`,
    );

    return this.mapConsent(data);
  }

  /**
   * Verify that a driver has signed all required agreements for a tenant.
   * Returns the list of missing/expired agreements.
   */
  async verifyDriverConsent(
    tenantId: string,
    driverIdentityId: string,
    requiredDocuments: Array<{ type: string; minVersion: string }>,
  ): Promise<{
    compliant: boolean;
    signed: ConsentRecord[];
    missing: string[];
    expired: string[];
  }> {
    const supabase = this.supabaseService.getClient();

    const { data: consents } = await supabase
      .from('consent_records')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('driver_identity_id', driverIdentityId)
      .is('revoked_at', null);

    const signed: ConsentRecord[] = (consents || []).map((c: any) => this.mapConsent(c));
    const missing: string[] = [];
    const expired: string[] = [];

    for (const req of requiredDocuments) {
      const match = signed.find(
        (c) => c.documentType === req.type && c.documentVersion >= req.minVersion,
      );

      if (!match) {
        missing.push(req.type);
      } else if (match.expiresAt && new Date(match.expiresAt) < new Date()) {
        expired.push(req.type);
      }
    }

    return {
      compliant: missing.length === 0 && expired.length === 0,
      signed,
      missing,
      expired,
    };
  }

  /**
   * Revoke a consent record.
   */
  async revokeConsent(
    consentId: string,
    reason: string,
  ): Promise<ConsentRecord> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('consent_records')
      .update({
        revoked_at: new Date().toISOString(),
        revocation_reason: reason,
      })
      .eq('id', consentId)
      .is('revoked_at', null)
      .select('*')
      .single();

    if (error || !data) {
      throw new NotFoundException('Consent record not found or already revoked');
    }

    this.logger.log(`M12.3: Consent ${consentId} revoked: ${reason}`);
    return this.mapConsent(data);
  }

  /**
   * Get all consent records for a driver within a tenant.
   */
  async getDriverConsents(
    tenantId: string,
    driverIdentityId: string,
  ): Promise<ConsentRecord[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('consent_records')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('driver_identity_id', driverIdentityId)
      .order('signed_at', { ascending: false });

    if (error) throw new BadRequestException('Failed to fetch consent records');
    return (data || []).map((c: any) => this.mapConsent(c));
  }

  /**
   * Verify the integrity of a signature.
   * Recalculates SHA256(identity_id + document_hash + signed_at) and compares.
   */
  async verifySignature(consentId: string): Promise<{
    valid: boolean;
    consentId: string;
    expectedHash: string;
    actualHash: string;
  }> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('consent_records')
      .select('*')
      .eq('id', consentId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Consent record not found');
    }

    const expectedHash = crypto
      .createHash('sha256')
      .update(`${data.driver_identity_id}:${data.document_hash}:${data.signed_at}`)
      .digest('hex');

    return {
      valid: expectedHash === data.signature_hash,
      consentId: data.id,
      expectedHash,
      actualHash: data.signature_hash,
    };
  }

  // ── PII Auto-Masking (M12.3) ────────────────────────────────────────────

  /**
   * Cron: Run daily at 3:00 AM to mask PII on trips older than 2 years.
   * Uses the PostGIS mask_old_trip_pii() function when available,
   * otherwise executes direct queries.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async maskOldTripPii(): Promise<{ tripsProcessed: number; offersProcessed: number }> {
    const supabase = this.supabaseService.getClient();
    let tripsProcessed = 0;
    let offersProcessed = 0;

    try {
      // Try RPC first
      const { error: rpcError } = await supabase.rpc('mask_old_trip_pii');

      if (!rpcError) {
        this.logger.log('M12.3: PII masking completed via RPC');
        return { tripsProcessed: -1, offersProcessed: -1 }; // RPC doesn't return counts
      }
    } catch {
      // RPC unavailable, fall through to manual
    }

    // Fallback: manual masking
    const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString();

    // Mask trips
    const { data: oldTrips } = await supabase
      .from('trips')
      .select('id')
      .eq('status', 'completed')
      .lt('completed_at', twoYearsAgo)
      .neq('pickup_address', '*** MASKED ***')
      .limit(500);

    if (oldTrips && oldTrips.length > 0) {
      const ids = oldTrips.map((t: any) => t.id);
      await supabase
        .from('trips')
        .update({
          pickup_address: '*** MASKED ***',
          dropoff_address: '*** MASKED ***',
          special_instructions: null,
        })
        .in('id', ids);

      tripsProcessed = ids.length;
    }

    // Mask ride_offers
    const { data: oldOffers } = await supabase
      .from('ride_offers')
      .select('id')
      .lt('created_at', twoYearsAgo)
      .neq('rider_name', '*** MASKED ***')
      .limit(500);

    if (oldOffers && oldOffers.length > 0) {
      const ids = oldOffers.map((o: any) => o.id);
      await supabase
        .from('ride_offers')
        .update({
          rider_name: '*** MASKED ***',
          rider_phone: '*** MASKED ***',
          pickup_address: '*** MASKED ***',
          dropoff_address: '*** MASKED ***',
        })
        .in('id', ids);

      offersProcessed = ids.length;
    }

    if (tripsProcessed > 0 || offersProcessed > 0) {
      this.logger.log(
        `M12.3: PII masked — ${tripsProcessed} trips, ${offersProcessed} offers (>2yr old)`,
      );
    }

    return { tripsProcessed, offersProcessed };
  }

  private mapConsent(c: any): ConsentRecord {
    return {
      id: c.id,
      tenantId: c.tenant_id,
      driverIdentityId: c.driver_identity_id,
      driverProfileId: c.driver_profile_id,
      documentType: c.document_type,
      documentVersion: c.document_version,
      documentHash: c.document_hash,
      signatureHash: c.signature_hash,
      signedAt: c.signed_at,
      expiresAt: c.expires_at,
      revokedAt: c.revoked_at,
    };
  }
}
