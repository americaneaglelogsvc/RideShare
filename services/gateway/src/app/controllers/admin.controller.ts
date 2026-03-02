import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from '../services/admin.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
