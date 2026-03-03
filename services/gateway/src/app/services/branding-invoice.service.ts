import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';

/**
 * Phase 7.0 V.2: Branding Customization Fees & Automated Invoicing
 *
 * Fee Schedule:
 *   - Custom CSS unlock:    One-time $5,000 + Monthly $2,500 surcharge
 *   - Custom assets unlock: One-time $5,000 + Monthly $2,500 surcharge
 *   - Both (bundle):        One-time $8,000 + Monthly $4,000 surcharge
 *
 * Workflow:
 *   1. Tenant submits branding change request
 *   2. System creates sandbox preview
 *   3. Super-Admin reviews & approves/rejects
 *   4. On approval: BillingService generates invoice, emails PDF receipt
 *   5. Branding is activated after payment confirmation
 */

export interface BrandingRequest {
  tenantId: string;
  requestedBy: string;
  changeType: 'custom_css' | 'custom_assets' | 'both';
  cssOverrides?: Record<string, string>;
  assetUrls?: {
    logoSvg?: string;
    appIcon?: string;
    splashScreen?: string;
    emailHeader?: string;
  };
  notes?: string;
}

export interface BrandingInvoice {
  id: string;
  tenantId: string;
  oneTimeFeeCents: number;
  monthlySurchargeCents: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
}

const FEE_SCHEDULE = {
  custom_css:    { oneTime: 500000, monthly: 250000, label: 'Custom CSS Unlock' },
  custom_assets: { oneTime: 500000, monthly: 250000, label: 'Custom Assets Unlock' },
  both:          { oneTime: 800000, monthly: 400000, label: 'Custom CSS + Assets Bundle' },
};

@Injectable()
export class BrandingInvoiceService {
  private readonly logger = new Logger(BrandingInvoiceService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Step 1: Tenant submits a branding customization request.
   * Creates a pending branding_requests record and a preview sandbox entry.
   */
  async submitBrandingRequest(request: BrandingRequest): Promise<{ requestId: string; previewUrl: string }> {
    const supabase = this.supabaseService.getClient();
    const fees = FEE_SCHEDULE[request.changeType];

    const { data, error } = await supabase
      .from('branding_requests')
      .insert({
        tenant_id: request.tenantId,
        requested_by: request.requestedBy,
        change_type: request.changeType,
        css_overrides: request.cssOverrides || null,
        asset_urls: request.assetUrls || null,
        notes: request.notes || null,
        one_time_fee_cents: fees.oneTime,
        monthly_surcharge_cents: fees.monthly,
        status: 'pending_review',
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create branding request: ${error?.message}`);
    }

    const previewUrl = `https://sandbox.urwaydispatch.com/preview/${data.id}`;

    this.logger.log(`Branding request ${data.id} submitted for tenant ${request.tenantId} [${request.changeType}]`);

    return { requestId: data.id, previewUrl };
  }

  /**
   * Step 3: Super-Admin approves branding request.
   * Generates invoice and sends it to the tenant owner.
   */
  async approveBrandingRequest(requestId: string, approvedBy: string): Promise<BrandingInvoice> {
    const supabase = this.supabaseService.getClient();

    const { data: request, error: fetchError } = await supabase
      .from('branding_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      throw new Error(`Branding request ${requestId} not found`);
    }

    if (request.status !== 'pending_review') {
      throw new Error(`Request is in '${request.status}' state, cannot approve`);
    }

    // Update request status
    await supabase
      .from('branding_requests')
      .update({ status: 'approved', approved_by: approvedBy, approved_at: new Date().toISOString() })
      .eq('id', requestId);

    // Generate invoice
    const fees = FEE_SCHEDULE[request.change_type as keyof typeof FEE_SCHEDULE];
    const invoiceId = `INV-BRAND-${Date.now().toString(36).toUpperCase()}`;

    const { data: invoice, error: invoiceError } = await supabase
      .from('billing_events')
      .insert({
        tenant_id: request.tenant_id,
        event_type: 'BRANDING_INVOICE',
        amount_cents: fees.oneTime,
        metadata: {
          invoice_id: invoiceId,
          branding_request_id: requestId,
          change_type: request.change_type,
          one_time_fee_cents: fees.oneTime,
          monthly_surcharge_cents: fees.monthly,
          description: fees.label,
          approved_by: approvedBy,
        },
      })
      .select('id')
      .single();

    if (invoiceError) {
      this.logger.error(`Invoice generation failed: ${invoiceError.message}`);
    }

    // Send invoice email to tenant owner
    try {
      const branding = await this.notificationService.getTenantBranding(request.tenant_id);
      const { data: tenant } = await supabase
        .from('tenants')
        .select('owner_email')
        .eq('id', request.tenant_id)
        .single();

      if (tenant?.owner_email && this.emailService) {
        await this.emailService.sendInvoice(
          request.tenant_id,
          tenant.owner_email,
          branding,
          {
            invoiceId,
            amountDollars: (fees.oneTime / 100).toFixed(2),
            description: `${fees.label} — One-time setup fee. Monthly surcharge of $${(fees.monthly / 100).toFixed(2)} will be added to your billing cycle.`,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          },
        );
      }
    } catch (err: any) {
      this.logger.error(`Invoice email failed: ${err.message}`);
    }

    this.logger.log(`Branding request ${requestId} approved. Invoice ${invoiceId} generated.`);

    return {
      id: invoiceId,
      tenantId: request.tenant_id,
      oneTimeFeeCents: fees.oneTime,
      monthlySurchargeCents: fees.monthly,
      description: fees.label,
      status: 'approved',
    };
  }

  /**
   * Super-Admin rejects branding request.
   */
  async rejectBrandingRequest(requestId: string, rejectedBy: string, reason: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    await supabase
      .from('branding_requests')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: rejectedBy,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    this.logger.log(`Branding request ${requestId} rejected: ${reason}`);
  }

  /**
   * After payment is confirmed, activate the branding changes.
   */
  async activateBranding(requestId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { data: request } = await supabase
      .from('branding_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!request) throw new Error('Request not found');

    // Apply CSS overrides to tenant_onboarding
    const updates: Record<string, any> = {};
    if (request.css_overrides) {
      updates.custom_css_json = request.css_overrides;
    }
    if (request.asset_urls?.logoSvg) {
      updates.logo_svg_url = request.asset_urls.logoSvg;
    }
    if (request.asset_urls?.appIcon) {
      updates.app_icon_url = request.asset_urls.appIcon;
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('tenant_onboarding')
        .update(updates)
        .eq('tenant_id', request.tenant_id);
    }

    // Mark request as activated
    await supabase
      .from('branding_requests')
      .update({ status: 'activated', activated_at: new Date().toISOString() })
      .eq('id', requestId);

    this.logger.log(`Branding activated for tenant ${request.tenant_id}`);
  }
}
