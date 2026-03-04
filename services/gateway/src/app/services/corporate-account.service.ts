import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface CreateCorporateAccountDto {
  tenantId: string;
  companyName: string;
  billingEmail: string;
  billingAddress?: Record<string, any>;
  taxId?: string;
  paymentMethodId?: string;
  monthlyBudgetCents?: number;
  perTripLimitCents?: number;
  allowedCategories?: string[];
  requireApproval?: boolean;
  adminUserId: string;
}

export interface AddEmployeeDto {
  corporateAccountId: string;
  tenantId: string;
  userId: string;
  employeeEmail: string;
  employeeName?: string;
  role?: 'admin' | 'manager' | 'employee';
  monthlyLimitCents?: number;
}

export interface TripApprovalDecisionDto {
  approvedBy: string;
  approved: boolean;
  rejectionReason?: string;
}

@Injectable()
export class CorporateAccountService {
  private readonly logger = new Logger(CorporateAccountService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ── Account CRUD ──────────────────────────────────────────────────

  async createAccount(dto: CreateCorporateAccountDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('corporate_accounts')
      .insert({
        tenant_id: dto.tenantId,
        company_name: dto.companyName,
        billing_email: dto.billingEmail,
        billing_address: dto.billingAddress || null,
        tax_id: dto.taxId || null,
        payment_method_id: dto.paymentMethodId || null,
        monthly_budget_cents: dto.monthlyBudgetCents || null,
        per_trip_limit_cents: dto.perTripLimitCents || null,
        allowed_categories: dto.allowedCategories || [],
        require_approval: dto.requireApproval || false,
        admin_user_id: dto.adminUserId,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Create corporate account failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    this.logger.log(`Corporate account ${data.id} created: ${dto.companyName}`);
    return data;
  }

  async getAccount(accountId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('corporate_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error || !data) throw new NotFoundException('Corporate account not found.');
    return data;
  }

  async listAccountsForTenant(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('corporate_accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async updateAccount(accountId: string, updates: Partial<CreateCorporateAccountDto>) {
    const supabase = this.supabaseService.getClient();

    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.companyName) payload.company_name = updates.companyName;
    if (updates.billingEmail) payload.billing_email = updates.billingEmail;
    if (updates.billingAddress) payload.billing_address = updates.billingAddress;
    if (updates.taxId) payload.tax_id = updates.taxId;
    if (updates.monthlyBudgetCents !== undefined) payload.monthly_budget_cents = updates.monthlyBudgetCents;
    if (updates.perTripLimitCents !== undefined) payload.per_trip_limit_cents = updates.perTripLimitCents;
    if (updates.allowedCategories) payload.allowed_categories = updates.allowedCategories;
    if (updates.requireApproval !== undefined) payload.require_approval = updates.requireApproval;

    const { data, error } = await supabase
      .from('corporate_accounts')
      .update(payload)
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async suspendAccount(accountId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('corporate_accounts')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', accountId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    this.logger.log(`Corporate account ${accountId} suspended`);
    return data;
  }

  // ── Employees ─────────────────────────────────────────────────────

  async addEmployee(dto: AddEmployeeDto) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('corporate_employees')
      .insert({
        corporate_account_id: dto.corporateAccountId,
        tenant_id: dto.tenantId,
        user_id: dto.userId,
        employee_email: dto.employeeEmail,
        employee_name: dto.employeeName || null,
        role: dto.role || 'employee',
        monthly_limit_cents: dto.monthlyLimitCents || null,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        throw new BadRequestException('Employee already added to this corporate account.');
      }
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async listEmployees(accountId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('corporate_employees')
      .select('*')
      .eq('corporate_account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async removeEmployee(employeeId: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('corporate_employees')
      .update({ is_active: false })
      .eq('id', employeeId);

    if (error) throw new BadRequestException(error.message);
    return { removed: true };
  }

  // ── Trip Approvals ────────────────────────────────────────────────

  async requestTripApproval(accountId: string, tenantId: string, tripId: string, employeeId: string, estimatedFareCents?: number) {
    const supabase = this.supabaseService.getClient();

    // Check if account requires approval
    const account = await this.getAccount(accountId);

    if (!account.require_approval) {
      // Auto-approve
      const { data, error } = await supabase
        .from('corporate_trip_approvals')
        .insert({
          corporate_account_id: accountId,
          tenant_id: tenantId,
          trip_id: tripId,
          employee_id: employeeId,
          status: 'auto_approved',
          approved_at: new Date().toISOString(),
          estimated_fare_cents: estimatedFareCents || null,
        })
        .select()
        .single();

      if (error) throw new BadRequestException(error.message);
      return data;
    }

    // Check per-trip budget limit
    if (account.per_trip_limit_cents && estimatedFareCents && estimatedFareCents > account.per_trip_limit_cents) {
      throw new ForbiddenException(`Estimated fare exceeds per-trip limit of $${(account.per_trip_limit_cents / 100).toFixed(2)}.`);
    }

    const { data, error } = await supabase
      .from('corporate_trip_approvals')
      .insert({
        corporate_account_id: accountId,
        tenant_id: tenantId,
        trip_id: tripId,
        employee_id: employeeId,
        status: 'pending',
        estimated_fare_cents: estimatedFareCents || null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async decideTripApproval(approvalId: string, decision: TripApprovalDecisionDto) {
    const supabase = this.supabaseService.getClient();

    const update: Record<string, any> = {
      approved_by: decision.approvedBy,
      approved_at: new Date().toISOString(),
    };

    if (decision.approved) {
      update.status = 'approved';
    } else {
      update.status = 'rejected';
      update.rejection_reason = decision.rejectionReason || null;
    }

    const { data, error } = await supabase
      .from('corporate_trip_approvals')
      .update(update)
      .eq('id', approvalId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async listPendingApprovals(accountId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('corporate_trip_approvals')
      .select('*')
      .eq('corporate_account_id', accountId)
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  // ── Statements ────────────────────────────────────────────────────

  async generateStatement(accountId: string, tenantId: string, periodStart: string, periodEnd: string) {
    const supabase = this.supabaseService.getClient();

    // Aggregate trip data for the period
    const { data: approvals } = await supabase
      .from('corporate_trip_approvals')
      .select('trip_id, estimated_fare_cents')
      .eq('corporate_account_id', accountId)
      .in('status', ['approved', 'auto_approved'])
      .gte('requested_at', periodStart)
      .lte('requested_at', periodEnd);

    const trips = approvals || [];
    const totalFare = trips.reduce((sum, t) => sum + (t.estimated_fare_cents || 0), 0);

    const { data, error } = await supabase
      .from('corporate_statements')
      .insert({
        corporate_account_id: accountId,
        tenant_id: tenantId,
        period_start: periodStart,
        period_end: periodEnd,
        total_trips: trips.length,
        total_fare_cents: totalFare,
        total_fees_cents: 0,
        grand_total_cents: totalFare,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async listStatements(accountId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('corporate_statements')
      .select('*')
      .eq('corporate_account_id', accountId)
      .order('period_start', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }
}
