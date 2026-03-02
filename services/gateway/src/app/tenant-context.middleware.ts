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
    if (req.path === '/health' || req.path.startsWith('/api') || req.path.startsWith('/webhooks')) {
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

    req.tenantId = tenantId;
    next();
  }
}
