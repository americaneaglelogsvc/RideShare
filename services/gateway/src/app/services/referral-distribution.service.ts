import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * M5.11: Referral Distribution Service — 4-Way Subsidized VIP Split
 *
 * When a Spill-Over ride is fulfilled by a partner tenant's driver,
 * the revenue split becomes a 4-way distribution:
 *
 *   1. Platform Fee (applied FIRST on gross fare via platform_fee_bps)
 *   2. Marketplace Surcharge (credited to UrWay platform account)
 *   3. Origin Tenant Referral Fee (for sending the ride)
 *   4. Fulfilling Tenant Net → Driver Payout
 *
 * If the ride is a Subsidized VIP ride, the subsidy is debited from
 * the origin tenant's max_subsidy_limit_cents budget.
 *
 * Invariant: platform_fee + marketplace_surcharge + referral_fee + fulfilling_net = gross_fare
 * All calculations use integer cents — NO floating point.
 */

export interface ReferralSplitResult {
  splitId: string;
  spillOverId: string;
  tripId: string;
  grossFareCents: number;
  platformFeeCents: number;
  marketplaceSurchargeCents: number;
  referralFeeCents: number;
  fulfillingTenantNetCents: number;
  driverPayoutCents: number;
  subsidyDebitCents: number;
  feeBreakdown: {
    platformFeeBps: number;
    marketplaceSurchargeBps: number;
    referralFeeBps: number;
  };
}

