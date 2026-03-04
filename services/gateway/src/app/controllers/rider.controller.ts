import {
  Controller, Get, Post, Put, Patch, Body, Param, Query, Req,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.guard';
import { RiderDisputeService, CreateDisputeDto, ResolveDisputeDto } from '../services/rider-dispute.service';
import { LegalConsentService, GrantConsentDto, RevokeConsentDto } from '../services/legal-consent.service';
import { BookingAntifraudService } from '../services/booking-antifraud.service';
import { MessageRetentionService, UpdateRetentionConfigDto } from '../services/message-retention.service';

@ApiTags('rider')
@Controller('rider')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RiderController {
  constructor(
    private readonly disputeService: RiderDisputeService,
    private readonly consentService: LegalConsentService,
    private readonly antifraudService: BookingAntifraudService,
    private readonly retentionService: MessageRetentionService,
  ) {}

  // ── Disputes ──────────────────────────────────────────────────────

  @Post('disputes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'File a new dispute for a trip' })
  async createDispute(@Body() dto: CreateDisputeDto) {
    return this.disputeService.createDispute(dto);
  }

  @Get('disputes/mine')
  @ApiOperation({ summary: 'List disputes for the authenticated rider' })
  async myDisputes(
    @Query('riderId') riderId: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.disputeService.listDisputesForRider(riderId, tenantId);
  }

  @Get('disputes/tenant/:tenantId')
  @UseGuards(RolesGuard)
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'List all disputes for a tenant (admin)' })
  async tenantDisputes(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: string,
  ) {
    return this.disputeService.listDisputesForTenant(tenantId, status);
  }

  @Get('disputes/:disputeId')
  @ApiOperation({ summary: 'Get a single dispute' })
  async getDispute(
    @Param('disputeId') disputeId: string,
    @Req() req: any,
  ) {
    return this.disputeService.getDispute(disputeId, req.user?.sub);
  }

  @Patch('disputes/:disputeId/resolve')
  @UseGuards(RolesGuard)
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Resolve or escalate a dispute (admin)' })
  async resolveDispute(
    @Param('disputeId') disputeId: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputeService.resolveDispute(disputeId, dto);
  }

  @Get('disputes/stats/:tenantId')
  @UseGuards(RolesGuard)
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Get dispute statistics for a tenant' })
  async disputeStats(@Param('tenantId') tenantId: string) {
    return this.disputeService.getDisputeStats(tenantId);
  }

  // ── Legal Consent ─────────────────────────────────────────────────

  @Post('consent/grant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Grant a legal consent (terms, privacy, etc.)' })
  async grantConsent(@Body() dto: GrantConsentDto, @Req() req: any) {
    return this.consentService.grantConsent({
      ...dto,
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Post('consent/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a previously granted consent' })
  async revokeConsent(@Body() dto: RevokeConsentDto) {
    return this.consentService.revokeConsent(dto);
  }

  @Get('consent/:userId')
  @ApiOperation({ summary: 'Get all consents for a user' })
  async getUserConsents(@Param('userId') userId: string) {
    return this.consentService.getUserConsents(userId);
  }

  @Get('consent/:userId/active')
  @ApiOperation({ summary: 'Get active (non-revoked) consents' })
  async getActiveConsents(@Param('userId') userId: string) {
    return this.consentService.getActiveConsents(userId);
  }

  @Get('consent/:userId/check')
  @ApiOperation({ summary: 'Check if a specific consent is active' })
  async checkConsent(
    @Param('userId') userId: string,
    @Query('type') consentType: any,
    @Query('version') version: string,
  ) {
    const granted = await this.consentService.checkConsent(userId, consentType, version);
    return { granted };
  }

  @Get('consent/:userId/audit')
  @UseGuards(RolesGuard)
  @Roles('PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS')
  @ApiOperation({ summary: 'Get consent audit trail (admin)' })
  async consentAudit(@Param('userId') userId: string) {
    return this.consentService.getConsentAuditTrail(userId);
  }

  // ── Booking Anti-fraud ────────────────────────────────────────────

  @Post('antifraud/velocity-check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check booking velocity before allowing a ride request' })
  async velocityCheck(
    @Body() body: { tenantId: string; riderId: string; windowMinutes?: number; maxAttempts?: number },
  ) {
    return this.antifraudService.checkAndEnforceVelocity(
      body.tenantId, body.riderId, body.windowMinutes, body.maxAttempts,
    );
  }

  @Post('antifraud/flag')
  @UseGuards(RolesGuard)
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Flag a rider account for suspicious activity' })
  async flagAccount(
    @Body() body: { tenantId: string; riderId: string; metadata?: Record<string, unknown> },
  ) {
    return this.antifraudService.flagAccount(body.tenantId, body.riderId, body.metadata);
  }

  @Get('antifraud/stats/:tenantId/:riderId')
  @UseGuards(RolesGuard)
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Get velocity stats for a rider (admin)' })
  async velocityStats(
    @Param('tenantId') tenantId: string,
    @Param('riderId') riderId: string,
    @Query('windowMinutes') windowMinutes?: string,
  ) {
    return this.antifraudService.getVelocityStats(
      tenantId, riderId, windowMinutes ? parseInt(windowMinutes, 10) : 60,
    );
  }

  // ── Message Retention ─────────────────────────────────────────────

  @Get('retention/:tenantId')
  @UseGuards(RolesGuard)
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Get message retention config for a tenant' })
  async getRetentionConfig(@Param('tenantId') tenantId: string) {
    return this.retentionService.getConfig(tenantId);
  }

  @Put('retention/:tenantId')
  @UseGuards(RolesGuard)
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Update message retention config for a tenant' })
  async updateRetentionConfig(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateRetentionConfigDto,
  ) {
    return this.retentionService.upsertConfig(tenantId, dto);
  }
}
