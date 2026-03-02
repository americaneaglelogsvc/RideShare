import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

/**
 * IdentityService — Global driver identity + tenant-scoped profile resolution.
 *
 * Contract: auth_user_id → driver_identity → driver_profile(tenant_id)
 */
@Injectable()
export class IdentityService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Resolve (or create) a driver_identity from the Supabase auth user id.
   */
  async resolveIdentity(authUserId: string, email?: string): Promise<{ id: string }> {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('driver_identities')
      .select('id')
      .eq('auth_user_id', authUserId)
      .single();

    if (existing) return { id: existing.id };

    const { data: created, error } = await supabase
      .from('driver_identities')
      .insert({ auth_user_id: authUserId, email: email ?? 'unknown@legacy' })
      .select('id')
      .single();

    if (error || !created) {
      throw new NotFoundException(`Failed to create driver identity for auth user ${authUserId}`);
    }
    return { id: created.id };
  }

  /**
   * Resolve (or create) a tenant-scoped driver_profile for the given identity + tenant.
   */
  async resolveProfile(
    tenantId: string,
    driverIdentityId: string,
    defaults?: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<{ id: string; status: string; isActive: boolean }> {
    const supabase = this.supabaseService.getClient();

    const { data: existing } = await supabase
      .from('driver_profiles')
      .select('id, status, is_active')
      .eq('tenant_id', tenantId)
      .eq('driver_identity_id', driverIdentityId)
      .single();

    if (existing) {
      return { id: existing.id, status: existing.status, isActive: existing.is_active };
    }

    const { data: created, error } = await supabase
      .from('driver_profiles')
      .insert({
        tenant_id: tenantId,
        driver_identity_id: driverIdentityId,
        first_name: defaults?.firstName,
        last_name: defaults?.lastName,
        phone: defaults?.phone,
      })
      .select('id, status, is_active')
      .single();

    if (error || !created) {
      throw new NotFoundException(
        `Failed to create driver profile for identity ${driverIdentityId} in tenant ${tenantId}`,
      );
    }
    return { id: created.id, status: created.status, isActive: created.is_active };
  }

  /**
   * Full contract validation: auth_user → identity → profile for tenant.
   * Returns { identityId, profileId } or throws.
   */
  async validateContract(
    authUserId: string,
    tenantId: string,
  ): Promise<{ identityId: string; profileId: string }> {
    const identity = await this.resolveIdentity(authUserId);

    const supabase = this.supabaseService.getClient();
    const { data: profile } = await supabase
      .from('driver_profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('driver_identity_id', identity.id)
      .single();

    if (!profile) {
      throw new ForbiddenException(
        `Driver identity ${identity.id} has no profile for tenant ${tenantId}. ` +
        'Register with this tenant first.',
      );
    }

    return { identityId: identity.id, profileId: profile.id };
  }
}
