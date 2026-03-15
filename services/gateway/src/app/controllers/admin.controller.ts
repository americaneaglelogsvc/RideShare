import { Controller, Post, Get, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { BillingCronService } from '../services/billing-cron.service';
import { TaxService } from '../services/tax.service';
import { RefundService } from '../services/refund.service';
import { MetricsService } from '../services/metrics.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { DistributionService } from '../services/distribution.service';
import { ParallelSessionService } from '../services/parallel-session.service';
import { DriverSocketGateway } from '../gateways/driver-socket.gateway';
import { DisputeService } from '../services/dispute.service';
import { GeoZoneService } from '../services/geozone.service';
import { ConsentService } from '../services/consent.service';
import { SupabaseService } from '../services/supabase.service';
import { JwtAuthGuard, Public } from '../guards/jwt-auth.guard';
import { AdminRateLimitGuard } from '../guards/rate-limit.guard';
import { IdempotencyGuard, IdempotencyInterceptor } from '../guards/idempotency.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly billingCronService: BillingCronService,
    private readonly taxService: TaxService,
    private readonly refundService: RefundService,
    private readonly metricsService: MetricsService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly distributionService: DistributionService,
    private readonly parallelSessionService: ParallelSessionService,
    private readonly driverSocketGateway: DriverSocketGateway,
    private readonly disputeService: DisputeService,
    private readonly geoZoneService: GeoZoneService,
    private readonly consentService: ConsentService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // ── Ops Console Endpoints ──

  @Public()
  @Get('trips/live')
  @ApiOperation({ summary: 'Get live/active trips for the ops console' })
  @ApiResponse({ status: 200, description: 'Live trip list' })
  async getLiveTrips() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('trips')
      .select('id, status, pickup_address, dropoff_address, rider_id, driver_id, created_at, updated_at, riders(name), drivers(first_name, last_name)')
      .in('status', ['requested', 'assigned', 'active', 'en_route_pickup', 'arrived_pickup', 'en_route_dropoff'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return [];
    return data || [];
  }

  @Public()
  @Get('alerts')
  @ApiOperation({ summary: 'Get system alerts for the ops console' })
  @ApiResponse({ status: 200, description: 'Alert list' })
  async getAlerts() {
    // Query recent trip anomalies (trips stuck >10 min in requested state)
    const supabase = this.supabaseService.getClient();
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: stuckTrips } = await supabase
      .from('trips')
      .select('id, status, created_at')
      .eq('status', 'requested')
      .lt('created_at', tenMinAgo)
      .limit(10);

    const alerts: any[] = [];
    (stuckTrips || []).forEach((t: any) => {
      alerts.push({
        id: t.id,
        severity: 'warning',
        message: `Trip ${t.id.slice(0, 8)} stuck in 'requested' for >10 minutes`,
        time: t.created_at,
      });
    });

    return alerts;
  }

  @Public()
  @Get('drivers/statuses')
  @ApiOperation({ summary: 'Get all driver statuses' })
  @ApiResponse({ status: 200, description: 'Driver status list' })
  async getDriverStatuses() {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('driver_profiles')
      .select('id, first_name, last_name, status, rating, tenant_id')
      .order('status', { ascending: true })
      .limit(100);
    return data || [];
  }

  @Public()
  @Get('metrics/realtime')
  @ApiOperation({ summary: 'Get real-time platform metrics' })
  @ApiResponse({ status: 200, description: 'Real-time metrics' })
  async getRealtimeMetrics() {
    const supabase = this.supabaseService.getClient();
    const [trips, drivers, riders] = await Promise.all([
      supabase.from('trips').select('id', { count: 'exact', head: true }).in('status', ['active', 'assigned']),
      supabase.from('driver_profiles').select('id', { count: 'exact', head: true }).eq('status', 'online'),
      supabase.from('riders').select('id', { count: 'exact', head: true }),
    ]);

    return {
      activeTrips: trips.count || 0,
      onlineDrivers: drivers.count || 0,
      totalRiders: riders.count || 0,
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants with stats' })
  @ApiResponse({ status: 200, description: 'Enriched tenant list' })
  async listTenants() {
    const supabase = this.supabaseService.getClient();
    const { data: tenants } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (!tenants || tenants.length === 0) return [];

    // Enrich each tenant with real driver/trip counts
    const enriched = await Promise.all(
      tenants.map(async (t: any) => {
        const [driverRes, tripRes] = await Promise.all([
          supabase
            .from('driver_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', t.id),
          supabase
            .from('trips')
            .select('id, fare_cents', { count: 'exact' })
            .eq('tenant_id', t.id),
        ]);

        const driverCount = driverRes.count || 0;
        const tripCount = tripRes.count || 0;
        const revenueCents = (tripRes.data || []).reduce(
          (sum: number, trip: any) => sum + (trip.fare_cents || 0),
          0,
        );

        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          owner_email: t.owner_email,
          owner_name: t.owner_name,
          is_active: t.is_active,
          is_suspended: t.is_suspended,
          billing_status: t.billing_status,
          created_at: t.created_at,
          // Enriched stats — real DB values
          driver_count: driverCount,
          trip_count: tripCount,
          revenue_cents: revenueCents,
        };
      }),
    );

    return enriched;
  }

  @Public()
  @Get('jobs/stats')
  @ApiOperation({ summary: 'Get job queue statistics' })
  @ApiResponse({ status: 200, description: 'Job queue stats returned' })
  async getJobStats() {
    return {
      active: 0,
      pending: 0,
      failed: 0,
      completed: 0,
      dlq_size: 0,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  @Post('tenants/:tenantId/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminRateLimitGuard)
  @Roles('PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Suspend a tenant (kill-switch)' })
  @ApiResponse({ status: 200, description: 'Tenant suspended' })
  async suspendTenant(
    @Param('tenantId') tenantId: string,
    @Body() body: { reason: string }
  ) {
    return this.adminService.suspendTenant(tenantId, body.reason);
  }

  @Post('tenants/:tenantId/reinstate')
  @ApiOperation({ summary: 'Reinstate a suspended tenant' })
  @ApiResponse({ status: 200, description: 'Tenant reinstated' })
  async reinstateTenant(@Param('tenantId') tenantId: string) {
    return this.adminService.reinstateTenant(tenantId);
  }

  @Post('drivers/:identityId/suspend')
  @ApiOperation({ summary: 'Suspend a driver identity globally' })
  @ApiResponse({ status: 200, description: 'Driver identity suspended' })
  async suspendDriver(
    @Param('identityId') identityId: string,
    @Body() body: { reason: string }
  ) {
    return this.adminService.suspendDriverIdentity(identityId, body.reason);
  }

  @Post('drivers/:identityId/reinstate')
  @ApiOperation({ summary: 'Reinstate a suspended driver identity' })
  @ApiResponse({ status: 200, description: 'Driver identity reinstated' })
  async reinstateDriver(@Param('identityId') identityId: string) {
    return this.adminService.reinstateDriverIdentity(identityId);
  }

  @Get('ops/ledger')
  @ApiOperation({ summary: 'Global ledger view with filters' })
  @ApiResponse({ status: 200, description: 'Ledger entries' })
  async getLedger(
    @Query('tenant_id') tenantId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getGlobalLedger({ tenantId, startDate, endDate, limit });
  }

  @Get('ops/volume')
  @ApiOperation({ summary: 'Active trip volume by tenant' })
  @ApiResponse({ status: 200, description: 'Volume data' })
  async getVolume() {
    return this.adminService.getVolumeMonitor();
  }

  @Get('ops/settlement-watch')
  @ApiOperation({ summary: 'Transactions stuck PENDING_BANK_SETTLEMENT >48h' })
  @ApiResponse({ status: 200, description: 'Settlement watch data' })
  async getSettlementWatch() {
    return this.adminService.getSettlementWatch();
  }

  @Get('ops/parallel-sessions')
  @ApiOperation({ summary: 'M9.1: Driver identities with simultaneous multi-tenant sessions' })
  @ApiResponse({ status: 200, description: 'Parallel session data' })
  async getParallelSessions() {
    return this.adminService.getParallelSessionMonitor();
  }

  @Get('ops/liquidity')
  @ApiOperation({ summary: 'M9.1: Daily liquidity report (fares vs fees vs net)' })
  @ApiResponse({ status: 200, description: 'Liquidity report' })
  async getLiquidity(
    @Query('date') date?: string,
    @Query('tenant_id') tenantId?: string,
  ) {
    return this.adminService.getLiquidityReport({ date, tenantId });
  }

  @Get('ops/settlement-aging')
  @ApiOperation({ summary: 'M9.1: Settlement aging buckets (<24h, 24-48h, >48h, >72h)' })
  @ApiResponse({ status: 200, description: 'Settlement aging detail' })
  async getSettlementAging() {
    return this.adminService.getSettlementAging();
  }

  @Get('ops/billing')
  @ApiOperation({ summary: 'M5.2: Billing overview (failed, upcoming)' })
  @ApiResponse({ status: 200, description: 'Billing overview' })
  async getBillingOverview() {
    return this.adminService.getBillingOverview();
  }

  @Post('ops/billing/:tenantId/retry')
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'M5.2: Retry failed billing for a tenant' })
  @ApiResponse({ status: 200, description: 'Billing retry initiated' })
  async retryBilling(@Param('tenantId') tenantId: string) {
    return this.billingCronService.retryBilling(tenantId);
  }

  // ── M5.3: Tax & Refund ─────────────────────────────────────────────

  @Post('tax/generate/:taxYear')
  @ApiOperation({ summary: 'M5.3: Generate 1099-K summaries for a tax year' })
  @ApiResponse({ status: 200, description: 'Tax summaries generated' })
  async generateTaxSummaries(@Param('taxYear') taxYear: string) {
    return this.taxService.generate1099KSummaries(parseInt(taxYear, 10));
  }

  @Get('tax/:taxYear/candidates')
  @ApiOperation({ summary: 'M5.3: List driver identities requiring 1099-K' })
  @ApiResponse({ status: 200, description: '1099-K candidates' })
  async get1099KCandidates(@Param('taxYear') taxYear: string) {
    return this.taxService.get1099KCandidates(parseInt(taxYear, 10));
  }

  @Get('tax/:taxYear/driver/:identityId')
  @ApiOperation({ summary: 'M5.3: Get tax summary for a driver identity' })
  @ApiResponse({ status: 200, description: 'Driver tax summary' })
  async getDriverTaxSummary(
    @Param('taxYear') taxYear: string,
    @Param('identityId') identityId: string,
  ) {
    return this.taxService.getDriverTaxSummary(parseInt(taxYear, 10), identityId);
  }

  @Post('refunds')
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'M5.3: Initiate a multi-step refund' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  async initiateRefund(
    @Body() body: {
      tenant_id: string;
      trip_id: string;
      payment_id?: string;
      amount_cents: number;
      reason: string;
      initiated_by: string;
      platform_fee_refundable?: boolean;
    },
  ) {
    return this.refundService.initiateRefund({
      tenantId: body.tenant_id,
      tripId: body.trip_id,
      paymentId: body.payment_id,
      amountCents: body.amount_cents,
      reason: body.reason,
      initiatedBy: body.initiated_by,
      platformFeeRefundable: body.platform_fee_refundable,
    });
  }

  @Get('refunds/:tenantId')
  @ApiOperation({ summary: 'M5.3: Get refund history for a tenant' })
  @ApiResponse({ status: 200, description: 'Refund list' })
  async getRefundHistory(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: number,
  ) {
    return this.refundService.getRefundHistory(tenantId, limit || 50);
  }

  // ── M9.2: Observability ────────────────────────────────────────────

  @Get('ops/metrics')
  @ApiOperation({ summary: 'M9.2: Latest system metrics snapshot' })
  @ApiResponse({ status: 200, description: 'Metrics snapshot' })
  async getMetrics() {
    return this.metricsService.getLatestMetrics();
  }

  @Get('ops/metrics/:name/timeseries')
  @ApiOperation({ summary: 'M9.2: Metric time-series (last N hours)' })
  @ApiResponse({ status: 200, description: 'Time-series data' })
  async getMetricTimeSeries(
    @Param('name') name: string,
    @Query('hours') hours?: number,
  ) {
    return this.metricsService.getMetricTimeSeries(name, hours || 24);
  }

  @Get('ops/status')
  @ApiOperation({ summary: 'M9.2: Global system status page' })
  @ApiResponse({ status: 200, description: 'Global status' })
  async getGlobalStatus() {
    return this.metricsService.getGlobalStatus();
  }

  @Get('ops/circuit-breaker')
  @ApiOperation({ summary: 'M9.2: PaySurity circuit breaker state' })
  @ApiResponse({ status: 200, description: 'Circuit breaker state' })
  async getCircuitBreakerState() {
    return this.circuitBreakerService.getState();
  }

  // ── M5.4: Distribution ───────────────────────────────────────────────

  @Post('distribution/settle')
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'M5.4: Execute settlement split for a trip' })
  @ApiResponse({ status: 200, description: 'Settlement split executed' })
  async executeSettlementSplit(
    @Body() body: { settlement_transaction_id: string; trip_id: string },
  ) {
    return this.distributionService.executeSettlementSplit(
      body.settlement_transaction_id,
      body.trip_id,
    );
  }

  @Get('distribution/:tenantId')
  @ApiOperation({ summary: 'M5.4: Get distribution history for a tenant' })
  @ApiResponse({ status: 200, description: 'Distribution history' })
  async getDistributionHistory(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit?: number,
  ) {
    return this.distributionService.getDistributionHistory(tenantId, limit || 50);
  }

  @Get('distribution/driver/:identityId/revenue')
  @ApiOperation({ summary: 'M5.4: Driver revenue summary across all tenants' })
  @ApiResponse({ status: 200, description: 'Driver revenue summary' })
  async getDriverRevenue(
    @Param('identityId') identityId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.distributionService.getDriverRevenueSummary(identityId, startDate, endDate);
  }

  // ── M9.3: Parallel Session Monitor ───────────────────────────────────

  @Get('ops/parallel-rides')
  @ApiOperation({ summary: 'M9.3: Parallel multi-tenant ride overlap report' })
  @ApiResponse({ status: 200, description: 'Parallel session report' })
  async getParallelRideReport(@Query('limit') limit?: number) {
    return this.parallelSessionService.getParallelSessionReport({ limit: limit || 100 });
  }

  // ── M6.2: Socket Connection Stats ────────────────────────────────────

  @Get('ops/socket-stats')
  @ApiOperation({ summary: 'M6.2: Live WebSocket connection statistics' })
  @ApiResponse({ status: 200, description: 'Socket connection stats' })
  async getSocketStats() {
    return this.driverSocketGateway.getConnectionStats();
  }

  // ── M5.5: Dispute & Chargeback ─────────────────────────────────────────

  @Get('disputes/summary')
  @ApiOperation({ summary: 'M5.5: Active dispute summary across all tenants' })
  @ApiResponse({ status: 200, description: 'Dispute summary' })
  async getDisputeSummary() {
    return this.disputeService.getDisputeSummary();
  }

  @Get('disputes/:tenantId')
  @ApiOperation({ summary: 'M5.5: List disputes for a tenant' })
  @ApiResponse({ status: 200, description: 'Dispute list' })
  async listDisputes(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: number,
  ) {
    return this.disputeService.listDisputes(tenantId, status, limit || 50);
  }

  @Post('disputes/:disputeId/evidence')
  @ApiOperation({ summary: 'M5.5: Submit evidence for a dispute' })
  @ApiResponse({ status: 200, description: 'Evidence submitted' })
  async submitDisputeEvidence(
    @Param('disputeId') disputeId: string,
    @Body() body: { additional_evidence?: Record<string, any> },
  ) {
    return this.disputeService.submitEvidence(disputeId, body.additional_evidence);
  }

  @Post('disputes/:disputeId/resolve')
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'M5.5: Resolve a dispute (won/lost/expired)' })
  @ApiResponse({ status: 200, description: 'Dispute resolved' })
  async resolveDispute(
    @Param('disputeId') disputeId: string,
    @Body() body: { resolution: 'won' | 'lost' | 'expired'; notes?: string },
  ) {
    return this.disputeService.resolveDispute(disputeId, body.resolution, body.notes);
  }

  // ── M7.3: Geo Zones ────────────────────────────────────────────────────

  @Post('geozones/:tenantId')
  @ApiOperation({ summary: 'M7.3: Create a pricing geo zone for a tenant' })
  @ApiResponse({ status: 201, description: 'Geo zone created' })
  async createGeoZone(
    @Param('tenantId') tenantId: string,
    @Body() body: {
      zone_name: string;
      zone_type: string;
      boundary_geojson: any;
      price_multiplier: number;
      per_mile_rate_cents?: number;
      base_fare_override_cents?: number;
      surge_floor?: number;
      surge_cap?: number;
    },
  ) {
    return this.geoZoneService.createZone({
      tenantId,
      zoneName: body.zone_name,
      zoneType: body.zone_type,
      boundaryGeoJson: body.boundary_geojson,
      priceMultiplier: body.price_multiplier,
      perMileRateCents: body.per_mile_rate_cents,
      baseFareOverrideCents: body.base_fare_override_cents,
      surgeFloor: body.surge_floor,
      surgeCap: body.surge_cap,
    });
  }

  @Get('geozones/:tenantId')
  @ApiOperation({ summary: 'M7.3: List active geo zones for a tenant' })
  @ApiResponse({ status: 200, description: 'Geo zone list' })
  async listGeoZones(@Param('tenantId') tenantId: string) {
    return this.geoZoneService.listZones(tenantId);
  }

  @Get('geozones/:tenantId/pricing')
  @ApiOperation({ summary: 'M7.3: Get zone-aware pricing for a location' })
  @ApiResponse({ status: 200, description: 'Zone pricing result' })
  async getZonePricing(
    @Param('tenantId') tenantId: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('category') category?: string,
  ) {
    return this.geoZoneService.calculateZonePricing(
      tenantId,
      parseFloat(lat),
      parseFloat(lng),
      category || 'economy',
    );
  }

  // ── M12.3: Consent & PII ───────────────────────────────────────────────

  @Post('consent/sign')
  @ApiOperation({ summary: 'M12.3: Record a driver consent signature' })
  @ApiResponse({ status: 201, description: 'Consent recorded' })
  async signConsent(
    @Body() body: {
      tenant_id: string;
      driver_identity_id: string;
      driver_profile_id: string;
      document_type: string;
      document_version: string;
      document_content: string;
      ip_address?: string;
      user_agent?: string;
    },
  ) {
    return this.consentService.signAgreement({
      tenantId: body.tenant_id,
      driverIdentityId: body.driver_identity_id,
      driverProfileId: body.driver_profile_id,
      documentType: body.document_type,
      documentVersion: body.document_version,
      documentContent: body.document_content,
      ipAddress: body.ip_address,
      userAgent: body.user_agent,
    });
  }

  @Get('consent/:tenantId/:identityId')
  @ApiOperation({ summary: 'M12.3: Get consent records for a driver' })
  @ApiResponse({ status: 200, description: 'Consent records' })
  async getDriverConsents(
    @Param('tenantId') tenantId: string,
    @Param('identityId') identityId: string,
  ) {
    return this.consentService.getDriverConsents(tenantId, identityId);
  }

  @Get('consent/:consentId/verify')
  @ApiOperation({ summary: 'M12.3: Verify cryptographic signature integrity' })
  @ApiResponse({ status: 200, description: 'Signature verification result' })
  async verifySignature(@Param('consentId') consentId: string) {
    return this.consentService.verifySignature(consentId);
  }

  @Post('ops/pii-mask')
  @ApiOperation({ summary: 'M12.3: Trigger PII masking for trips >2yr (manual)' })
  @ApiResponse({ status: 200, description: 'PII masking result' })
  async triggerPiiMasking() {
    return this.consentService.maskOldTripPii();
  }
}
