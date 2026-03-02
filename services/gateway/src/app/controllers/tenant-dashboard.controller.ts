import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantAnalyticsService } from '../services/tenant-analytics.service';
import { VipAnalyticsService } from '../services/vip-analytics.service';
import { SupabaseService } from '../services/supabase.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * Phase 6.5: The Intelligent Tenant-Admin Dashboard
 *
 * Tenant-scoped endpoints for:
 *   M9.7  — Business at a Glance (fleet util, marketplace yield, service level)
 *   M9.8  — VIP & Subsidy Performance Monitor
 *   M9.9  — Real-Time Operations Map
 *   M11.8 — VIP Tier Alerts & Incentives
 *   M5.10 — Commercial Profile Control Panel
 *   AI    — "Ask the Agent" natural language analytics
 *
 * Privacy: Every query is scoped to the requesting tenant_id.
 * USA Standards: All labels use "Miles" and "USD ($)". Currency in integer cents.
 */

@ApiTags('tenant-dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantDashboardController {
  constructor(
    private readonly tenantAnalytics: TenantAnalyticsService,
    private readonly vipAnalytics: VipAnalyticsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // ── M9.7: Business at a Glance ─────────────────────────────────────────

  @Get(':tenantId/glance')
  @ApiOperation({ summary: 'M9.7: Full Business at a Glance dashboard' })
  @ApiResponse({ status: 200, description: 'Fleet, service level, revenue, and marketplace yield' })
  async getBusinessAtAGlance(@Param('tenantId') tenantId: string) {
    return this.tenantAnalytics.getBusinessAtAGlance(tenantId);
  }

  @Get(':tenantId/fleet')
  @ApiOperation({ summary: 'M9.7: Fleet utilization metrics' })
  @ApiResponse({ status: 200, description: 'Driver availability and utilization %' })
  async getFleetUtilization(@Param('tenantId') tenantId: string) {
    return this.tenantAnalytics.getFleetUtilization(tenantId);
  }

  @Get(':tenantId/service-level')
  @ApiOperation({ summary: 'M9.7: Service level (avg request-to-acceptance time)' })
  @ApiResponse({ status: 200, description: 'Avg acceptance seconds, fulfillment rate' })
  async getServiceLevel(@Param('tenantId') tenantId: string) {
    return this.tenantAnalytics.getServiceLevel(tenantId);
  }

  @Get(':tenantId/revenue')
  @ApiOperation({ summary: 'M9.7: Revenue summary (last 30 days, in cents USD)' })
  @ApiResponse({ status: 200, description: '30-day revenue breakdown' })
  async getRevenueSummary(@Param('tenantId') tenantId: string) {
    return this.tenantAnalytics.getRevenueSummary(tenantId);
  }

  @Get(':tenantId/marketplace-yield')
  @ApiOperation({ summary: 'M9.7: Marketplace yield from Spill-Over referrals (cents USD)' })
  @ApiResponse({ status: 200, description: 'Spill-over referral revenue' })
  async getMarketplaceYield(@Param('tenantId') tenantId: string) {
    return this.tenantAnalytics.getMarketplaceYield(tenantId);
  }

  // ── M9.8: VIP & Subsidy Performance ─────────────────────────────────────

  @Get(':tenantId/vip/performance')
  @ApiOperation({ summary: 'M9.8: VIP performance metrics (LTV, subsidy ROI, tiers)' })
  @ApiResponse({ status: 200, description: 'VIP performance from materialized view' })
  async getVipPerformance(@Param('tenantId') tenantId: string) {
    return this.vipAnalytics.getVipPerformance(tenantId);
  }

  @Get(':tenantId/vip/churn')
  @ApiOperation({ summary: 'M9.8: VIP churn rate (30-day retention threshold)' })
  @ApiResponse({ status: 200, description: 'Churn rate, retained vs churned, saved by subsidy' })
  async getVipChurn(@Param('tenantId') tenantId: string) {
    return this.vipAnalytics.getVipChurnMetrics(tenantId);
  }

  @Get(':tenantId/vip/fulfillment')
  @ApiOperation({ summary: 'M9.8: VIP vs Standard fulfillment comparison' })
  @ApiResponse({ status: 200, description: 'Fulfillment rate and acceptance time comparison' })
  async getVipFulfillment(@Param('tenantId') tenantId: string) {
    return this.vipAnalytics.getFulfillmentComparison(tenantId);
  }

  @Post(':tenantId/vip/enroll')
  @ApiOperation({ summary: 'M9.8: Enroll or update a rider VIP tier' })
  @ApiResponse({ status: 201, description: 'VIP enrollment recorded' })
  async enrollVip(
    @Param('tenantId') tenantId: string,
    @Body() body: {
      rider_id: string;
      rider_name?: string;
      rider_email?: string;
      rider_phone?: string;
      tier: string;
      lifetime_value_cents?: number;
      trip_count?: number;
    },
  ) {
    return this.vipAnalytics.enrollVip({
      tenantId,
      riderId: body.rider_id,
      riderName: body.rider_name,
      riderEmail: body.rider_email,
      riderPhone: body.rider_phone,
      tier: body.tier,
      lifetimeValueCents: body.lifetime_value_cents,
      tripCount: body.trip_count,
    });
  }

  // ── M9.9: Real-Time Operations Map ──────────────────────────────────────

  @Get(':tenantId/map/drivers')
  @ApiOperation({ summary: 'M9.9: Real-time driver positions for operations map' })
  @ApiResponse({ status: 200, description: 'Driver positions (Green=Available, Blue=On Trip, Red=Offline, Ghost=Spill-Over)' })
  async getMapDrivers(@Param('tenantId') tenantId: string) {
    const supabase = this.supabaseService.getClient();

    try {
      const { data, error } = await supabase.rpc('get_tenant_map_drivers', {
        p_tenant_id: tenantId,
      });

      if (!error && data) {
        return {
          drivers: data.map((d: any) => ({
            driverId: d.driver_id,
            driverName: d.is_ghost ? 'Partner Driver' : d.driver_name,
            lat: d.lat,
            lng: d.lng,
            status: d.status,
            isGhost: d.is_ghost,
            category: d.category,
            color: this.getDriverColor(d.status),
            updatedAt: d.updated_at,
          })),
          totalCount: data.length,
          legend: {
            green: 'Available',
            blue: 'On Trip',
            red: 'Offline',
            gray: 'Spill-Over (Partner)',
          },
        };
      }
    } catch {
      // RPC unavailable — fallback
    }

    // Fallback: direct query (own tenant only, no spill-over ghosts)
    const { data: profiles } = await supabase
      .from('driver_profiles')
      .select('id, email, status')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    const driverIds = (profiles || []).map((p: any) => p.id);
    if (driverIds.length === 0) {
      return { drivers: [], totalCount: 0, legend: { green: 'Available', blue: 'On Trip', red: 'Offline', gray: 'Spill-Over (Partner)' } };
    }

    const { data: locations } = await supabase
      .from('driver_locations')
      .select('driver_id, latitude, longitude, updated_at')
      .in('driver_id', driverIds)
      .gte('updated_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());

    const locMap = new Map<string, any>();
    for (const loc of locations || []) {
      locMap.set(loc.driver_id, loc);
    }

    const drivers = (profiles || [])
      .filter((p: any) => locMap.has(p.id))
      .map((p: any) => {
        const loc = locMap.get(p.id);
        return {
          driverId: p.id,
          driverName: p.email || 'Driver',
          lat: Number(loc.latitude),
          lng: Number(loc.longitude),
          status: p.status,
          isGhost: false,
          category: 'economy',
          color: this.getDriverColor(p.status),
          updatedAt: loc.updated_at,
        };
      });

    return {
      drivers,
      totalCount: drivers.length,
      legend: { green: 'Available', blue: 'On Trip', red: 'Offline', gray: 'Spill-Over (Partner)' },
    };
  }

  // ── M11.8: Alerts Center ────────────────────────────────────────────────

  @Get(':tenantId/alerts')
  @ApiOperation({ summary: 'M11.8: Dashboard alerts center' })
  @ApiResponse({ status: 200, description: 'Alerts list' })
  async getAlerts(
    @Param('tenantId') tenantId: string,
    @Query('unread_only') unreadOnly?: string,
    @Query('limit') limit?: number,
  ) {
    return this.vipAnalytics.getAlerts(tenantId, unreadOnly === 'true', limit || 50);
  }

  @Post(':tenantId/alerts/:alertId/read')
  @ApiOperation({ summary: 'M11.8: Mark alert as read' })
  @ApiResponse({ status: 200, description: 'Alert marked as read' })
  async markAlertRead(@Param('alertId') alertId: string) {
    await this.vipAnalytics.markAlertRead(alertId);
    return { success: true };
  }

  @Post(':tenantId/alerts/:alertId/incentive')
  @ApiOperation({ summary: 'M11.8: Send incentive discount code to at-risk VIPs' })
  @ApiResponse({ status: 201, description: 'Discount code created and sent' })
  async sendIncentive(
    @Param('tenantId') tenantId: string,
    @Param('alertId') alertId: string,
    @Body() body: {
      target_rider_ids: string[];
      discount_type: 'fixed' | 'percentage';
      discount_cents?: number;
      discount_percent?: number;
      max_discount_cents?: number;
      valid_days?: number;
    },
  ) {
    return this.vipAnalytics.sendIncentive({
      tenantId,
      alertId,
      targetRiderIds: body.target_rider_ids,
      discountType: body.discount_type,
      discountCents: body.discount_cents,
      discountPercent: body.discount_percent,
      maxDiscountCents: body.max_discount_cents,
      validDays: body.valid_days,
    });
  }

  @Get(':tenantId/discount-codes')
  @ApiOperation({ summary: 'M11.8: List active discount codes' })
  @ApiResponse({ status: 200, description: 'Active discount codes for tenant' })
  async listDiscountCodes(@Param('tenantId') tenantId: string) {
    return this.vipAnalytics.listDiscountCodes(tenantId);
  }

  // ── M5.10: Commercial Profile Control Panel ─────────────────────────────

  @Get(':tenantId/commercial-profile')
  @ApiOperation({ summary: 'M5.10: Get tenant commercial profile (fees & settings)' })
  @ApiResponse({ status: 200, description: 'Commercial profile with editable and read-only fields' })
  async getCommercialProfile(@Param('tenantId') tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_onboarding')
      .select(`
        revenue_share_bps,
        per_ride_fee_cents,
        min_platform_fee_cents,
        base_monthly_fee_cents_prepaid,
        per_driver_fee_cents,
        max_subsidy_limit_cents,
        vip_enrollment_threshold,
        vip_retention_days,
        driver_share_bps,
        status
      `)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return { error: 'Commercial profile not found' };
    }

    return {
      editable: {
        max_subsidy_limit_cents: data.max_subsidy_limit_cents,
        vip_enrollment_threshold: data.vip_enrollment_threshold,
        vip_retention_days: data.vip_retention_days,
        driver_share_bps: data.driver_share_bps,
        per_driver_fee_cents: data.per_driver_fee_cents,
      },
      readonly: {
        platform_fee_bps: data.revenue_share_bps,
        per_ride_fee_cents: data.per_ride_fee_cents,
        min_platform_fee_cents: data.min_platform_fee_cents,
        base_monthly_fee_cents_prepaid: data.base_monthly_fee_cents_prepaid,
      },
      status: data.status,
      labels: {
        currency: 'USD ($)',
        distance: 'Miles',
      },
    };
  }

  @Put(':tenantId/commercial-profile')
  @ApiOperation({ summary: 'M5.10: Update tenant self-service settings (guardrailed)' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateCommercialProfile(
    @Param('tenantId') tenantId: string,
    @Body() body: {
      max_subsidy_limit_cents?: number;
      vip_enrollment_threshold?: number;
      vip_retention_days?: number;
      driver_share_bps?: number;
      per_driver_fee_cents?: number;
    },
  ) {
    const supabase = this.supabaseService.getClient();

    // Guardrail: Only allow self-service fields
    const allowedFields: Record<string, any> = {};
    if (body.max_subsidy_limit_cents !== undefined) {
      allowedFields.max_subsidy_limit_cents = Math.max(0, Math.min(body.max_subsidy_limit_cents, 1000000));
    }
    if (body.vip_enrollment_threshold !== undefined) {
      allowedFields.vip_enrollment_threshold = Math.max(1, Math.min(body.vip_enrollment_threshold, 100));
    }
    if (body.vip_retention_days !== undefined) {
      allowedFields.vip_retention_days = Math.max(7, Math.min(body.vip_retention_days, 365));
    }
    if (body.driver_share_bps !== undefined) {
      allowedFields.driver_share_bps = Math.max(0, Math.min(body.driver_share_bps, 10000));
    }
    if (body.per_driver_fee_cents !== undefined) {
      allowedFields.per_driver_fee_cents = Math.max(0, Math.min(body.per_driver_fee_cents, 100000));
    }

    if (Object.keys(allowedFields).length === 0) {
      return { error: 'No valid fields to update' };
    }

    const { data, error } = await supabase
      .from('tenant_onboarding')
      .update({ ...allowedFields, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .select('*')
      .single();

    if (error) {
      return { error: 'Failed to update settings: ' + error.message };
    }

    return {
      success: true,
      updated: allowedFields,
      note: 'platform_fee_bps remains read-only (editable only by UWD Global Admin)',
    };
  }

  // ── "Ask the Agent" — Natural Language Analytics ────────────────────────

  @Post(':tenantId/ask')
  @ApiOperation({ summary: 'AI: Ask the Agent — natural language analytics query' })
  @ApiResponse({ status: 200, description: 'Natural language answer with supporting data' })
  async askTheAgent(
    @Param('tenantId') tenantId: string,
    @Body() body: { question: string },
  ) {
    const question = (body.question || '').toLowerCase().trim();

    if (!question) {
      return { answer: 'Please ask a question about your business.' };
    }

    // Pattern-match common analytics questions and build data-driven answers
    const result = await this.resolveAgentQuery(tenantId, question);
    return result;
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private getDriverColor(status: string): string {
    switch (status) {
      case 'online': return 'green';
      case 'on_trip':
      case 'en_route_pickup': return 'blue';
      case 'spill_over': return 'gray';
      default: return 'red';
    }
  }

  /**
   * "Ask the Agent" query resolver.
   * Parses natural language questions and returns data-driven answers.
   */
  private async resolveAgentQuery(
    tenantId: string,
    question: string,
  ): Promise<{ answer: string; data?: any; query_type: string }> {
    // Revenue / spending questions
    if (question.includes('revenue') || question.includes('earn') || question.includes('made') || question.includes('income')) {
      const revenue = await this.tenantAnalytics.getRevenueSummary(tenantId);
      const grossDollars = (revenue.grossRevenueCents / 100).toFixed(2);
      const netDollars = (revenue.tenantNetCents / 100).toFixed(2);
      return {
        answer: `In the last 30 days, your gross revenue was $${grossDollars} USD across ${revenue.settledTrips30d} settled trips. After platform fees, your net revenue is $${netDollars} USD. Average fare: $${(revenue.avgFareCents / 100).toFixed(2)}.`,
        data: revenue,
        query_type: 'revenue',
      };
    }

    // VIP / subsidy questions
    if (question.includes('vip') || question.includes('subsid')) {
      const vip = await this.vipAnalytics.getVipPerformance(tenantId);
      const churn = await this.vipAnalytics.getVipChurnMetrics(tenantId);
      const subsidyDollars = (vip.totalSubsidyCents / 100).toFixed(2);
      const ltvDollars = (vip.totalLtvCents / 100).toFixed(2);
      return {
        answer: `You have ${vip.totalVips} VIP riders (${vip.platinumCount} Platinum, ${vip.goldCount} Gold, ${vip.silverCount} Silver). ${vip.atRiskVips} are at risk. Total VIP lifetime value: $${ltvDollars} USD. Total subsidies spent: $${subsidyDollars} USD (ROI: ${vip.subsidyRoi}x). 30-day churn rate: ${churn.churnRate30d}%.`,
        data: { vip, churn },
        query_type: 'vip',
      };
    }

    // Fleet / driver questions
    if (question.includes('fleet') || question.includes('driver') || question.includes('utiliz')) {
      const fleet = await this.tenantAnalytics.getFleetUtilization(tenantId);
      return {
        answer: `Your fleet has ${fleet.totalDrivers} active drivers. Currently: ${fleet.driversOnTrip} on trip, ${fleet.driversAvailable} available, ${fleet.driversOffline} offline. Fleet utilization: ${fleet.utilizationPct}%.`,
        data: fleet,
        query_type: 'fleet',
      };
    }

    // Service level / fulfillment questions
    if (question.includes('service') || question.includes('fulfillment') || question.includes('accept') || question.includes('wait')) {
      const sl = await this.tenantAnalytics.getServiceLevel(tenantId);
      const avgMinutes = (sl.avgAcceptanceSeconds / 60).toFixed(1);
      return {
        answer: `In the last 30 days: ${sl.totalTrips30d} total trips, ${sl.completedTrips30d} completed (${sl.fulfillmentRatePct}% fulfillment rate). Average time from rider request to driver acceptance: ${avgMinutes} minutes (${sl.avgAcceptanceSeconds} seconds).`,
        data: sl,
        query_type: 'service_level',
      };
    }

    // Spill-over / marketplace questions
    if (question.includes('spill') || question.includes('referral') || question.includes('marketplace') || question.includes('partner')) {
      const yield_ = await this.tenantAnalytics.getMarketplaceYield(tenantId);
      const revDollars = (yield_.referralRevenueCents / 100).toFixed(2);
      return {
        answer: `You sent ${yield_.totalReferralsSent} spill-over referrals, of which ${yield_.totalReferralsCompleted} were completed (${yield_.referralConversionPct}% conversion). Total referral revenue earned: $${revDollars} USD.`,
        data: yield_,
        query_type: 'marketplace_yield',
      };
    }

    // Alerts
    if (question.includes('alert') || question.includes('risk') || question.includes('warning')) {
      const alerts = await this.vipAnalytics.getAlerts(tenantId, true, 10);
      return {
        answer: `You have ${alerts.length} unread alert${alerts.length !== 1 ? 's' : ''}. ${alerts.length > 0 ? `Latest: "${alerts[0].title}"` : 'No active alerts.'}`,
        data: { alerts },
        query_type: 'alerts',
      };
    }

    // Discount codes
    if (question.includes('discount') || question.includes('coupon') || question.includes('incentive') || question.includes('promo')) {
      const codes = await this.vipAnalytics.listDiscountCodes(tenantId);
      return {
        answer: `You have ${codes.length} active discount code${codes.length !== 1 ? 's' : ''}. ${codes.length > 0 ? `Most recent: ${codes[0].code} (${codes[0].discountType === 'fixed' ? `$${((codes[0].discountCents || 0) / 100).toFixed(2)} off` : `${codes[0].discountPercent}% off`})` : 'No active codes.'}`,
        data: { codes },
        query_type: 'discount_codes',
      };
    }

    // Generic / unrecognized → return full glance
    const glance = await this.tenantAnalytics.getBusinessAtAGlance(tenantId);
    const grossDollars = (glance.revenue.grossRevenueCents / 100).toFixed(2);
    return {
      answer: `Here's your business summary: ${glance.fleet.totalDrivers} drivers (${glance.fleet.utilizationPct}% utilized), ${glance.serviceLevel.completedTrips30d} completed trips in 30 days, $${grossDollars} USD gross revenue, ${glance.serviceLevel.fulfillmentRatePct}% fulfillment rate. Try asking about "VIP subsidies", "fleet utilization", "revenue", or "spill-over referrals" for more detail.`,
      data: glance,
      query_type: 'business_summary',
    };
  }
}
