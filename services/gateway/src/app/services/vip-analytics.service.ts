import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from './supabase.service';

/**
 * M9.8: VIP & Subsidy Performance Monitor
 *
 * Justifies the cost of "Buying a Car" for VIPs:
 *   - VIP Churn Rate: % of VIPs who fell below the 30-day retention threshold
 *   - Subsidy ROI: (Total LTV of Saved VIPs) vs. (Total Cents spent on Partner Subsidies)
 *   - Fulfillment Rate: Compare "VIP Fulfillment %" vs. "Standard Rider Fulfillment %"
 *
 * M11.8: Automated VIP Tier Maintenance & Alerts
 *   - Detect at-risk VIPs via cron
 *   - Generate dashboard alerts: "5 VIPs at risk of losing status this week"
 *   - "Send Incentive" → creates discount_code for targeted riders
 *
 * All currency in integer cents. Distance in miles.
 */

export interface VipPerformance {
  totalVips: number;
  atRiskVips: number;
  platinumCount: number;
  goldCount: number;
  silverCount: number;
  totalLtvCents: number;
  totalSubsidyCents: number;
  subsidyRoi: number;
  avgRetentionScore: number;
  refreshedAt: string;
}

export interface VipChurnMetrics {
  churnRate30d: number;
  totalChurned: number;
  totalRetained: number;
  savedBySubsidy: number;
  avgDaysToChurn: number;
}

export interface FulfillmentComparison {
  vipFulfillmentPct: number;
  standardFulfillmentPct: number;
  vipTrips: number;
  standardTrips: number;
  vipAvgAcceptanceSeconds: number;
  standardAvgAcceptanceSeconds: number;
}

export interface AtRiskVip {
  vipId: string;
  riderId: string;
  riderName: string;
  tier: string;
  daysSinceLastTrip: number;
  lifetimeValueCents: number;
  retentionScore: number;
}

export interface VipAlert {
  id: string;
  tenantId: string;
  alertType: string;
  severity: string;
  title: string;
  message: string;
  affectedCount: number;
  affectedRiders: string[];
  isRead: boolean;
  isActioned: boolean;
  createdAt: string;
}

export interface DiscountCode {
  id: string;
  tenantId: string;
  code: string;
  discountType: string;
  discountCents?: number;
  discountPercent?: number;
  maxDiscountCents?: number;
  targetRiderIds: string[];
  maxUses: number;
  currentUses: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
}

@Injectable()
export class VipAnalyticsService {
  private readonly logger = new Logger(VipAnalyticsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ── M9.8: VIP Performance ───────────────────────────────────────────────

  /**
   * Get VIP performance metrics from materialized view.
   */
  async getVipPerformance(tenantId: string): Promise<VipPerformance> {
    const supabase = this.supabaseService.getClient();

    const { data: mv } = await supabase
      .from('mv_vip_performance')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (mv) {
      return {
        totalVips: mv.total_vips,
        atRiskVips: mv.at_risk_vips,
        platinumCount: mv.platinum_count,
        goldCount: mv.gold_count,
        silverCount: mv.silver_count,
        totalLtvCents: mv.total_ltv_cents,
        totalSubsidyCents: mv.total_subsidy_cents,
        subsidyRoi: Number(mv.subsidy_roi),
        avgRetentionScore: Number(mv.avg_retention_score),
        refreshedAt: mv.refreshed_at,
      };
    }

    // Fallback: live query
    const { data: vips } = await supabase
      .from('vip_riders')
      .select('tier, is_at_risk, lifetime_value_cents, subsidy_received_cents, retention_score')
      .eq('tenant_id', tenantId)
      .neq('tier', 'standard');

    const all = vips || [];
    const totalLtv = all.reduce((s: number, v: any) => s + v.lifetime_value_cents, 0);
    const totalSub = all.reduce((s: number, v: any) => s + v.subsidy_received_cents, 0);

    return {
      totalVips: all.length,
      atRiskVips: all.filter((v: any) => v.is_at_risk).length,
      platinumCount: all.filter((v: any) => v.tier === 'platinum').length,
      goldCount: all.filter((v: any) => v.tier === 'gold').length,
      silverCount: all.filter((v: any) => v.tier === 'silver').length,
      totalLtvCents: totalLtv,
      totalSubsidyCents: totalSub,
      subsidyRoi: totalSub > 0 ? Math.round((totalLtv / totalSub) * 100) / 100 : 0,
      avgRetentionScore: all.length > 0
        ? Math.round(all.reduce((s: number, v: any) => s + Number(v.retention_score), 0) / all.length * 100) / 100
        : 0,
      refreshedAt: new Date().toISOString(),
    };
  }

  /**
   * VIP Churn Rate: % of VIPs who fell below the 30-day retention threshold.
   */
  async getVipChurnMetrics(tenantId: string): Promise<VipChurnMetrics> {
    const supabase = this.supabaseService.getClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: vips } = await supabase
      .from('vip_riders')
      .select('id, tier, is_at_risk, last_trip_at, subsidy_received_cents, enrolled_at')
      .eq('tenant_id', tenantId)
      .neq('tier', 'standard');

    const all = vips || [];
    const churned = all.filter((v: any) =>
      !v.last_trip_at || new Date(v.last_trip_at) < new Date(thirtyDaysAgo),
    );
    const retained = all.filter((v: any) =>
      v.last_trip_at && new Date(v.last_trip_at) >= new Date(thirtyDaysAgo),
    );
    const savedBySubsidy = retained.filter((v: any) => v.subsidy_received_cents > 0).length;

    // Avg days to churn
    let avgDays = 0;
    if (churned.length > 0) {
      const totalDays = churned.reduce((sum: number, v: any) => {
        const lastActive = v.last_trip_at ? new Date(v.last_trip_at) : new Date(v.enrolled_at);
        return sum + Math.floor((Date.now() - lastActive.getTime()) / (24 * 60 * 60 * 1000));
      }, 0);
      avgDays = Math.round(totalDays / churned.length);
    }

    return {
      churnRate30d: all.length > 0
        ? Math.round((churned.length / all.length) * 10000) / 100
        : 0,
      totalChurned: churned.length,
      totalRetained: retained.length,
      savedBySubsidy,
      avgDaysToChurn: avgDays,
    };
  }

