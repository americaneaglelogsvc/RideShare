import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { LedgerService } from './ledger.service';

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly ledgerService: LedgerService,
  ) {}

  // RIDE-PAYOUT-100: Get or create payout config for tenant
  async getPayoutConfig(tenantId: string) {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('payout_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    return data || { payout_mode: 'platform_triggered', schedule: 'weekly', min_balance_cents: 1000 };
  }

  async updatePayoutConfig(tenantId: string, updates: Record<string, unknown>) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('payout_configs')
      .upsert({ tenant_id: tenantId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id' })
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to update payout config: ${error.message}`);
    return data;
  }

  // RIDE-PAY-040: Get fee schedule for tenant
  async getTenantFeeSchedule(tenantId: string) {
    const supabase = this.supabaseService.getClient();
    const { data: tenant } = await supabase
      .from('tenants')
      .select('fee_schedule_id')
      .eq('id', tenantId)
      .single();

    if (tenant?.fee_schedule_id) {
      const { data: schedule } = await supabase
        .from('fee_schedules')
        .select('*')
        .eq('id', tenant.fee_schedule_id)
        .single();
      if (schedule) return schedule;
    }

    const { data: defaultSchedule } = await supabase
      .from('fee_schedules')
      .select('*')
      .eq('is_default', true)
      .single();

    return defaultSchedule;
  }

  async listFeeSchedules() {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase.from('fee_schedules').select('*').order('platform_pct', { ascending: false });
    return data || [];
  }

  // RIDE-PAYOUT-111: Preview bulk payout
  async previewBulkPayout(tenantId: string) {
    const supabase = this.supabaseService.getClient();
    const config = await this.getPayoutConfig(tenantId);

    const { data: drivers } = await supabase
      .from('driver_profiles')
      .select('id, pending_payout_cents')
      .eq('tenant_id', tenantId)
      .gte('pending_payout_cents', config.min_balance_cents || 0);

    if (!drivers || drivers.length === 0) {
      return { drivers: [], total_cents: 0, driver_count: 0 };
    }

    const feeSchedule = await this.getTenantFeeSchedule(tenantId);
    const payoutFeePct = feeSchedule?.payout_fee_pct || 0;

    const items = drivers.map((d: any) => {
      const feeCents = Math.round(d.pending_payout_cents * (payoutFeePct / 100));
      return {
        driver_id: d.id,
        amount_cents: d.pending_payout_cents,
        fee_cents: feeCents,
        net_cents: d.pending_payout_cents - feeCents,
      };
    });

    const totalCents = items.reduce((sum: number, i: any) => sum + i.net_cents, 0);

    return { drivers: items, total_cents: totalCents, driver_count: items.length };
  }

  // RIDE-PAYOUT-111: Create confirmed batch
  async createBulkPayout(tenantId: string, userId: string) {
    const supabase = this.supabaseService.getClient();
    const preview = await this.previewBulkPayout(tenantId);

    if (preview.driver_count === 0) {
      throw new BadRequestException('No drivers eligible for payout');
    }

    const { data: batch, error: batchErr } = await supabase
      .from('payout_batches')
      .insert({
        tenant_id: tenantId,
        status: 'confirmed',
        total_cents: preview.total_cents,
        driver_count: preview.driver_count,
        initiated_by: userId,
        confirmed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (batchErr) throw new BadRequestException(`Failed to create batch: ${batchErr.message}`);

    const items = preview.drivers.map((d: any) => ({
      batch_id: batch.id,
      tenant_id: tenantId,
      driver_id: d.driver_id,
      amount_cents: d.amount_cents,
      fee_cents: d.fee_cents,
      net_cents: d.net_cents,
      status: 'pending',
    }));

    await supabase.from('payout_items').insert(items);

    this.logger.log(`Bulk payout batch ${batch.id} created: ${preview.driver_count} drivers, ${preview.total_cents} cents`);
    return batch;
  }

  // RIDE-PAYOUT-112: Execute batch (process each item)
  async executeBatch(tenantId: string, batchId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: batch } = await supabase
      .from('payout_batches')
      .select('*')
      .eq('id', batchId)
      .eq('tenant_id', tenantId)
      .eq('status', 'confirmed')
      .single();

    if (!batch) throw new NotFoundException('Batch not found or not in confirmed status');

    await supabase.from('payout_batches').update({ status: 'processing' }).eq('id', batchId);

    const { data: items } = await supabase
      .from('payout_items')
      .select('*')
      .eq('batch_id', batchId)
      .eq('status', 'pending');

    let completedCount = 0;
    let failedCount = 0;

    for (const item of items || []) {
      try {
        await supabase
          .from('payout_items')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', item.id);

        await this.ledgerService.recordLedgerEvent({
          eventType: 'DRIVER_PAYOUT',
          tripId: item.id,
          tenantId,
          driverId: item.driver_id,
          fareCents: item.net_cents,
          metadata: { batch_id: batchId, fee_cents: item.fee_cents },
        });

        completedCount++;
      } catch (e: any) {
        this.logger.error(`Payout item ${item.id} failed: ${e.message}`);
        await supabase.from('payout_items').update({ status: 'failed' }).eq('id', item.id);
        failedCount++;
      }
    }

    const finalStatus = failedCount === 0 ? 'completed' : 'failed';
    await supabase.from('payout_batches').update({
      status: finalStatus,
      completed_at: new Date().toISOString(),
    }).eq('id', batchId);

    this.logger.log(`Batch ${batchId}: ${completedCount} completed, ${failedCount} failed`);
    return { batchId, completed: completedCount, failed: failedCount, status: finalStatus };
  }

  // RIDE-PAYOUT-104: Get payout status + receipt for a driver
  async getDriverPayoutHistory(tenantId: string, driverId: string, limit = 50) {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('payout_items')
      .select('*, payout_batches(status, created_at)')
      .eq('tenant_id', tenantId)
      .eq('driver_id', driverId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }

  // RIDE-PAYOUT-102: On-demand instant cash-out
  async instantCashout(tenantId: string, driverId: string) {
    const supabase = this.supabaseService.getClient();
    const config = await this.getPayoutConfig(tenantId);

    if (!config.instant_enabled) {
      throw new BadRequestException('Instant cash-out is not enabled for this tenant');
    }

    const { data: driver } = await supabase
      .from('driver_profiles')
      .select('pending_payout_cents')
      .eq('tenant_id', tenantId)
      .eq('id', driverId)
      .single();

    if (!driver || driver.pending_payout_cents < (config.min_balance_cents || 1000)) {
      throw new BadRequestException('Insufficient balance for instant cash-out');
    }

    const feeCents = config.instant_fee_cents || 150;
    const netCents = driver.pending_payout_cents - feeCents;

    await this.ledgerService.recordLedgerEvent({
      eventType: 'DRIVER_PAYOUT',
      tripId: `instant-${driverId}-${Date.now()}`,
      tenantId,
      driverId,
      fareCents: netCents,
      metadata: { type: 'instant_cashout', fee_cents: feeCents },
    });

    this.logger.log(`Instant cashout: driver ${driverId}, net ${netCents} cents`);
    return { success: true, net_cents: netCents, fee_cents: feeCents };
  }

  // RIDE-PAY-030: Dunning check
  async checkDunning(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data: tenant } = await supabase
      .from('tenants')
      .select('balance_cents, created_at')
      .eq('id', tenantId)
      .single();

    if (!tenant || tenant.balance_cents >= 0) {
      return { stage: null, message: 'No overdue balance' };
    }

    const overdueCents = Math.abs(tenant.balance_cents);
    const { data: lastDunning } = await supabase
      .from('dunning_events')
      .select('stage, created_at')
      .eq('tenant_id', tenantId)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(1);

    const lastStage = lastDunning?.[0]?.stage;
    const lastDate = lastDunning?.[0]?.created_at ? new Date(lastDunning[0].created_at) : null;
    const daysSinceLastDunning = lastDate ? (Date.now() - lastDate.getTime()) / 86400000 : 999;

    let nextStage: string | null = null;
    if (!lastStage) nextStage = 'D0_soft';
    else if (lastStage === 'D0_soft' && daysSinceLastDunning >= 2) nextStage = 'D2_firm';
    else if (lastStage === 'D2_firm' && daysSinceLastDunning >= 3) nextStage = 'D5_suspend';
    else if (lastStage === 'D5_suspend' && daysSinceLastDunning >= 5) nextStage = 'D10_terminate';

    if (nextStage) {
      await supabase.from('dunning_events').insert({
        tenant_id: tenantId,
        stage: nextStage,
        amount_cents: overdueCents,
        notification_sent: true,
      });
      this.logger.warn(`Dunning ${nextStage} for tenant ${tenantId}: ${overdueCents} cents overdue`);
    }

    return { stage: nextStage || lastStage, overdue_cents: overdueCents };
  }

  // BILL-INV-0001: Generate invoice
  async generateInvoice(tenantId: string, periodStart: string, periodEnd: string) {
    const supabase = this.supabaseService.getClient();

    const invoiceNumber = `INV-${tenantId.substring(0, 8).toUpperCase()}-${Date.now()}`;

    const { data: trips } = await supabase
      .from('trips')
      .select('fare_cents, commission_cents')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    const subtotalCents = (trips || []).reduce((sum: number, t: any) => sum + (t.commission_cents || 0), 0);
    const taxCents = Math.round(subtotalCents * 0.0); // Tax calculated externally
    const totalCents = subtotalCents + taxCents;

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        tenant_id: tenantId,
        invoice_number: invoiceNumber,
        period_start: periodStart,
        period_end: periodEnd,
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        total_cents: totalCents,
        status: 'issued',
        issued_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to generate invoice: ${error.message}`);
    return invoice;
  }

  // PAY-FLOW-0100: Record payment consent
  async recordPaymentConsent(tenantId: string, riderId: string, consentType: string, granted: boolean, meta?: { ip?: string; ua?: string }) {
    const supabase = this.supabaseService.getClient();
    await supabase.from('payment_consent_log').insert({
      tenant_id: tenantId,
      rider_id: riderId,
      consent_type: consentType,
      granted,
      ip_address: meta?.ip,
      user_agent: meta?.ua,
    });
    return { recorded: true };
  }

  // RIDE-PAYOUT-106: Daily reconciliation
  async dailyReconciliation(tenantId: string, date?: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.rpc('daily_ledger_reconciliation', {
      p_tenant_id: tenantId,
      p_date: date || new Date(Date.now() - 86400000).toISOString().split('T')[0],
    });

    if (error) throw new BadRequestException(`Reconciliation failed: ${error.message}`);
    return data;
  }

  // TAX-1099-0001 / TAX-1099-010: Generate tax document
  async generateTaxDocument(tenantId: string, driverId: string, taxYear: number, docType: string) {
    const supabase = this.supabaseService.getClient();

    const yearStart = `${taxYear}-01-01`;
    const yearEnd = `${taxYear}-12-31`;

    const { data: trips } = await supabase
      .from('trips')
      .select('fare_cents, net_payout_cents')
      .eq('tenant_id', tenantId)
      .eq('driver_id', driverId)
      .eq('status', 'completed')
      .gte('created_at', yearStart)
      .lte('created_at', yearEnd);

    const totalGrossCents = (trips || []).reduce((sum: number, t: any) => sum + (t.fare_cents || 0), 0);

    const { data: doc, error } = await supabase
      .from('tax_documents')
      .upsert({
        tenant_id: tenantId,
        driver_id: driverId,
        tax_year: taxYear,
        doc_type: docType,
        total_gross_cents: totalGrossCents,
        status: 'generated',
      }, { onConflict: 'tenant_id,driver_id,tax_year,doc_type' })
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to generate tax doc: ${error.message}`);
    return doc;
  }

  // PAY-ADJ-0001: Clawback/recovery
  async createAdjustment(tenantId: string, driverId: string, amountCents: number, reason: string, type: 'clawback' | 'bonus') {
    await this.ledgerService.recordLedgerEvent({
      eventType: type === 'clawback' ? 'CLAWBACK' : 'BONUS',
      tripId: `adj-${driverId}-${Date.now()}`,
      tenantId,
      driverId,
      fareCents: type === 'clawback' ? -amountCents : amountCents,
      metadata: { reason, type },
    });

    return { success: true, type, amount_cents: amountCents, reason };
  }
}
