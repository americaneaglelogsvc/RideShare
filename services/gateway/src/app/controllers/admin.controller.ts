import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { BillingCronService } from '../services/billing-cron.service';
import { TaxService } from '../services/tax.service';
import { RefundService } from '../services/refund.service';
import { MetricsService } from '../services/metrics.service';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminRateLimitGuard } from '../guards/rate-limit.guard';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminRateLimitGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly billingCronService: BillingCronService,
    private readonly taxService: TaxService,
    private readonly refundService: RefundService,
    private readonly metricsService: MetricsService,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  @Post('tenants/:tenantId/suspend')
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
}
