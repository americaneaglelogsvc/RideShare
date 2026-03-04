import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { PayoutService } from '../services/payout.service';

@ApiTags('payouts')
@Controller('tenants/:tenantId/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get('config')
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Get payout configuration for tenant' })
  async getConfig(@Param('tenantId') tenantId: string) {
    return this.payoutService.getPayoutConfig(tenantId);
  }

  @Put('config')
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Update payout configuration' })
  async updateConfig(
    @Param('tenantId') tenantId: string,
    @Body() updates: Record<string, unknown>,
  ) {
    return this.payoutService.updatePayoutConfig(tenantId, updates);
  }

  @Get('fee-schedules')
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS')
  @ApiOperation({ summary: 'List all fee schedule tiers' })
  async listFeeSchedules() {
    return this.payoutService.listFeeSchedules();
  }

  @Get('fee-schedule')
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Get fee schedule assigned to this tenant' })
  async getTenantFeeSchedule(@Param('tenantId') tenantId: string) {
    return this.payoutService.getTenantFeeSchedule(tenantId);
  }

  @Get('preview')
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Preview bulk payout (eligible drivers + amounts)' })
  async previewBulkPayout(@Param('tenantId') tenantId: string) {
    return this.payoutService.previewBulkPayout(tenantId);
  }

  @Post('execute')
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Create and confirm a bulk payout batch' })
  async createBulkPayout(
    @Param('tenantId') tenantId: string,
    @Req() req: any,
  ) {
    return this.payoutService.createBulkPayout(tenantId, req.user.id);
  }

  @Post('batch/:batchId/process')
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Execute a confirmed payout batch' })
  async executeBatch(
    @Param('tenantId') tenantId: string,
    @Param('batchId') batchId: string,
  ) {
    return this.payoutService.executeBatch(tenantId, batchId);
  }

  @Get('driver/:driverId/history')
  @Roles('DRIVER', 'TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Get payout history for a driver' })
  async getDriverPayoutHistory(
    @Param('tenantId') tenantId: string,
    @Param('driverId') driverId: string,
    @Query('limit') limit?: number,
  ) {
    return this.payoutService.getDriverPayoutHistory(tenantId, driverId, limit ? Number(limit) : 50);
  }

  @Post('driver/:driverId/instant')
  @Roles('DRIVER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Instant cash-out for a driver' })
  async instantCashout(
    @Param('tenantId') tenantId: string,
    @Param('driverId') driverId: string,
  ) {
    return this.payoutService.instantCashout(tenantId, driverId);
  }

  @Post('driver/:driverId/adjustment')
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a clawback or bonus adjustment' })
  async createAdjustment(
    @Param('tenantId') tenantId: string,
    @Param('driverId') driverId: string,
    @Body() body: { amount_cents: number; reason: string; type: 'clawback' | 'bonus' },
  ) {
    return this.payoutService.createAdjustment(tenantId, driverId, body.amount_cents, body.reason, body.type);
  }

  @Get('dunning')
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS')
  @ApiOperation({ summary: 'Check dunning status for tenant' })
  async checkDunning(@Param('tenantId') tenantId: string) {
    return this.payoutService.checkDunning(tenantId);
  }

  @Post('invoices/generate')
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Generate an invoice for a billing period' })
  async generateInvoice(
    @Param('tenantId') tenantId: string,
    @Body() body: { period_start: string; period_end: string },
  ) {
    return this.payoutService.generateInvoice(tenantId, body.period_start, body.period_end);
  }

  @Get('reconciliation')
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS')
  @ApiOperation({ summary: 'Daily ledger reconciliation report' })
  async dailyReconciliation(
    @Param('tenantId') tenantId: string,
    @Query('date') date?: string,
  ) {
    return this.payoutService.dailyReconciliation(tenantId, date);
  }

  @Post('driver/:driverId/tax-doc')
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Generate tax document for a driver' })
  async generateTaxDoc(
    @Param('tenantId') tenantId: string,
    @Param('driverId') driverId: string,
    @Body() body: { tax_year: number; doc_type: string },
  ) {
    return this.payoutService.generateTaxDocument(tenantId, driverId, body.tax_year, body.doc_type);
  }

  @Post('consent')
  @Roles('RIDER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Record payment consent from rider' })
  async recordConsent(
    @Param('tenantId') tenantId: string,
    @Body() body: { rider_id: string; consent_type: string; granted: boolean },
    @Req() req: any,
  ) {
    return this.payoutService.recordPaymentConsent(tenantId, body.rider_id, body.consent_type, body.granted, {
      ip: req.ip,
      ua: req.headers['user-agent'],
    });
  }
}
