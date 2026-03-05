import {
  Controller, Get, Post, Body, Req, UseGuards,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformTermsService } from '../services/platform-terms.service';
import { SkipTermsCheck } from '../guards/terms-acceptance.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly platformTermsService: PlatformTermsService) {}

  @Get('terms')
  @SkipTermsCheck()
  @ApiOperation({ summary: 'Get current platform ToS text and version' })
  @ApiResponse({ status: 200, description: 'Current ToS returned' })
  getTerms() {
    return {
      version: this.platformTermsService.getLatestTermsVersion(),
      text: this.platformTermsService.getTermsText(),
    };
  }

  @Post('terms/accept')
  @SkipTermsCheck()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tenant accepts the current UWD Platform Terms of Service' })
  @ApiResponse({ status: 200, description: 'Acceptance recorded with timestamp and IP' })
  async acceptTerms(
    @Req() req: ExpressRequest & { tenantId?: string; user?: any },
    @Body() body: { accepted_by?: string },
  ) {
    const tenantId = req.tenantId as string;
    const acceptedBy = body?.accepted_by || req.user?.email || req.user?.id || 'unknown';
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    const record = await this.platformTermsService.recordAcceptance(
      tenantId,
      acceptedBy,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      message: `Platform ToS ${record.termsVersion} accepted.`,
      accepted_at: record.acceptedAt,
      terms_version: record.termsVersion,
      accepted_by: record.acceptedBy,
    };
  }

  @Get('terms/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if tenant has accepted the current ToS' })
  @ApiResponse({ status: 200, description: 'Acceptance status' })
  async termsStatus(@Req() req: ExpressRequest & { tenantId?: string }) {
    const tenantId = req.tenantId as string;
    const currentVersion = this.platformTermsService.getLatestTermsVersion();
    const accepted = await this.platformTermsService.hasAccepted(tenantId);

    return {
      tenant_id: tenantId,
      current_version: currentVersion,
      accepted,
      action_required: !accepted ? 'POST /onboarding/terms/accept' : null,
    };
  }

  @Get('terms/audit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full ToS acceptance audit trail for this tenant' })
  @ApiResponse({ status: 200, description: 'Audit records returned' })
  async termsAudit(@Req() req: ExpressRequest & { tenantId?: string }) {
    const tenantId = req.tenantId as string;
    const records = await this.platformTermsService.getAcceptanceAudit(tenantId);
    return { tenant_id: tenantId, records };
  }
}
