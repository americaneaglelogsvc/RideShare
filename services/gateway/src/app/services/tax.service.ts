import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class TaxService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Generate 1099-K tax summaries for a given tax year.
   * Aggregates gross earnings per driver_identity across all tenants.
   */
  async generate1099KSummaries(taxYear: number): Promise<{
    success: boolean;
    generated: number;
    taxYear: number;
  }> {
    const supabase = this.supabaseService.getClient();

    const startDate = `${taxYear}-01-01T00:00:00.000Z`;
    const endDate = `${taxYear}-12-31T23:59:59.999Z`;

    // Pull all TRIP_COMPLETED ledger entries for the year
    const { data: entries, error: ledgerErr } = await supabase
      .from('ledger_entries')
      .select('tenant_id, driver_id, fare_cents, platform_fee_cents, tenant_net_cents, driver_payout_cents')
      .eq('event_type', 'TRIP_COMPLETED')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (ledgerErr) throw new BadRequestException('Failed to fetch ledger: ' + ledgerErr.message);

    // Resolve driver_profile → driver_identity mapping
    const profileIds = [...new Set((entries || []).map((e) => e.driver_id).filter(Boolean))];

    const { data: profiles } = await supabase
      .from('driver_profiles')
      .select('id, driver_identity_id, tenant_id')
      .in('id', profileIds.length > 0 ? profileIds : ['00000000-0000-0000-0000-000000000000']);

    const profileMap: Record<string, { identityId: string; tenantId: string }> = {};
    for (const p of profiles || []) {
      profileMap[p.id] = { identityId: p.driver_identity_id, tenantId: p.tenant_id };
    }

    // Pull refund totals for the year
    const { data: refunds } = await supabase
      .from('refund_requests')
      .select('tenant_id, rider_credit_cents')
      .eq('status', 'COMPLETED')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const refundByTenant: Record<string, number> = {};
    for (const r of refunds || []) {
      refundByTenant[r.tenant_id] = (refundByTenant[r.tenant_id] || 0) + r.rider_credit_cents;
    }

    // Aggregate by (identity, tenant)
    const aggregates: Record<string, {
      identityId: string;
      tenantId: string;
      grossEarnings: number;
      platformFees: number;
      netEarnings: number;
      tripCount: number;
    }> = {};

    for (const entry of entries || []) {
      const mapping = entry.driver_id ? profileMap[entry.driver_id] : null;
      if (!mapping) continue;

      const key = `${mapping.identityId}:${mapping.tenantId}`;
      if (!aggregates[key]) {
        aggregates[key] = {
          identityId: mapping.identityId,
          tenantId: mapping.tenantId,
          grossEarnings: 0,
          platformFees: 0,
          netEarnings: 0,
          tripCount: 0,
        };
      }

      aggregates[key].grossEarnings += entry.fare_cents;
      aggregates[key].platformFees += entry.platform_fee_cents;
      aggregates[key].netEarnings += entry.driver_payout_cents;
      aggregates[key].tripCount++;
    }

    // Upsert tax summaries
    const rows = Object.values(aggregates).map((agg) => ({
      tax_year: taxYear,
      driver_identity_id: agg.identityId,
      tenant_id: agg.tenantId,
      gross_earnings_cents: agg.grossEarnings,
      platform_fees_cents: agg.platformFees,
      net_earnings_cents: agg.netEarnings,
      trip_count: agg.tripCount,
      refund_total_cents: refundByTenant[agg.tenantId] || 0,
      generated_at: new Date().toISOString(),
    }));

    if (rows.length === 0) {
      return { success: true, generated: 0, taxYear };
    }

    const { error: upsertErr } = await supabase
      .from('tax_summaries')
      .upsert(rows, { onConflict: 'tax_year,driver_identity_id,tenant_id' });

    if (upsertErr) throw new BadRequestException('Failed to upsert tax summaries: ' + upsertErr.message);

    return { success: true, generated: rows.length, taxYear };
  }

  /**
   * Get 1099-K summary for a specific driver identity across all tenants.
   */
  async getDriverTaxSummary(taxYear: number, driverIdentityId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tax_summaries')
      .select('*')
      .eq('tax_year', taxYear)
      .eq('driver_identity_id', driverIdentityId)
      .order('gross_earnings_cents', { ascending: false });

    if (error) throw new BadRequestException('Failed to fetch tax summary');

    const totalGross = (data || []).reduce((s, r) => s + r.gross_earnings_cents, 0);
    const totalNet = (data || []).reduce((s, r) => s + r.net_earnings_cents, 0);
    const totalTrips = (data || []).reduce((s, r) => s + r.trip_count, 0);
    const threshold1099K = 60000; // $600.00 IRS threshold in cents

    return {
      tax_year: taxYear,
      driver_identity_id: driverIdentityId,
      total_gross_earnings_cents: totalGross,
      total_net_earnings_cents: totalNet,
      total_trip_count: totalTrips,
      requires_1099K: totalGross >= threshold1099K,
      by_tenant: data || [],
    };
  }

  /**
   * Get all driver identities requiring 1099-K for a tax year.
   */
  async get1099KCandidates(taxYear: number) {
    const supabase = this.supabaseService.getClient();
    const threshold = 60000; // $600.00

    const { data, error } = await supabase
      .from('tax_summaries')
      .select('driver_identity_id, gross_earnings_cents')
      .eq('tax_year', taxYear);

    if (error) throw new BadRequestException('Failed to fetch 1099-K candidates');

    // Aggregate gross by identity
    const byIdentity: Record<string, number> = {};
    for (const row of data || []) {
      byIdentity[row.driver_identity_id] = (byIdentity[row.driver_identity_id] || 0) + row.gross_earnings_cents;
    }

    const candidates = Object.entries(byIdentity)
      .filter(([, gross]) => gross >= threshold)
      .map(([id, gross]) => ({ driver_identity_id: id, gross_earnings_cents: gross }))
      .sort((a, b) => b.gross_earnings_cents - a.gross_earnings_cents);

    return {
      tax_year: taxYear,
      threshold_cents: threshold,
      candidates_count: candidates.length,
      candidates,
    };
  }
}
