import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface RefundRequest {
  tenantId: string;
  tripId: string;
  paymentId?: string;
  amountCents: number;
  reason: string;
  initiatedBy: string;
  platformFeeRefundable?: boolean;
}

@Injectable()
export class RefundService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Multi-step refund orchestrator.
   *
   * Steps:
   * 1. Validate trip + original payment exist
   * 2. Calculate breakdown: tenant debit, platform fee (non-refundable by default), rider credit
   * 3. Debit tenant's pending balance via ledger reversal
   * 4. Record refund_request with full audit trail
   * 5. Reverse tenant_net_revenue in ledger
   */
  async initiateRefund(req: RefundRequest): Promise<{
    refund_id: string;
    status: string;
    breakdown: {
      rider_credit_cents: number;
      tenant_debit_cents: number;
      platform_fee_retained_cents: number;
    };
  }> {
    const supabase = this.supabaseService.getClient();

    // Step 1: Validate trip
    const { data: trip, error: tripErr } = await supabase
      .from('trips')
      .select('id, tenant_id, fare_cents, status')
      .eq('id', req.tripId)
      .eq('tenant_id', req.tenantId)
      .single();

    if (tripErr || !trip) {
      throw new NotFoundException('Trip not found in this tenant.');
    }

    if (!['completed', 'cancelled'].includes(trip.status)) {
      throw new BadRequestException(`Cannot refund trip in status: ${trip.status}`);
    }

    if (req.amountCents <= 0) {
      throw new BadRequestException('Refund amount must be positive.');
    }

    if (req.amountCents > trip.fare_cents) {
      throw new BadRequestException(
        `Refund amount (${req.amountCents}) exceeds trip fare (${trip.fare_cents}).`,
      );
    }

    // Step 2: Look up the original ledger entry for fee breakdown
    const { data: originalLedger } = await supabase
      .from('ledger_entries')
      .select('platform_fee_cents, tenant_net_cents, driver_payout_cents')
      .eq('trip_id', req.tripId)
      .eq('event_type', 'TRIP_COMPLETED')
      .single();

    const originalPlatformFee = originalLedger?.platform_fee_cents || 0;
    const originalTenantNet = originalLedger?.tenant_net_cents || 0;

    // Step 3: Calculate breakdown
    // By default, UrWay platform fee is NON-refundable
    const platformFeeRefundable = req.platformFeeRefundable === true;

    // Pro-rate if partial refund
    const refundRatio = req.amountCents / trip.fare_cents;
    const proRatedPlatformFee = Math.round(originalPlatformFee * refundRatio);
    const proRatedTenantNet = Math.round(originalTenantNet * refundRatio);

    let platformFeeRetained: number;
    let tenantDebit: number;
    let riderCredit: number;

    if (platformFeeRefundable) {
      // Rare: platform fee is also refunded
      platformFeeRetained = 0;
      tenantDebit = proRatedTenantNet;
      riderCredit = req.amountCents;
    } else {
      // Default: platform fee retained, tenant absorbs the full rider refund
      platformFeeRetained = proRatedPlatformFee;
      tenantDebit = req.amountCents; // Tenant pays the rider refund from their balance
      riderCredit = req.amountCents;
    }

    // Step 4: Create refund request record
    const { data: refund, error: refundErr } = await supabase
      .from('refund_requests')
      .insert({
        tenant_id: req.tenantId,
        trip_id: req.tripId,
        payment_id: req.paymentId || null,
        rider_id: null,
        amount_cents: req.amountCents,
        platform_fee_refundable: platformFeeRefundable,
        platform_fee_cents: platformFeeRetained,
        tenant_debit_cents: tenantDebit,
        rider_credit_cents: riderCredit,
        status: 'PROCESSING',
        reason: req.reason,
        initiated_by: req.initiatedBy,
      })
      .select('id')
      .single();

    if (refundErr) {
      throw new BadRequestException('Failed to create refund: ' + refundErr.message);
    }

    // Step 5: Record reversal ledger entry
    await supabase.from('ledger_entries').insert({
      event_type: 'REFUND',
      trip_id: req.tripId,
      tenant_id: req.tenantId,
      fare_cents: -req.amountCents,
      platform_fee_cents: platformFeeRefundable ? -proRatedPlatformFee : 0,
      tenant_net_cents: -tenantDebit,
      driver_payout_cents: 0,
      metadata: {
        refund_id: refund.id,
        reason: req.reason,
        platform_fee_retained: platformFeeRetained,
      },
    });

    // Step 6: Mark refund as completed
    await supabase
      .from('refund_requests')
      .update({ status: 'COMPLETED', processed_at: new Date().toISOString() })
      .eq('id', refund.id);

    return {
      refund_id: refund.id,
      status: 'COMPLETED',
      breakdown: {
        rider_credit_cents: riderCredit,
        tenant_debit_cents: tenantDebit,
        platform_fee_retained_cents: platformFeeRetained,
      },
    };
  }

  /**
   * Get refund history for a tenant.
   */
  async getRefundHistory(tenantId: string, limit = 50) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('refund_requests')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new BadRequestException('Failed to fetch refunds');
    return data || [];
  }
}
