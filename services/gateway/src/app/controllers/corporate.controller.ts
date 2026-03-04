import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import {
  CorporateAccountService,
  CreateCorporateAccountDto,
  AddEmployeeDto,
  TripApprovalDecisionDto,
} from '../services/corporate-account.service';

@ApiTags('corporate')
@Controller('corporate')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CorporateController {
  constructor(private readonly corpService: CorporateAccountService) {}

  // ── Accounts ──────────────────────────────────────────────────────

  @Post('accounts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a corporate ride account' })
  async createAccount(@Body() dto: CreateCorporateAccountDto) {
    return this.corpService.createAccount(dto);
  }

  @Get('accounts/tenant/:tenantId')
  @UseGuards(RolesGuard)
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'List corporate accounts for a tenant' })
  async listAccounts(@Param('tenantId') tenantId: string) {
    return this.corpService.listAccountsForTenant(tenantId);
  }

  @Get('accounts/:accountId')
  @ApiOperation({ summary: 'Get a corporate account' })
  async getAccount(@Param('accountId') accountId: string) {
    return this.corpService.getAccount(accountId);
  }

  @Put('accounts/:accountId')
  @ApiOperation({ summary: 'Update a corporate account' })
  async updateAccount(
    @Param('accountId') accountId: string,
    @Body() updates: Partial<CreateCorporateAccountDto>,
  ) {
    return this.corpService.updateAccount(accountId, updates);
  }

  @Patch('accounts/:accountId/suspend')
  @UseGuards(RolesGuard)
  @Roles('TENANT_OWNER', 'TENANT_OPS_ADMIN', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Suspend a corporate account' })
  async suspendAccount(@Param('accountId') accountId: string) {
    return this.corpService.suspendAccount(accountId);
  }

  // ── Employees ─────────────────────────────────────────────────────

  @Post('accounts/:accountId/employees')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an employee to a corporate account' })
  async addEmployee(
    @Param('accountId') accountId: string,
    @Body() dto: Omit<AddEmployeeDto, 'corporateAccountId'>,
  ) {
    return this.corpService.addEmployee({ ...dto, corporateAccountId: accountId } as AddEmployeeDto);
  }

  @Get('accounts/:accountId/employees')
  @ApiOperation({ summary: 'List employees of a corporate account' })
  async listEmployees(@Param('accountId') accountId: string) {
    return this.corpService.listEmployees(accountId);
  }

  @Delete('employees/:employeeId')
  @ApiOperation({ summary: 'Deactivate an employee from a corporate account' })
  async removeEmployee(@Param('employeeId') employeeId: string) {
    return this.corpService.removeEmployee(employeeId);
  }

  // ── Trip Approvals ────────────────────────────────────────────────

  @Post('accounts/:accountId/trip-approvals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Request trip approval for a corporate employee' })
  async requestApproval(
    @Param('accountId') accountId: string,
    @Body() body: { tenantId: string; tripId: string; employeeId: string; estimatedFareCents?: number },
  ) {
    return this.corpService.requestTripApproval(
      accountId, body.tenantId, body.tripId, body.employeeId, body.estimatedFareCents,
    );
  }

  @Get('accounts/:accountId/trip-approvals/pending')
  @ApiOperation({ summary: 'List pending trip approvals' })
  async pendingApprovals(@Param('accountId') accountId: string) {
    return this.corpService.listPendingApprovals(accountId);
  }

  @Patch('trip-approvals/:approvalId')
  @ApiOperation({ summary: 'Approve or reject a trip approval request' })
  async decideApproval(
    @Param('approvalId') approvalId: string,
    @Body() decision: TripApprovalDecisionDto,
  ) {
    return this.corpService.decideTripApproval(approvalId, decision);
  }

  // ── Statements ────────────────────────────────────────────────────

  @Post('accounts/:accountId/statements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate a billing statement for a period' })
  async generateStatement(
    @Param('accountId') accountId: string,
    @Body() body: { tenantId: string; periodStart: string; periodEnd: string },
  ) {
    return this.corpService.generateStatement(accountId, body.tenantId, body.periodStart, body.periodEnd);
  }

  @Get('accounts/:accountId/statements')
  @ApiOperation({ summary: 'List billing statements for a corporate account' })
  async listStatements(@Param('accountId') accountId: string) {
    return this.corpService.listStatements(accountId);
  }
}
