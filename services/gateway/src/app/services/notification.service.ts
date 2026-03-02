import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface NotificationPayload {
  tenantId: string;
  recipientEmail: string;
  eventType: string;
  subject: string;
  templateData: Record<string, any>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Dispatch a notification event. Logs to notification_log and,
   * in production, would integrate with an email provider (SendGrid, SES, etc.).
   */
  async dispatch(payload: NotificationPayload): Promise<{ id: string; status: string }> {
    const supabase = this.supabaseService.getClient();

    const body = this.renderTemplate(payload.eventType, payload.templateData);

    const { data, error } = await supabase
      .from('notification_log')
      .insert({
        tenant_id: payload.tenantId,
        recipient_email: payload.recipientEmail,
        event_type: payload.eventType,
        subject: payload.subject,
        status: 'QUEUED',
        metadata: {
          template_data: payload.templateData,
          rendered_body: body,
        },
      })
      .select('id')
      .single();

    if (error) {
      this.logger.error(`Failed to queue notification: ${error.message}`);
      throw error;
    }

    // In production: call email API here, then update status to SENT
    // For now, mark as SENT since we've logged it
    await supabase
      .from('notification_log')
      .update({ status: 'SENT', sent_at: new Date().toISOString() })
      .eq('id', data.id);

    this.logger.log(`Notification [${payload.eventType}] sent to ${payload.recipientEmail}`);
    return { id: data.id, status: 'SENT' };
  }

  /**
   * Fire the TENANT_ACTIVATED welcome email.
   */
  async sendTenantWelcomeEmail(tenantId: string): Promise<{ id: string; status: string }> {
    const supabase = this.supabaseService.getClient();

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, slug, owner_email, owner_name')
      .eq('id', tenantId)
      .single();

    if (!tenant || !tenant.owner_email) {
      this.logger.warn(`Cannot send welcome email: tenant ${tenantId} missing owner_email.`);
      return { id: '', status: 'SKIPPED' };
    }

    const { data: onboarding } = await supabase
      .from('tenant_onboarding')
      .select('base_monthly_fee_cents_prepaid, revenue_share_bps, per_ride_fee_cents')
      .eq('tenant_id', tenantId)
      .single();

    return this.dispatch({
      tenantId,
      recipientEmail: tenant.owner_email,
      eventType: 'TENANT_ACTIVATED',
      subject: 'Welcome to UrWay Dispatch – Your Platform is Ready!',
      templateData: {
        owner_name: tenant.owner_name || 'Valued Partner',
        tenant_name: tenant.name,
        tenant_slug: tenant.slug,
        dashboard_url: `https://${tenant.slug}.urwaydispatch.com/admin`,
        base_monthly_fee_dollars: onboarding
          ? ((onboarding.base_monthly_fee_cents_prepaid || 0) / 100).toFixed(2)
          : '0.00',
        revenue_share_pct: onboarding
          ? ((onboarding.revenue_share_bps || 0) / 100).toFixed(1)
          : '0.0',
        per_ride_fee_dollars: onboarding
          ? ((onboarding.per_ride_fee_cents || 0) / 100).toFixed(2)
          : '0.00',
      },
    });
  }

  /**
   * Fire a BILLING_FAILED notification.
   */
  async sendBillingFailedEmail(tenantId: string, amountCents: number, reason: string) {
    const supabase = this.supabaseService.getClient();

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name, owner_email, owner_name')
      .eq('id', tenantId)
      .single();

    if (!tenant?.owner_email) return;

    return this.dispatch({
      tenantId,
      recipientEmail: tenant.owner_email,
      eventType: 'BILLING_FAILED',
      subject: `UrWay Dispatch — Billing Failed for ${tenant.name}`,
      templateData: {
        owner_name: tenant.owner_name || 'Valued Partner',
        tenant_name: tenant.name,
        amount_dollars: (amountCents / 100).toFixed(2),
        failure_reason: reason,
        support_email: 'billing@urwaydispatch.com',
      },
    });
  }

  private renderTemplate(eventType: string, data: Record<string, any>): string {
    switch (eventType) {
      case 'TENANT_ACTIVATED':
        return this.renderWelcomeEmail(data);
      case 'BILLING_FAILED':
        return this.renderBillingFailedEmail(data);
      default:
        return JSON.stringify(data);
    }
  }

  private renderWelcomeEmail(d: Record<string, any>): string {
    return `Hello ${d.owner_name},

Welcome to the future of independent dispatching. Your urwaydispatch.com environment for ${d.tenant_name} is officially active.

Your Onboarding Journey:

1. Access Your Dashboard: Log in at ${d.dashboard_url} using your registered email.

2. Configure Your Fleet: Add your drivers and set your local zone pricing.

3. App Branding: Your custom colors and logos are currently being propagated to your driver and rider app instances.

4. Billing: As per your selected Tier, your first base monthly fee will be debited via ACH 7 days prior to your next cycle.

Support & Guide:

- Non-Blocking Drivers: Remember, your drivers can work for other tenants on the UrWay platform simultaneously. Their earnings and data with you remain strictly siloed and private.

- Settlement: All ride payouts are processed only after bank settlement (BANK_SETTLED) to ensure financial security for your fleet.

We are excited to help you scale.

The UrWay Dispatch Team`;
  }

  private renderBillingFailedEmail(d: Record<string, any>): string {
    return `Hello ${d.owner_name},

We were unable to process the scheduled billing of $${d.amount_dollars} for ${d.tenant_name}.

Reason: ${d.failure_reason}

Please update your ACH authorization or contact us at ${d.support_email} to resolve this issue promptly.

The UrWay Dispatch Team`;
  }
}