  /**
   * Fulfillment Rate: Compare VIP vs Standard rider fulfillment.
   */
  async getFulfillmentComparison(tenantId: string): Promise<FulfillmentComparison> {
    const supabase = this.supabaseService.getClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get all VIP rider IDs for this tenant
    const { data: vipRiders } = await supabase
      .from('vip_riders')
      .select('rider_id')
      .eq('tenant_id', tenantId)
      .neq('tier', 'standard');

    const vipRiderIds = (vipRiders || []).map((v: any) => v.rider_id);

    // Get all recent trips
    const { data: trips } = await supabase
      .from('trips')
      .select('id, rider_id, status, created_at, completed_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', thirtyDaysAgo);

    const allTrips = trips || [];
    const vipTrips = allTrips.filter((t: any) => vipRiderIds.includes(t.rider_id));
    const standardTrips = allTrips.filter((t: any) => !vipRiderIds.includes(t.rider_id));

    const calcFulfillment = (tripList: any[]) => {
      if (tripList.length === 0) return { pct: 0, avgSec: 0 };
      const completed = tripList.filter((t: any) => t.status === 'completed');
      const accepted = tripList.filter((t: any) => ['assigned', 'active', 'completed'].includes(t.status));
      let avgSec = 0;
      if (accepted.length > 0) {
        const totalSec = accepted.reduce((sum: number, t: any) => {
          const end = t.completed_at ? new Date(t.completed_at) : new Date();
          return sum + (end.getTime() - new Date(t.created_at).getTime()) / 1000;
        }, 0);
        avgSec = Math.round(totalSec / accepted.length);
      }
      return {
        pct: Math.round((completed.length / tripList.length) * 10000) / 100,
        avgSec,
      };
    };

    const vipStats = calcFulfillment(vipTrips);
    const stdStats = calcFulfillment(standardTrips);

    return {
      vipFulfillmentPct: vipStats.pct,
      standardFulfillmentPct: stdStats.pct,
      vipTrips: vipTrips.length,
      standardTrips: standardTrips.length,
      vipAvgAcceptanceSeconds: vipStats.avgSec,
      standardAvgAcceptanceSeconds: stdStats.avgSec,
    };
  }

  // ── M11.8: VIP Tier Maintenance & Alerts ────────────────────────────────

