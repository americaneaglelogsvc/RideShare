/**
 * @file tenant-context.middleware.ts
 * @req TEN-BASE-0001 — Multi-tenant isolation (tenant_id on all entities)
 * @req GCP-ARCH-0002 — Tenant microsite domains + TLS (domain→tenantId lookup)
 */
import { Injectable, NestMiddleware, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SupabaseService } from './services/supabase.service';

export type TenantRequest = Request & {
  tenantId?: string;
  driverIdentityId?: string;
  driverProfileId?: string;
};

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly supabaseService: SupabaseService) {}

  async use(req: TenantRequest, _res: Response, next: NextFunction) {
    if (req.path === '/health') {
      return next();
    }

    let tenantId: string | undefined;

    const host = req.hostname;
    if (host && host !== 'localhost' && !host.match(/^(\d+\.){3}\d+$/)) {
      try {
        const supabase = this.supabaseService.getClient();
        const { data } = await supabase
          .from('tenant_domain_mappings')
          .select('tenant_id')
          .eq('host', host)
          .single();
        if (data?.tenant_id) {
          tenantId = data.tenant_id;
        }
      } catch {
        // Domain mapping lookup failed or Supabase unavailable; fall through to header
      }
    }

    if (!tenantId) {
      tenantId = req.header('x-tenant-id');
    }

    if (!tenantId) {
      throw new BadRequestException(
        'Tenant context required. Provide x-tenant-id header or use a mapped domain.'
      );
    }

    // Kill-switch: check if tenant is suspended
    try {
      const supabase = this.supabaseService.getClient();
      const { data: tenant } = await supabase
        .from('tenants')
        .select('is_suspended, suspension_reason')
        .eq('id', tenantId)
        .single();

      if (tenant?.is_suspended) {
        throw new HttpException(
          `Tenant suspended: ${tenant.suspension_reason || 'Contact support.'}`,
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    } catch (e) {
      if (e instanceof HttpException) throw e;
      // If tenant lookup fails (e.g. Supabase unavailable), allow request to proceed
    }

    // C3: Compliance Gatekeeper — block dispatch if tenant onboarding is not ACTIVE
    const dispatchPaths = ['/dispatch/dispatch-ride', '/dispatch/find-drivers'];
    const isDispatchRoute = dispatchPaths.some(p => req.path.startsWith(p));

    if (isDispatchRoute) {
      try {
        const supabase = this.supabaseService.getClient();
        const { data: onboarding } = await supabase
          .from('tenant_onboarding')
          .select('status')
          .eq('tenant_id', tenantId)
          .single();

        if (!onboarding || onboarding.status !== 'ACTIVE') {
          throw new HttpException(
            `Dispatch blocked: tenant onboarding status is '${onboarding?.status || 'UNKNOWN'}'. Only ACTIVE tenants may dispatch rides.`,
            HttpStatus.FORBIDDEN,
          );
        }
      } catch (e) {
        if (e instanceof HttpException) throw e;
        // If lookup fails, allow request (fail-open for availability)
      }
    }

    req.tenantId = tenantId;
    next();
  }
}
