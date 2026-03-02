import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { BillingCronService } from '../services/billing-cron.service';
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
}