  /**
   * Cron: Run every 6 hours to detect at-risk VIPs and generate alerts.
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async runVipMaintenanceCron(): Promise<void> {
    const supabase = this.supabaseService.getClient();

    // Get all active tenants
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .eq('is_active', true)
      .eq('is_suspended', false);

    for (const tenant of tenants || []) {
      try {
        await this.detectAndAlertAtRiskVips(tenant.id);
      } catch (err: any) {
        this.logger.warn(`VIP maintenance failed for tenant ${tenant.id}: ${err.message}`);
      }
    }
  }

  /**
   * Detect at-risk VIPs for a tenant and generate an alert.
   */
  async detectAndAlertAtRiskVips(tenantId: string): Promise<AtRiskVip[]> {
    const supabase = this.supabaseService.getClient();

    // Get tenant's retention threshold
    const { data: onboarding } = await supabase
      .from('tenant_onboarding')
      .select('vip_retention_days')
      .eq('tenant_id', tenantId)
      .single();

    const retentionDays = onboarding?.vip_retention_days ?? 30;

    // Call the PostGIS RPC to detect and update at-risk VIPs
    let atRiskVips: AtRiskVip[] = [];

    try {
      const { data, error } = await supabase.rpc('detect_at_risk_vips', {
        p_tenant_id: tenantId,
        p_retention_days: retentionDays,
      });

      if (!error && data) {
        atRiskVips = data.map((row: any) => ({
          vipId: row.vip_id,
          riderId: row.rider_id,
          riderName: row.rider_name || 'Unknown',
          tier: row.tier,
          daysSinceLastTrip: row.days_since_last_trip,
          lifetimeValueCents: row.lifetime_value_cents,
          retentionScore: Number(row.retention_score),
        }));
      }
    } catch {
      // RPC unavailable — fallback to manual detection
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

      const { data: vips } = await supabase
        .from('vip_riders')
        .select('id, rider_id, rider_name, tier, last_trip_at, enrolled_at, lifetime_value_cents, retention_score')
        .eq('tenant_id', tenantId)
        .neq('tier', 'standard')
        .or(`last_trip_at.is.null,last_trip_at.lt.${cutoff}`);

      // Mark as at-risk
      const ids = (vips || []).map((v: any) => v.id);
      if (ids.length > 0) {
        await supabase
          .from('vip_riders')
          .update({ is_at_risk: true, updated_at: new Date().toISOString() })
          .in('id', ids);
      }

      atRiskVips = (vips || []).map((v: any) => ({
        vipId: v.id,
        riderId: v.rider_id,
        riderName: v.rider_name || 'Unknown',
        tier: v.tier,
        daysSinceLastTrip: Math.floor(
          (Date.now() - new Date(v.last_trip_at || v.enrolled_at).getTime()) / (24 * 60 * 60 * 1000),
        ),
        lifetimeValueCents: v.lifetime_value_cents,
        retentionScore: Number(v.retention_score),
      }));
    }

    // Generate alert if there are at-risk VIPs
    if (atRiskVips.length > 0) {
      const riderIds = atRiskVips.map((v) => v.riderId);

      // Check for existing unread alert of same type today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: existingAlert } = await supabase
        .from('vip_alerts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('alert_type', 'vip_at_risk')
        .eq('is_read', false)
        .gte('created_at', todayStart.toISOString())
        .limit(1)
        .single();

      if (!existingAlert) {
        await supabase
          .from('vip_alerts')
          .insert({
            tenant_id: tenantId,
            alert_type: 'vip_at_risk',
            severity: atRiskVips.length >= 10 ? 'critical' : 'warning',
            title: `${atRiskVips.length} VIP${atRiskVips.length > 1 ? 's are' : ' is'} at risk of losing status this week`,
            message: `${atRiskVips.length} VIP rider${atRiskVips.length > 1 ? 's have' : ' has'} not booked in the last ${retentionDays} days. Consider sending an incentive to retain them.`,
            affected_riders: riderIds,
            affected_count: atRiskVips.length,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });

        this.logger.log(
          `M11.8: Alert generated for tenant ${tenantId} — ${atRiskVips.length} VIPs at risk`,
        );
      }
    }

    return atRiskVips;
  }

  /**
   * Get unread alerts for a tenant.
   */
  async getAlerts(
    tenantId: string,
    unreadOnly: boolean = false,
    limit: number = 50,
  ): Promise<VipAlert[]> {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('vip_alerts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq('is_read', false);

    const { data, error } = await query;
    if (error) throw new BadRequestException('Failed to fetch alerts');

    return (data || []).map((a: any) => this.mapAlert(a));
  }

  /**
   * Mark an alert as read.
   */
  async markAlertRead(alertId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    await supabase
      .from('vip_alerts')
      .update({ is_read: true })
      .eq('id', alertId);
  }

  /**
   * M11.8: "Send Incentive" — create a discount code targeted at specific riders.
   */
  async sendIncentive(params: {
    tenantId: string;
    alertId?: string;
    targetRiderIds: string[];
    discountType: 'fixed' | 'percentage';
    discountCents?: number;
    discountPercent?: number;
    maxDiscountCents?: number;
    validDays?: number;
  }): Promise<DiscountCode> {
    const supabase = this.supabaseService.getClient();

    // Validate subsidy budget
    const { data: onboarding } = await supabase
      .from('tenant_onboarding')
      .select('max_subsidy_limit_cents')
      .eq('tenant_id', params.tenantId)
      .single();

    const maxSubsidy = onboarding?.max_subsidy_limit_cents ?? 50000;

    // Check total subsidies already spent this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: monthSubsidies } = await supabase
      .from('vip_riders')
      .select('subsidy_received_cents')
      .eq('tenant_id', params.tenantId)
      .gte('updated_at', monthStart.toISOString());

    const totalSpent = (monthSubsidies || []).reduce(
      (s: number, v: any) => s + v.subsidy_received_cents, 0,
    );

    if (totalSpent >= maxSubsidy) {
      throw new BadRequestException(
        `Monthly subsidy budget exhausted: ${totalSpent}¢ / ${maxSubsidy}¢`,
      );
    }

    // Generate unique code
    const code = `VIP-${params.tenantId.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const validDays = params.validDays ?? 7;

    const { data: discount, error } = await supabase
      .from('discount_codes')
      .insert({
        tenant_id: params.tenantId,
        code,
        discount_type: params.discountType,
        discount_cents: params.discountCents,
        discount_percent: params.discountPercent,
        max_discount_cents: params.maxDiscountCents,
        target_rider_ids: params.targetRiderIds,
        max_uses: params.targetRiderIds.length,
        valid_until: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString(),
        created_by: params.alertId ? `alert:${params.alertId}` : 'tenant_admin',
        alert_id: params.alertId,
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException('Failed to create discount code: ' + error.message);

    // Mark alert as actioned
    if (params.alertId) {
      await supabase
        .from('vip_alerts')
        .update({
          is_actioned: true,
          actioned_at: new Date().toISOString(),
          action_taken: `Discount code ${code} sent to ${params.targetRiderIds.length} riders`,
        })
        .eq('id', params.alertId);
    }

    this.logger.log(
      `M11.8: Incentive ${code} created for ${params.targetRiderIds.length} riders in tenant ${params.tenantId}`,
    );

    return this.mapDiscount(discount);
  }

  /**
   * List active discount codes for a tenant.
   */
  async listDiscountCodes(tenantId: string): Promise<DiscountCode[]> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException('Failed to list discount codes');
    return (data || []).map((d: any) => this.mapDiscount(d));
  }

  // ── Enrollment & VIP Management ─────────────────────────────────────────

  /**
   * Enroll or update a rider's VIP tier.
   */
  async enrollVip(params: {
    tenantId: string;
    riderId: string;
    riderName?: string;
    riderEmail?: string;
    riderPhone?: string;
    tier: string;
    lifetimeValueCents?: number;
    tripCount?: number;
  }): Promise<any> {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('vip_riders')
      .select('id, tier')
      .eq('tenant_id', params.tenantId)
      .eq('rider_id', params.riderId)
      .single();

    if (existing) {
      const { data, error } = await supabase
        .from('vip_riders')
        .update({
          tier: params.tier,
          rider_name: params.riderName,
          rider_email: params.riderEmail,
          rider_phone: params.riderPhone,
          lifetime_value_cents: params.lifetimeValueCents ?? 0,
          trip_count: params.tripCount ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) throw new BadRequestException('Failed to update VIP: ' + error.message);
      return data;
    }

    const { data, error } = await supabase
      .from('vip_riders')
      .insert({
        tenant_id: params.tenantId,
        rider_id: params.riderId,
        rider_name: params.riderName,
        rider_email: params.riderEmail,
        rider_phone: params.riderPhone,
        tier: params.tier,
        lifetime_value_cents: params.lifetimeValueCents ?? 0,
        trip_count: params.tripCount ?? 0,
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException('Failed to enroll VIP: ' + error.message);
    return data;
  }

  private mapAlert(a: any): VipAlert {
    return {
      id: a.id,
      tenantId: a.tenant_id,
      alertType: a.alert_type,
      severity: a.severity,
      title: a.title,
      message: a.message,
      affectedCount: a.affected_count,
      affectedRiders: a.affected_riders || [],
      isRead: a.is_read,
      isActioned: a.is_actioned,
      createdAt: a.created_at,
    };
  }

  private mapDiscount(d: any): DiscountCode {
    return {
      id: d.id,
      tenantId: d.tenant_id,
      code: d.code,
      discountType: d.discount_type,
      discountCents: d.discount_cents,
      discountPercent: d.discount_percent ? Number(d.discount_percent) : undefined,
      maxDiscountCents: d.max_discount_cents,
      targetRiderIds: d.target_rider_ids || [],
      maxUses: d.max_uses,
      currentUses: d.current_uses,
      validFrom: d.valid_from,
      validUntil: d.valid_until,
      isActive: d.is_active,
    };
  }
}
