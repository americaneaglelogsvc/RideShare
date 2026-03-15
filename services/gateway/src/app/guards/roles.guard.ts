/**
 * @file roles.guard.ts
 * @req TEN-BASE-0002 — RBAC + JWT RolesGuard (§2.4 Role taxonomy)
 * @test roles.guard.spec.ts
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../services/supabase.service';

export const ROLES_KEY = 'roles';

/**
 * Decorator: @Roles('PLATFORM_SUPER_ADMIN', 'TENANT_OWNER')
 * Attach to controller method or class to restrict access by role.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('No authenticated user on request');
    }

    const tenantId = request.headers['x-tenant-id'] || request.params?.tenantId;

    const userRoles = await this.resolveRoles(user.id, tenantId);

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Requires one of: [${requiredRoles.join(', ')}]. User has: [${userRoles.join(', ')}]`,
      );
    }

    request.user.resolvedRoles = userRoles;

    return true;
  }

  private async resolveRoles(userId: string, tenantId?: string): Promise<string[]> {
    const supabase = this.supabaseService.getClient();

    const query = supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (tenantId) {
      query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('RolesGuard: failed to resolve roles', error.message);
      return [];
    }

    return (data || []).map((r: { role: string }) => r.role);
  }
}
