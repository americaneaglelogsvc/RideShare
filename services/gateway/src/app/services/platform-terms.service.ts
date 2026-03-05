import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * PlatformTermsService — CANONICAL OB-LEGAL-001 / OB-LEGAL-002 / SAAS-001
 *
 * UWD is a SaaS platform provider only. Tenants who subscribe are the
 * rideshare/transportation operators and bear FULL responsibility for:
 *   - Obtaining and renewing TNC/rideshare licenses in their jurisdiction
 *   - Driver background checks per local law
 *   - Vehicle insurance compliance
 *   - Any regulatory filings applicable to their area of operation
 *
 * This service records the timestamped, IP-audited acceptance of those terms
 * at tenant onboarding. Access to the platform is blocked until accepted.
 */

export const CURRENT_TERMS_VERSION = 'v1.0.0';

export const PLATFORM_TERMS_TEXT = `
URWAYDISPATCH.COM — SAAS PLATFORM TERMS OF SERVICE (${CURRENT_TERMS_VERSION})

1. SOFTWARE-ONLY PROVIDER
   UrWayDispatch.com ("UWD") provides software-as-a-service technology only.
   UWD is not a rideshare company, transportation network company (TNC),
   or transportation service provider of any kind.

2. SUBSCRIBER IS THE OPERATOR
   Subscriber ("Tenant"), by accepting these terms, acknowledges and agrees that:
   (a) Subscriber is the rideshare/transportation operator, not UWD;
   (b) Subscriber is solely responsible for obtaining, maintaining, and renewing
       all permits, licenses, and regulatory approvals required by applicable
       local, state, federal, or international law for its transportation operations;
   (c) UWD has no obligation to track, alert, enforce, or assist with any
       jurisdiction's TNC, rideshare, or transportation licensing on Subscriber's behalf;
   (d) UWD bears no liability arising from Subscriber's failure to comply with
       any applicable transportation, employment, insurance, or safety regulation.

3. DRIVER COMPLIANCE
   Subscriber is solely responsible for ensuring all drivers operating under
   Subscriber's platform instance hold valid licenses, insurance, and
   background clearances as required by applicable law.

4. IN-APP COMMUNICATION
   All rider↔driver communications facilitated by UWD's platform are
   in-app only. UWD does not send SMS or other external communications
   for operational ride events on behalf of Subscriber's riders or drivers.
   Subscriber bears responsibility for any supplemental communication
   channels it elects to operate independently.

5. DATA RESPONSIBILITY
   Subscriber is the data controller for rider and driver personal data
   collected through its platform instance. UWD acts as data processor.
   Subscriber must maintain its own privacy policy and consent framework.

6. LIMITATION OF LIABILITY
   UWD's total liability to Subscriber shall not exceed the SaaS subscription
   fees paid by Subscriber in the preceding twelve (12) months.

By clicking "I Accept" or by using the platform, Subscriber accepts these terms
in full on behalf of its organization.
`.trim();

export interface TermsAcceptanceRecord {
  id: string;
  tenantId: string;
  acceptedBy: string;
  termsVersion: string;
  ipAddress: string | null;
  userAgent: string | null;
  acceptedAt: string;
}

@Injectable()
export class PlatformTermsService {
  private readonly logger = new Logger(PlatformTermsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  getLatestTermsVersion(): string {
    return CURRENT_TERMS_VERSION;
  }

  getTermsText(): string {
    return PLATFORM_TERMS_TEXT;
  }

  async hasAccepted(tenantId: string, version = CURRENT_TERMS_VERSION): Promise<boolean> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('platform_terms_acceptances')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('terms_version', version)
      .maybeSingle();

    if (error) {
      this.logger.error(`Terms check failed for tenant ${tenantId}: ${error.message}`);
      return false;
    }

    return !!data;
  }

  async recordAcceptance(
    tenantId: string,
    acceptedBy: string,
    ipAddress: string | null,
    userAgent: string | null,
    version = CURRENT_TERMS_VERSION,
  ): Promise<TermsAcceptanceRecord> {
    const supabase = this.supabaseService.getClient();

    const alreadyAccepted = await this.hasAccepted(tenantId, version);
    if (alreadyAccepted) {
      this.logger.log(`Terms ${version} already accepted by tenant ${tenantId}`);
      const { data } = await supabase
        .from('platform_terms_acceptances')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('terms_version', version)
        .single();
      return this.mapRecord(data);
    }

    const { data, error } = await supabase
      .from('platform_terms_acceptances')
      .insert({
        tenant_id: tenantId,
        accepted_by: acceptedBy,
        terms_version: version,
        ip_address: ipAddress,
        user_agent: userAgent,
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Terms acceptance failed for tenant ${tenantId}: ${error.message}`);
      throw new BadRequestException(`Could not record terms acceptance: ${error.message}`);
    }

    this.logger.log(
      `Platform terms ${version} accepted: tenant=${tenantId} by=${acceptedBy} ip=${ipAddress}`,
    );

    return this.mapRecord(data);
  }

  async getAcceptanceAudit(tenantId: string): Promise<TermsAcceptanceRecord[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('platform_terms_acceptances')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('accepted_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return (data || []).map(r => this.mapRecord(r));
  }

  async enforceAccepted(tenantId: string): Promise<void> {
    const accepted = await this.hasAccepted(tenantId);
    if (!accepted) {
      throw new ForbiddenException({
        error_code: 'TERMS_NOT_ACCEPTED',
        message: 'Tenant must accept the UWD Platform Terms of Service before accessing the platform.',
        action: 'POST /onboarding/terms/accept',
      });
    }
  }

  private mapRecord(row: any): TermsAcceptanceRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      acceptedBy: row.accepted_by,
      termsVersion: row.terms_version,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      acceptedAt: row.accepted_at,
    };
  }
}
