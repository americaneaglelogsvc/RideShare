import { Controller, Post, Get, Put, Patch, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  TenantService,
  CreateTenantRequest,
  UpdateOnboardingChecklistRequest,
  SetCommercialTermsRequest,
  StaffReviewDecision,
} from '../services/tenant.service';
import { TenantRequest } from '../tenant-context.middleware';

@ApiTags('tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant (self-service)' })
  @ApiResponse({ status: 201, description: 'Tenant created with DRAFT onboarding' })
  async createTenant(@Body() request: CreateTenantRequest) {
    return this.tenantService.createTenant(request);
  }

  @Get()
  @ApiOperation({ summary: 'List all tenants (admin)' })
  @ApiResponse({ status: 200, description: 'Tenant list' })
  @ApiBearerAuth()
  async listTenants() {
    return this.tenantService.listTenants();
  }

  @Get(':tenantId/onboarding')
  @ApiOperation({ summary: 'Get onboarding status for a tenant' })
  @ApiResponse({ status: 200, description: 'Onboarding record' })
  @ApiBearerAuth()
  async getOnboarding(@Param('tenantId') tenantId: string) {
    return this.tenantService.getOnboarding(tenantId);
  }

  @Put(':tenantId/onboarding/checklist')
  @ApiOperation({ summary: 'Update onboarding checklist (tenant self-service)' })
  @ApiResponse({ status: 200, description: 'Checklist updated' })
  @ApiBearerAuth()
  async updateChecklist(
    @Param('tenantId') tenantId: string,
    @Body() updates: UpdateOnboardingChecklistRequest
  ) {
    return this.tenantService.updateChecklist(tenantId, updates);
  }

  @Post(':tenantId/onboarding/submit')
  @ApiOperation({ summary: 'Submit onboarding for staff review' })
  @ApiResponse({ status: 200, description: 'Onboarding submitted' })
  @ApiBearerAuth()
  async submitForReview(@Param('tenantId') tenantId: string) {
    return this.tenantService.submitForReview(tenantId);
  }

  @Patch(':tenantId/onboarding/commercial-terms')
  @ApiOperation({ summary: 'Set commercial terms (staff only)' })
  @ApiResponse({ status: 200, description: 'Commercial terms set' })
  @ApiBearerAuth()
  async setCommercialTerms(
    @Param('tenantId') tenantId: string,
    @Body() terms: SetCommercialTermsRequest
  ) {
    return this.tenantService.setCommercialTerms(tenantId, terms);
  }

  @Post(':tenantId/onboarding/review')
  @ApiOperation({ summary: 'Approve or reject onboarding (staff only)' })
  @ApiResponse({ status: 200, description: 'Review decision recorded' })
  @ApiBearerAuth()
  async reviewDecision(
    @Param('tenantId') tenantId: string,
    @Body() decision: StaffReviewDecision
  ) {
    return this.tenantService.reviewDecision(tenantId, decision);
  }

  @Post(':tenantId/activate')
  @ApiOperation({ summary: 'Activate tenant after approval' })
  @ApiResponse({ status: 200, description: 'Tenant activated' })
  @ApiBearerAuth()
  async activateTenant(@Param('tenantId') tenantId: string) {
    return this.tenantService.activateTenant(tenantId);
  }

  @Post(':tenantId/domain-mappings')
  @ApiOperation({ summary: 'Add a domain mapping for a tenant' })
  @ApiResponse({ status: 201, description: 'Domain mapping created' })
  @ApiBearerAuth()
  async addDomainMapping(
    @Param('tenantId') tenantId: string,
    @Body() body: { host: string }
  ) {
    return this.tenantService.addDomainMapping(tenantId, body.host);
  }
}
