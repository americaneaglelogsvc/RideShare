import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class AdminService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async suspendTenant(tenantId: string, reason: string) {
    const supabase = this.supabaseService.getClient();

    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('id, name, is_suspended')
      .eq('id', tenantId)
      .single();

    if (fetchError || !tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.is_suspended) {
      throw new BadRequestException('Tenant is already suspended');
    }

    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspension_reason: reason,
      })
      .eq('id', tenantId);

    if (updateError) {
      throw new BadRequestException('Failed to suspend tenant: ' + updateError.message);
    }

    await supabase
      .from('driver_profiles')
      .update({ is_active: false })
      .eq('tenant_id', tenantId);

    await supabase
      .from('trips')
      .update({ status: 'cancelled' })
      .eq('tenant_id', tenantId)
      .in('status', ['requested', 'assigned']);

    await supabase
      .from('ride_offers')
      .update({ status: 'cancelled' })
      .eq('tenant_id', tenantId)
      .eq('status', 'pending');

    return {
      success: true,
      message: `Tenant ${tenant.name} suspended. All profiles deactivated, open trips cancelled.`,
      tenantId,
    };
  }

  async reinstateTenant(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('tenants')
      .update({
        is_suspended: false,
        suspended_at: null,
        suspension_reason: null,
      })
      .eq('id', tenantId);

    if (error) {
      throw new BadRequestException('Failed to reinstate tenant');
    }

    return { success: true, message: 'Tenant reinstated. Profiles must be individually reactivated by staff.' };
  }

  async suspendDriverIdentity(identityId: string, reason: string) {
    const supabase = this.supabaseService.getClient();

    const { data: identity, error: fetchError } = await supabase
      .from('driver_identities')
      .select('id, email, is_suspended')
      .eq('id', identityId)
      .single();

    if (fetchError || !identity) {
      throw new NotFoundException('Driver identity not found');
    }

    if (identity.is_suspended) {
      throw new BadRequestException('Driver identity is already suspended');
    }

    const { error: updateError } = await supabase
      .from('driver_identities')
      .update({
        is_suspended: true,
        suspended_at: new Date().toISOString(),
        suspension_reason: reason,
      })
      .eq('id', identityId);

    if (updateError) {
      throw new BadRequestException('Failed to suspend driver identity');
    }

    await supabase
      .from('driver_profiles')
      .update({ is_active: false, status: 'suspended' })
      .eq('driver_identity_id', identityId);

    return {
      success: true,
      message: `Driver identity ${identity.email} suspended globally across all tenants.`,
      identityId,
    };
  }

  async reinstateDriverIdentity(identityId: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('driver_identities')
      .update({
        is_suspended: false,
        suspended_at: null,
        suspension_reason: null,
      })
      .eq('id', identityId);

    if (error) {
      throw new BadRequestException('Failed to reinstate driver identity');
    }

    return { success: true, message: 'Driver identity reinstated. Profiles must be individually reactivated.' };
  }

  async getGlobalLedger(filters?: { tenantId?: string; startDate?: string; endDate?: string; limit?: number }) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('ledger_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.tenantId) query = query.eq('tenant_id', filters.tenantId);
    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate);
    if (filters?.limit) query = query.limit(filters.limit);
    else query = query.limit(100);

    const { data, error } = await query;
    if (error) throw new BadRequestException('Failed to fetch ledger: ' + error.message);

    return { success: true, entries: data, count: data?.length || 0 };
  }

  async getVolumeMonitor() {
    const supabase = this.supabaseService.getClient();

    const { data: activeTrips } = await supabase
      .from('trips')
      .select('tenant_id, status')
      .in('status', ['requested', 'assigned', 'active']);

    const byTenant: Record<string, { requested: number; assigned: number; active: number }> = {};
    let total = 0;

    for (const trip of activeTrips || []) {
      if (!byTenant[trip.tenant_id]) {
        byTenant[trip.tenant_id] = { requested: 0, assigned: 0, active: 0 };
      }
      byTenant[trip.tenant_id][trip.status as 'requested' | 'assigned' | 'active']++;
      total++;
    }

    return { success: true, totalActiveTrips: total, byTenant };
  }

  async getSettlementWatch() {
    const supabase = this.supabaseService.getClient();
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: stuck, error } = await supabase
      .from('driver_payouts')
      .select('id, driver_id, tenant_id, amount_cents, settlement_status, created_at')
      .eq('settlement_status', 'PENDING_BANK_SETTLEMENT')
      .lte('created_at', cutoff);

    if (error) throw new BadRequestException('Failed to fetch settlement watch');

    return {
      success: true,
      stuckTransactions: stuck || [],
      count: stuck?.length || 0,
      message: `${stuck?.length || 0} transactions stuck PENDING_BANK_SETTLEMENT for >48 hours`,
    };
  }
}
