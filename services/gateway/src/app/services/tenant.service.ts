import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface CreateTenantRequest {
  name: string;
  slug: string;
  owner_email: string;
  owner_name: string;
}

export interface UpdateOnboardingChecklistRequest {
  ach_debit_authorization_signed_at?: string;
  paid_first_required?: boolean;
  merchant_provider_code?: string;
  merchant_account_reference?: string;
  tax_id_last4?: string;
  tax_id_document_url?: string;
  business_registration_reference?: string;
  primary_hex?: string;
  secondary_hex?: string;
  logo_svg_url?: string;
  app_icon_url?: string;
  terms_url?: string;
}

export interface SetCommercialTermsRequest {
  demo_duration_days?: number;
  intro_fee_cents?: number;
  base_monthly_fee_cents_prepaid?: number;
  per_ride_fee_cents?: number;
  per_driver_fee_cents?: number;
  revenue_share_bps?: number;
}

export interface StaffReviewDecision {
  approved: boolean;
  approved_by_user_id: string;
  rejection_reason?: string;
}

@Injectable()
export class TenantService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // ── Create tenant + bootstrap onboarding record ──────────────────
  async createTenant(request: CreateTenantRequest) {
    const supabase = this.supabaseService.getClient();

    // Validate slug uniqueness
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', request.slug)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException(`Tenant slug "${request.slug}" is already taken.`);
    }

    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        name: request.name,
        slug: request.slug,
        owner_email: request.owner_email,
        owner_name: request.owner_name,
        is_active: false,
      })
      .select()
      .single();

    if (tenantErr || !tenant) {
      throw new BadRequestException(tenantErr?.message || 'Failed to create tenant.');
    }

    // Bootstrap onboarding row in DRAFT status
    const { error: onbErr } = await supabase
      .from('tenant_onboarding')
      .insert({ tenant_id: tenant.id });

    if (onbErr) {
      console.error('Failed to create onboarding row:', onbErr);
    }

    return { tenant_id: tenant.id, slug: tenant.slug, status: 'DRAFT' };
  }

  // ── Get onboarding status ────────────────────────────────────────
  async getOnboarding(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_onboarding')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Onboarding record not found for this tenant.');
    }

    return data;
  }

  // ── Update onboarding checklist (tenant self-service) ────────────
  async updateChecklist(tenantId: string, updates: UpdateOnboardingChecklistRequest) {
    const supabase = this.supabaseService.getClient();

    // Only allow updates while DRAFT or REJECTED
    const onboarding = await this.getOnboarding(tenantId);
    if (!['DRAFT', 'REJECTED'].includes(onboarding.status)) {
      throw new ForbiddenException(
        `Cannot update checklist while status is ${onboarding.status}. Only DRAFT or REJECTED onboarding records can be edited.`
      );
    }

    // Validate tax_id_last4 format if provided
    if (updates.tax_id_last4 && !/^\d{4}$/.test(updates.tax_id_last4)) {
      throw new BadRequestException('tax_id_last4 must be exactly 4 digits.');
    }

    const { data, error } = await supabase
      .from('tenant_onboarding')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  // ── Submit for review ────────────────────────────────────────────
  async submitForReview(tenantId: string) {
    const supabase = this.supabaseService.getClient();
    const onboarding = await this.getOnboarding(tenantId);

    if (!['DRAFT', 'REJECTED'].includes(onboarding.status)) {
      throw new ForbiddenException(
        `Cannot submit from status ${onboarding.status}. Must be DRAFT or REJECTED.`
      );
    }

    // Minimum checklist validation
    const missing: string[] = [];
    if (!onboarding.merchant_provider_code) missing.push('merchant_provider_code');
    if (!onboarding.tax_id_last4) missing.push('tax_id_last4');
    if (!onboarding.business_registration_reference) missing.push('business_registration_reference');

    if (missing.length > 0) {
      throw new BadRequestException(
        `Incomplete checklist. Missing required fields: ${missing.join(', ')}`
      );
    }

    const { data, error } = await supabase
      .from('tenant_onboarding')
      .update({
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  // ── Staff: set commercial terms ──────────────────────────────────
  async setCommercialTerms(tenantId: string, terms: SetCommercialTermsRequest) {
    const supabase = this.supabaseService.getClient();
    const onboarding = await this.getOnboarding(tenantId);

    if (!['SUBMITTED', 'STAFF_REVIEW'].includes(onboarding.status)) {
      throw new ForbiddenException(
        `Cannot set commercial terms while status is ${onboarding.status}.`
      );
    }

    const { data, error } = await supabase
      .from('tenant_onboarding')
      .update({
        ...terms,
        status: 'STAFF_REVIEW',
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  // ── Staff: approve or reject ─────────────────────────────────────
  async reviewDecision(tenantId: string, decision: StaffReviewDecision) {
    const supabase = this.supabaseService.getClient();
    const onboarding = await this.getOnboarding(tenantId);

    if (!['SUBMITTED', 'STAFF_REVIEW'].includes(onboarding.status)) {
      throw new ForbiddenException(
        `Cannot review while status is ${onboarding.status}. Must be SUBMITTED or STAFF_REVIEW.`
      );
    }

    if (decision.approved) {
      const { data, error } = await supabase
        .from('tenant_onboarding')
        .update({
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
          approved_by_user_id: decision.approved_by_user_id,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw new BadRequestException(error.message);
      return data;
    } else {
      const { data, error } = await supabase
        .from('tenant_onboarding')
        .update({
          status: 'REJECTED',
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw new BadRequestException(error.message);
      return { ...data, rejection_reason: decision.rejection_reason };
    }
  }

  // ── Activate tenant ──────────────────────────────────────────────
  async activateTenant(tenantId: string) {
    const supabase = this.supabaseService.getClient();
    const onboarding = await this.getOnboarding(tenantId);

    if (onboarding.status !== 'APPROVED') {
      throw new ForbiddenException(
        `Cannot activate tenant. Onboarding status must be APPROVED, got ${onboarding.status}.`
      );
    }

    // Transition onboarding -> ACTIVE
    const { error: onbErr } = await supabase
      .from('tenant_onboarding')
      .update({
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId);

    if (onbErr) throw new BadRequestException(onbErr.message);

    // Mark tenant as active
    const { error: tenErr } = await supabase
      .from('tenants')
      .update({ is_active: true })
      .eq('id', tenantId);

    if (tenErr) throw new BadRequestException(tenErr.message);

    return { tenant_id: tenantId, status: 'ACTIVE', is_active: true };
  }

  // ── Add domain mapping ───────────────────────────────────────────
  async addDomainMapping(tenantId: string, host: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_domain_mappings')
      .insert({ tenant_id: tenantId, host })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        error.message.includes('duplicate')
          ? `Host "${host}" is already mapped to a tenant.`
          : error.message
      );
    }

    return data;
  }

  // ── List all tenants (admin) ─────────────────────────────────────
  async listTenants() {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, slug, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
