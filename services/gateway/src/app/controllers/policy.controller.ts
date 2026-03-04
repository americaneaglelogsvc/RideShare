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
import { PolicyService, CreatePolicyDto, UpdatePolicyDto } from '../services/policy.service';

@ApiTags('policies')
@Controller('tenants/:tenantId/policies')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @Post()
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new policy draft' })
  @ApiResponse({ status: 201, description: 'Draft created' })
  async createDraft(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreatePolicyDto,
    @Req() req: any,
  ) {
    return this.policyService.createDraft(tenantId, req.user.id, dto);
  }

  @Put(':policyId')
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Update an existing draft policy' })
  @ApiResponse({ status: 200, description: 'Draft updated' })
  async updateDraft(
    @Param('tenantId') tenantId: string,
    @Param('policyId') policyId: string,
    @Body() dto: UpdatePolicyDto,
    @Req() req: any,
  ) {
    return this.policyService.updateDraft(tenantId, policyId, req.user.id, dto);
  }

  @Post(':policyId/publish')
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Publish a draft policy (archives current published version)' })
  @ApiResponse({ status: 200, description: 'Policy published' })
  async publish(
    @Param('tenantId') tenantId: string,
    @Param('policyId') policyId: string,
    @Req() req: any,
  ) {
    return this.policyService.publish(tenantId, policyId, req.user.id);
  }

  @Post(':policyType/rollback')
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Rollback to previous published version' })
  @ApiResponse({ status: 200, description: 'Policy rolled back' })
  async rollback(
    @Param('tenantId') tenantId: string,
    @Param('policyType') policyType: string,
    @Req() req: any,
  ) {
    return this.policyService.rollback(tenantId, policyType, req.user.id);
  }

  @Get()
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'TENANT_DISPATCHER', 'PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS')
  @ApiOperation({ summary: 'List all policies for a tenant' })
  @ApiResponse({ status: 200, description: 'Policies list' })
  async listPolicies(
    @Param('tenantId') tenantId: string,
    @Query('status') status?: string,
  ) {
    return this.policyService.listPolicies(tenantId, status);
  }

  @Get('active/:policyType')
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'TENANT_DISPATCHER', 'DRIVER', 'PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS')
  @ApiOperation({ summary: 'Get the currently active (published) policy of a given type' })
  @ApiResponse({ status: 200, description: 'Active policy or null' })
  async getActivePolicy(
    @Param('tenantId') tenantId: string,
    @Param('policyType') policyType: string,
  ) {
    return this.policyService.getActivePolicy(tenantId, policyType);
  }

  @Get('history/:policyType')
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Get version history for a policy type' })
  @ApiResponse({ status: 200, description: 'Version history' })
  async getPolicyHistory(
    @Param('tenantId') tenantId: string,
    @Param('policyType') policyType: string,
  ) {
    return this.policyService.getPolicyHistory(tenantId, policyType);
  }

  @Get('diff/:policyType')
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Diff two versions of a policy' })
  @ApiResponse({ status: 200, description: 'Diff result' })
  async diffVersions(
    @Param('tenantId') tenantId: string,
    @Param('policyType') policyType: string,
    @Query('v1') v1: number,
    @Query('v2') v2: number,
  ) {
    return this.policyService.diffVersions(tenantId, policyType, Number(v1), Number(v2));
  }

  @Get('audit')
  @Roles('TENANT_OWNER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Get policy audit log for tenant' })
  @ApiResponse({ status: 200, description: 'Audit log entries' })
  async getAuditLog(
    @Param('tenantId') tenantId: string,
    @Query('policyId') policyId?: string,
  ) {
    return this.policyService.getAuditLog(tenantId, policyId);
  }
}

@ApiTags('jurisdiction-templates')
@Controller('jurisdiction-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JurisdictionTemplateController {
  constructor(private readonly policyService: PolicyService) {}

  @Get()
  @ApiOperation({ summary: 'List jurisdiction templates' })
  @ApiResponse({ status: 200, description: 'Templates list' })
  async getTemplates(
    @Query('jurisdiction') jurisdiction?: string,
    @Query('policyType') policyType?: string,
  ) {
    return this.policyService.getJurisdictionTemplates(jurisdiction, policyType);
  }
}
