import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class AdminService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async suspendTenant(tenantId: string, reason: string) {
    const supabase = this.supabaseService.getClient();

    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id, name, is_suspended')
      .eq('id', tenantId)
      .single();

    if (fetchError || !tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.is_suspended) {
      throw new BadRequestException('Tenant is already suspended');
    }

    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspension_reason: reason,
      })
      .eq('id', tenantId);

    if (updateError) {
      throw new BadRequestException('Failed to suspend tenant: ' + updateError.message);
    }

    await supabase
      .from('driver_profiles')
      .update({ is_active: false })
      .eq('tenant_id', tenantId);

    await supabase
      .from('trips')
      .update({ status: 'cancelled' })
      .eq('tenant_id', tenantId)
      .in('status', ['requested', 'assigned']);

    await supabase
      .from('ride_offers')
      .update({ status: 'cancelled' })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending');

    return {
      success: true,
      message: `Tenant ${tenant.name} suspended. All profiles deactivated, open trips cancelled.`,
      tenantId,
    };
  }

  async reinstateTenant(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('tenants')
      .update({
        is_suspended: false,
        suspended_at: null,
        suspension_reason: null,
      })
      .eq('id', tenantId);

    if (error) {
      throw new BadRequestException('Failed to reinstate tenant');
    }

    return { success: true, message: 'Tenant reinstated. Profiles must be individually reactivated by staff.' };
  }

  async suspendDriverIdentity(identityId: string, reason: string) {
    const supabase = this.supabaseService.getClient();

    const { data: identity, error: fetchError } = await supabase
      .from('driver_identities')
      .select('id, email, is_suspended')
      .eq('id', identityId)
      .single();

    if (fetchError || !identity) {
      throw new NotFoundException('Driver identity not found');
    }

    if (identity.is_suspended) {
      throw new BadRequestException('Driver identity is already suspended');
    }

    const { error: updateError } = await supabase
      .from('driver_identities')
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspension_reason: reason,
      })
      .eq('id', identityId);

    if (updateError) {
      throw new BadRequestException('Failed to suspend driver identity');
    }

    await supabase
      .from('driver_profiles')
      .update({ is_active: false, status: 'suspended' })
      .eq('driver_identity_id', identityId);

    return {
      success: true,
      message: `Driver identity ${identity.email} suspended globally across all tenants.`,
      identityId,
    };
  }

  async reinstateDriverIdentity(identityId: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('driver_identities')
      .update({
        is_suspended: false,
        suspended_at: null,
        suspension_reason: null,
      })
      .eq('id', identityId);

    if (error) {
      throw new BadRequestException('Failed to reinstate driver identity');
    }

    return { success: true, message: 'Driver identity reinstated. Profiles must be individually reactivated.' };
  }

  async getGlobalLedger(filters?: { tenantId?: string; startDate?: string; endDate?: string; limit?: number }) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('ledger_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.tenantId) query = query.eq('tenant_id', filters.tenantId);
    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate);
    if (filters?.limit) query = query.limit(filters.limit);
    else query = query.limit(100);

    const { data, error } = await query;
    if (error) throw new BadRequestException('Failed to fetch ledger: ' + error.message);

    return { success: true, entries: data, count: data?.length || 0 };
  }

  async getVolumeMonitor() {
    const supabase = this.supabaseService.getClient();

    const { data: activeTrips } = await supabase
      .from('trips')
      .select('tenant_id, status')
      .in('status', ['requested', 'assigned', 'active']);

    const byTenant: Record<string, { requested: number; assigned: number; active: number }> = {};
    let total = 0;

    for (const trip of activeTrips || []) {
      if (!byTenant[trip.tenant_id]) {
        byTenant[trip.tenant_id] = { requested: 0, assigned: 0, active: 0 };
      }
      byTenant[trip.tenant_id][trip.status as 'requested' | 'assigned' | 'active']++;
      total++;
    }

    return { success: true, totalActiveTrips: total, byTenant };
  }

  async getSettlementWatch() {
    const supabase = this.supabaseService.getClient();
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: stuck, error } = await supabase
      .from('driver_payouts')
      .select('id, driver_id, tenant_id, amount_cents, settlement_status, created_at')
      .eq('settlement_status', 'PENDING_BANK_SETTLEMENT')
      .lte('created_at', cutoff);

    if (error) throw new BadRequestException('Failed to fetch settlement watch');

    return {
      success: true,
      stuckTransactions: stuck || [],
      count: stuck?.length || 0,
      message: `${stuck?.length || 0} transactions stuck PENDING_BANK_SETTLEMENT for >48 hours`,
    };
  }

  // ── M9.1: Parallel Session Monitor ─────────────────────────────────
  async getParallelSessionMonitor() {
    const supabase = this.supabaseService.getClient();

    // Get all active driver profiles grouped by identity
    const { data: activeProfiles, error } = await supabase
      .from('driver_profiles')
      .select('id, tenant_id, status, is_active, driver_identity_id')
      .eq('is_active', true)
      .in('status', ['online', 'on_trip']);

    if (error) throw new BadRequestException('Failed to fetch parallel sessions: ' + error.message);

    // Group by identity
    const byIdentity: Record<string, {
      identity_id: string;
      active_tenant_sessions: { profile_id: string; tenant_id: string; status: string }[];
    }> = {};

    for (const profile of activeProfiles || []) {
      const iid = profile.driver_identity_id;
      if (!byIdentity[iid]) {
        byIdentity[iid] = { identity_id: iid, active_tenant_sessions: [] };
      }
      byIdentity[iid].active_tenant_sessions.push({
        profile_id: profile.id,
        tenant_id: profile.tenant_id,
        status: profile.status,
      });
    }

    // Sort by number of simultaneous sessions descending
    const sorted = Object.values(byIdentity)
      .filter((entry) => entry.active_tenant_sessions.length > 0)
      .sort((a, b) => b.active_tenant_sessions.length - a.active_tenant_sessions.length);

    const multiTenantDrivers = sorted.filter((e) => e.active_tenant_sessions.length > 1);

    return {
      success: true,
      total_active_drivers: sorted.length,
      multi_tenant_drivers: multiTenantDrivers.length,
      drivers: sorted.slice(0, 50),
    };
  }

  // ── M9.1: Liquidity Report ─────────────────────────────────────────
  async getLiquidityReport(filters?: { date?: string; tenantId?: string }) {
    const supabase = this.supabaseService.getClient();

    // Default to today
    const targetDate = filters?.date || new Date().toISOString().split('T')[0];
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    let query = supabase
      .from('ledger_entries')
      .select('tenant_id, fare_cents, platform_fee_cents, tenant_net_cents, driver_payout_cents, event_type')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (filters?.tenantId) query = query.eq('tenant_id', filters.tenantId);

    const { data: entries, error } = await query;

    if (error) throw new BadRequestException('Failed to fetch liquidity report: ' + error.message);

    // Aggregate
    let totalFareCents = 0;
    let totalPlatformFeeCents = 0;
    let totalTenantNetCents = 0;
    let totalDriverPayoutCents = 0;
    let totalSubscriptionCents = 0;
    const byTenant: Record<string, {
      fare_cents: number;
      platform_fee_cents: number;
      tenant_net_cents: number;
      driver_payout_cents: number;
      trip_count: number;
    }> = {};

    for (const entry of entries || []) {
      totalFareCents += entry.fare_cents;
      totalPlatformFeeCents += entry.platform_fee_cents;
      totalTenantNetCents += entry.tenant_net_cents;
      totalDriverPayoutCents += entry.driver_payout_cents;

      if (entry.event_type === 'SUBSCRIPTION_BILLING') {
        totalSubscriptionCents += entry.platform_fee_cents;
      }

      const tid = entry.tenant_id;
      if (!byTenant[tid]) {
        byTenant[tid] = { fare_cents: 0, platform_fee_cents: 0, tenant_net_cents: 0, driver_payout_cents: 0, trip_count: 0 };
      }
      byTenant[tid].fare_cents += entry.fare_cents;
      byTenant[tid].platform_fee_cents += entry.platform_fee_cents;
      byTenant[tid].tenant_net_cents += entry.tenant_net_cents;
      byTenant[tid].driver_payout_cents += entry.driver_payout_cents;
      if (entry.event_type === 'TRIP_COMPLETED') byTenant[tid].trip_count++;
    }

    return {
      success: true,
      date: targetDate,
      summary: {
        total_fares_dollars: (totalFareCents / 100).toFixed(2),
        urway_platform_fees_dollars: (totalPlatformFeeCents / 100).toFixed(2),
        tenant_net_revenue_dollars: (totalTenantNetCents / 100).toFixed(2),
        driver_payouts_dollars: (totalDriverPayoutCents / 100).toFixed(2),
        subscription_revenue_dollars: (totalSubscriptionCents / 100).toFixed(2),
      },
      summary_cents: {
        total_fares: totalFareCents,
        urway_platform_fees: totalPlatformFeeCents,
        tenant_net_revenue: totalTenantNetCents,
        driver_payouts: totalDriverPayoutCents,
        subscription_revenue: totalSubscriptionCents,
      },
      by_tenant: byTenant,
      entry_count: entries?.length || 0,
    };
  }

  // ── M9.1: Settlement Aging Detail ──────────────────────────────────
  async getSettlementAging() {
    const supabase = this.supabaseService.getClient();

    const { data: allPending, error } = await supabase
      .from('driver_payouts')
      .select('id, driver_id, tenant_id, amount_cents, settlement_status, created_at')
      .eq('settlement_status', 'PENDING_BANK_SETTLEMENT')
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException('Failed to fetch settlement aging');

    const now = Date.now();
    const buckets = {
      under_24h: [] as any[],
      between_24h_48h: [] as any[],
      over_48h: [] as any[],
      over_72h: [] as any[],
    };

    for (const payout of allPending || []) {
      const ageMs = now - new Date(payout.created_at).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      const entry = { ...payout, age_hours: Math.round(ageHours * 10) / 10 };

      if (ageHours > 72) buckets.over_72h.push(entry);
      else if (ageHours > 48) buckets.over_48h.push(entry);
      else if (ageHours > 24) buckets.between_24h_48h.push(entry);
      else buckets.under_24h.push(entry);
    }

    return {
      success: true,
      total_pending: allPending?.length || 0,
      total_amount_cents: (allPending || []).reduce((s: number, p: any) => s + p.amount_cents, 0),
      buckets: {
        under_24h: { count: buckets.under_24h.length, items: buckets.under_24h },
        between_24h_48h: { count: buckets.between_24h_48h.length, items: buckets.between_24h_48h },
        over_48h: { count: buckets.over_48h.length, items: buckets.over_48h },
        over_72h_critical: { count: buckets.over_72h.length, items: buckets.over_72h },
      },
    };
  }

  // ── M5.2: Billing overview ─────────────────────────────────────────
  async getBillingOverview() {
    const supabase = this.supabaseService.getClient();

    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, name, slug, billing_status, next_billing_date, billing_failed_at, billing_failure_reason')
      .eq('is_active', true)
      .order('next_billing_date', { ascending: true });

    if (error) throw new BadRequestException('Failed to fetch billing overview');

    const failed = (tenants || []).filter((t) => t.billing_status === 'BILLING_FAILED');
    const upcoming7d = (tenants || []).filter((t) => {
      if (!t.next_billing_date) return false;
      const days = (new Date(t.next_billing_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days <= 7 && days >= 0;
    });

    return {
      success: true,
      total_active_tenants: tenants?.length || 0,
      billing_failed: { count: failed.length, tenants: failed },
      upcoming_7_days: { count: upcoming7d.length, tenants: upcoming7d },
      all_tenants: tenants,
    };
  }
}
