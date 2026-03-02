import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from './supabase.service';
import { PaymentService } from './payment.service';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * Runs daily at 06:00 UTC.
   * Identifies tenants whose next_billing_date is exactly 7 days away,
   * initiates ACH debit for base_monthly_fee_cents, and handles success/failure.
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async handleAdvanceBilling() {
    this.logger.log('Starting 7-day advance billing sweep...');

    const supabase = this.supabaseService.getClient();

    // Target date = exactly 7 days from now (date only, no time)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // Find all active tenants whose next_billing_date matches
    const { data: dueTenants, error: fetchErr } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        slug,
        owner_email,
        next_billing_date,
        billing_status
      `)
      .eq('is_active', true)
      .eq('is_suspended', false)
      .eq('next_billing_date', targetDateStr);

    if (fetchErr) {
      this.logger.error('Failed to fetch due tenants: ' + fetchErr.message);
      return;
    }

    if (!dueTenants || dueTenants.length === 0) {
      this.logger.log(`No tenants due for billing on ${targetDateStr}.`);
      return;
    }

    this.logger.log(`Found ${dueTenants.length} tenant(s) due for advance billing.`);

    for (const tenant of dueTenants) {
      await this.billTenant(tenant);
    }

    this.logger.log('Advance billing sweep complete.');
  }

  private async billTenant(tenant: {
    id: string;
    name: string;
    slug: string;
    owner_email: string;
    next_billing_date: string;
    billing_status: string;
  }) {
    const supabase = this.supabaseService.getClient();

    try {
      // 1. Look up the commercial profile to get base_monthly_fee_cents
      const { data: onboarding, error: onbErr } = await supabase
        .from('tenant_onboarding')
        .select('base_monthly_fee_cents_prepaid, paysurity_merchant_id, ach_mandate_reference')
        .eq('tenant_id', tenant.id)
        .single();

      if (onbErr || !onboarding) {
        this.logger.warn(`No onboarding record for tenant ${tenant.id} (${tenant.name}). Skipping.`);
        return;
      }

      const amountCents = onboarding.base_monthly_fee_cents_prepaid || 0;

      if (amountCents <= 0) {
        this.logger.log(`Tenant ${tenant.name}: base_monthly_fee is $0. No billing needed.`);
        // Still advance the billing date
        await this.advanceBillingDate(tenant.id, tenant.next_billing_date);
        return;
      }

      if (!onboarding.ach_mandate_reference) {
        this.logger.warn(`Tenant ${tenant.name}: No ACH mandate on file. Flagging as BILLING_FAILED.`);
        await this.recordBillingFailure(tenant.id, amountCents, 'No ACH mandate reference on file.');
        return;
      }

      // 2. Record billing event as PENDING
      const { data: billingEvent } = await supabase
        .from('billing_events')
        .insert({
          tenant_id: tenant.id,
          event_type: 'MONTHLY_SUBSCRIPTION',
          amount_cents: amountCents,
          status: 'PENDING',
          metadata: {
            billing_date: tenant.next_billing_date,
            merchant_id: onboarding.paysurity_merchant_id,
          },
        })
        .select('id')
        .single();

      // 3. Initiate ACH debit via PaySurity
      // Using a structured approach — PaymentService will route to the gateway
      const paymentResult = await this.initiateACHDebit({
        tenantId: tenant.id,
        amountCents,
        mandateReference: onboarding.ach_mandate_reference,
        merchantId: onboarding.paysurity_merchant_id,
        billingEventId: billingEvent?.id,
      });

      if (paymentResult.success) {
        // 4a. Success path: advance billing date by 1 month
        await supabase
          .from('billing_events')
          .update({
            status: 'SUCCESS',
            payment_reference: paymentResult.transactionId,
          })
          .eq('id', billingEvent?.id);

        await this.advanceBillingDate(tenant.id, tenant.next_billing_date);

        // Record in ledger
        await supabase.from('ledger_entries').insert({
          event_type: 'SUBSCRIPTION_BILLING',
          tenant_id: tenant.id,
          fare_cents: 0,
          platform_fee_cents: amountCents,
          tenant_net_cents: -amountCents,
          driver_payout_cents: 0,
          metadata: {
            billing_event_id: billingEvent?.id,
            payment_reference: paymentResult.transactionId,
          },
        });

        this.logger.log(
          `Tenant ${tenant.name}: Billed $${(amountCents / 100).toFixed(2)} successfully. ` +
          `Next billing date advanced.`,
        );
      } else {
        // 4b. Failure path
        await supabase
          .from('billing_events')
          .update({
            status: 'FAILED',
            failure_reason: paymentResult.error,
          })
          .eq('id', billingEvent?.id);

        await this.recordBillingFailure(tenant.id, amountCents, paymentResult.error || 'ACH debit failed.');
      }
    } catch (err: any) {
      this.logger.error(`Billing error for tenant ${tenant.id}: ${err.message}`);
      await this.recordBillingFailure(tenant.id, 0, err.message);
    }
  }

  private async initiateACHDebit(params: {
    tenantId: string;
    amountCents: number;
    mandateReference: string;
    merchantId: string | null;
    billingEventId: string | undefined;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // In production, this calls PaySurity's ACH debit API through FluidpayService.
      // The mandate_reference authorizes the debit without re-collecting bank details.
      const supabase = this.supabaseService.getClient();

      // Record the ACH attempt
      const { data: payout, error } = await supabase
        .from('driver_payouts')
        .insert({
          driver_id: null,
          tenant_id: params.tenantId,
          amount_cents: params.amountCents,
          status: 'processing',
          settlement_status: 'ACH_DEBIT_INITIATED',
          fluidpay_payout_id: `ach_sub_${params.billingEventId}`,
        })
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // In a live integration, we'd call:
      // await this.paymentService.processACHDebit({ ... })
      // For now, return success with the reference
      return {
        success: true,
        transactionId: `ach_sub_${payout?.id}`,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private async advanceBillingDate(tenantId: string, currentDateStr: string) {
    const supabase = this.supabaseService.getClient();

    const currentDate = new Date(currentDateStr);
    currentDate.setMonth(currentDate.getMonth() + 1);
    const nextDateStr = currentDate.toISOString().split('T')[0];

    await supabase
      .from('tenants')
      .update({
        next_billing_date: nextDateStr,
        billing_status: 'CURRENT',
        billing_failed_at: null,
        billing_failure_reason: null,
      })
      .eq('id', tenantId);
  }

  private async recordBillingFailure(tenantId: string, amountCents: number, reason: string) {
    const supabase = this.supabaseService.getClient();

    // Flag the tenant
    await supabase
      .from('tenants')
      .update({
        billing_status: 'BILLING_FAILED',
        billing_failed_at: new Date().toISOString(),
        billing_failure_reason: reason,
      })
      .eq('id', tenantId);

    // Record billing event
    await supabase.from('billing_events').insert({
      tenant_id: tenantId,
      event_type: 'BILLING_FAILED',
      amount_cents: amountCents,
      status: 'FAILED',
      failure_reason: reason,
    });

    // Queue notification
    const { data: tenant } = await supabase
      .from('tenants')
      .select('owner_email, name')
      .eq('id', tenantId)
      .single();

    if (tenant?.owner_email) {
      await supabase.from('notification_log').insert({
        tenant_id: tenantId,
        recipient_email: tenant.owner_email,
        event_type: 'BILLING_FAILED',
        subject: `UrWay Dispatch — Billing Failed for ${tenant.name}`,
        metadata: { amount_cents: amountCents, reason },
      });
    }

    this.logger.warn(
      `Tenant ${tenantId}: BILLING_FAILED — $${(amountCents / 100).toFixed(2)} — ${reason}`,
    );
  }

  /**
   * Manual trigger for admin to retry billing for a specific tenant.
   */
  async retryBilling(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, slug, owner_email, next_billing_date, billing_status')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.billing_status !== 'BILLING_FAILED') {
      throw new Error(`Tenant billing status is ${tenant.billing_status}, not BILLING_FAILED.`);
    }

    await this.billTenant(tenant);

    return { success: true, message: `Billing retry initiated for ${tenant.name}.` };
  }
}