@Injectable()
export class ReferralDistributionService {
  private readonly logger = new Logger(ReferralDistributionService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Execute the 4-way referral distribution split for a Spill-Over ride.
   *
   * Order of operations:
   *   1. platform_fee_bps applied to gross FIRST
   *   2. marketplace_surcharge_bps applied to gross
   *   3. referral_fee_bps applied to gross (credited to origin tenant)
   *   4. Remainder = fulfilling tenant net → driver payout
   *
   * If subsidized VIP, debit subsidy from origin tenant budget.
   */
  async executeReferralSplit(
    spillOverId: string,
    subsidyCents: number = 0,
  ): Promise<ReferralSplitResult> {
    const supabase = this.supabaseService.getClient();

    // Step 1: Fetch the spill-over referral record
    const { data: referral, error: refErr } = await supabase
      .from('spill_over_referrals')
      .select('id, originating_tenant_id, fulfilling_tenant_id, trip_id, fare_cents, status')
      .eq('id', spillOverId)
      .single();

    if (refErr || !referral) {
      throw new BadRequestException(`Spill-over referral ${spillOverId} not found`);
    }

    // Idempotency: already split?
    const { data: existingSplit } = await supabase
      .from('referral_distribution_splits')
      .select('id')
      .eq('spill_over_id', spillOverId)
      .single();

    if (existingSplit) {
      const { data: full } = await supabase
        .from('referral_distribution_splits')
        .select('*')
        .eq('spill_over_id', spillOverId)
        .single();

      return this.mapSplitResult(full);
    }

    // Step 2: Fetch origin tenant's commercial terms
    const { data: originTerms } = await supabase
      .from('tenant_onboarding')
      .select('revenue_share_bps, marketplace_surcharge_bps, referral_fee_bps, max_subsidy_limit_cents')
      .eq('tenant_id', referral.originating_tenant_id)
      .single();

    const platformFeeBps = originTerms?.revenue_share_bps ?? 500;         // 5% default
    const marketplaceSurchargeBps = originTerms?.marketplace_surcharge_bps ?? 200; // 2% default
    const referralFeeBps = originTerms?.referral_fee_bps ?? 300;           // 3% default

    // Step 3: Fetch trip + driver info
    const { data: trip } = await supabase
      .from('trips')
      .select('id, driver_id, fare_cents')
      .eq('id', referral.trip_id)
      .single();

    const grossFareCents = trip?.fare_cents ?? referral.fare_cents;

    // Step 4: Calculate 4-way split — ALL INTEGER CENTS
    // Platform fee FIRST (applied to gross)
    const platformFeeCents = Math.floor(grossFareCents * platformFeeBps / 10000);

    // Marketplace surcharge (applied to gross)
    const marketplaceSurchargeCents = Math.floor(grossFareCents * marketplaceSurchargeBps / 10000);

    // Referral fee to origin tenant (applied to gross)
    const referralFeeCents = Math.floor(grossFareCents * referralFeeBps / 10000);

    // Fulfilling tenant net = gross - all fees
    const fulfillingTenantNetCents = grossFareCents - platformFeeCents - marketplaceSurchargeCents - referralFeeCents;

    // Driver payout = fulfilling tenant net (default 100% pass-through)
    const driverPayoutCents = Math.max(fulfillingTenantNetCents, 0);

    // INVARIANT CHECK
    const total = platformFeeCents + marketplaceSurchargeCents + referralFeeCents + fulfillingTenantNetCents;
    if (total !== grossFareCents) {
      this.logger.warn(
        `4-way split rounding: ${total} != ${grossFareCents}. Adjusting fulfilling net.`,
      );
    }

    // Step 5: Handle VIP subsidy debit
    let subsidyDebitCents = 0;
    if (subsidyCents > 0) {
      const maxSubsidy = originTerms?.max_subsidy_limit_cents ?? 50000;

      // Check remaining subsidy budget
      const { data: currentSpend } = await supabase
        .from('referral_distribution_splits')
        .select('subsidy_debit_cents')
        .eq('originating_tenant_id', referral.originating_tenant_id);

      const totalSpent = (currentSpend || []).reduce(
        (s: number, r: any) => s + (r.subsidy_debit_cents || 0), 0,
      );

      const remaining = maxSubsidy - totalSpent;
      subsidyDebitCents = Math.min(subsidyCents, remaining);

      if (subsidyDebitCents < subsidyCents) {
        this.logger.warn(
          `Subsidy capped: requested ${subsidyCents}¢ but only ${remaining}¢ remaining for tenant ${referral.originating_tenant_id}`,
        );
      }
    }

    // Step 6: Record the referral distribution split
    const feeBreakdown = { platformFeeBps, marketplaceSurchargeBps, referralFeeBps };

    const { data: split, error: splitErr } = await supabase
      .from('referral_distribution_splits')
      .insert({
        spill_over_id: spillOverId,
        trip_id: referral.trip_id,
        originating_tenant_id: referral.originating_tenant_id,
        fulfilling_tenant_id: referral.fulfilling_tenant_id,
        driver_id: trip?.driver_id,
        gross_fare_cents: grossFareCents,
        platform_fee_cents: platformFeeCents,
        referral_fee_cents: referralFeeCents,
        marketplace_surcharge_cents: marketplaceSurchargeCents,
        fulfilling_tenant_net_cents: fulfillingTenantNetCents,
        driver_payout_cents: driverPayoutCents,
        subsidy_debit_cents: subsidyDebitCents,
        fee_breakdown: feeBreakdown,
        status: 'settled',
        settled_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (splitErr) {
      throw new BadRequestException(
        `Referral split failed: ${splitErr.message}`,
      );
    }

    // Step 7: Update the spill-over referral status
    await supabase
      .from('spill_over_referrals')
      .update({
        referral_fee_cents: referralFeeCents,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', spillOverId);

    // Step 8: Record ledger entry for the platform
    await supabase.from('ledger_entries').insert({
      event_type: 'REFERRAL_SPLIT',
      trip_id: referral.trip_id,
      tenant_id: referral.originating_tenant_id,
      driver_id: trip?.driver_id,
      fare_cents: grossFareCents,
      platform_fee_cents: platformFeeCents + marketplaceSurchargeCents,
      tenant_net_cents: referralFeeCents,
      driver_payout_cents: driverPayoutCents,
      metadata: {
        spill_over_id: spillOverId,
        fulfilling_tenant_id: referral.fulfilling_tenant_id,
        marketplace_surcharge_cents: marketplaceSurchargeCents,
        subsidy_debit_cents: subsidyDebitCents,
      },
    });

    this.logger.log(
      `M5.11: 4-way referral split for trip ${referral.trip_id} — ` +
      `gross=${grossFareCents}¢ platform=${platformFeeCents}¢ surcharge=${marketplaceSurchargeCents}¢ ` +
      `referral=${referralFeeCents}¢ fulfilling=${fulfillingTenantNetCents}¢ driver=${driverPayoutCents}¢`,
    );

    return {
      splitId: split!.id,
      spillOverId,
      tripId: referral.trip_id,
      grossFareCents,
      platformFeeCents,
      marketplaceSurchargeCents,
      referralFeeCents,
      fulfillingTenantNetCents,
      driverPayoutCents,
      subsidyDebitCents,
      feeBreakdown,
    };
  }

  /**
   * Get referral distribution history for a tenant (as origin or fulfiller).
   */
  async getReferralHistory(tenantId: string, role: 'origin' | 'fulfilling' = 'origin'): Promise<any[]> {
    const supabase = this.supabaseService.getClient();
    const column = role === 'origin' ? 'originating_tenant_id' : 'fulfilling_tenant_id';

    const { data, error } = await supabase
      .from('referral_distribution_splits')
      .select('*')
      .eq(column, tenantId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new BadRequestException('Failed to fetch referral history');
    return data || [];
  }

  private mapSplitResult(row: any): ReferralSplitResult {
    return {
      splitId: row.id,
      spillOverId: row.spill_over_id,
      tripId: row.trip_id,
      grossFareCents: row.gross_fare_cents,
      platformFeeCents: row.platform_fee_cents,
      marketplaceSurchargeCents: row.marketplace_surcharge_cents,
      referralFeeCents: row.referral_fee_cents,
      fulfillingTenantNetCents: row.fulfilling_tenant_net_cents,
      driverPayoutCents: row.driver_payout_cents,
      subsidyDebitCents: row.subsidy_debit_cents,
      feeBreakdown: row.fee_breakdown || {},
    };
  }
}
