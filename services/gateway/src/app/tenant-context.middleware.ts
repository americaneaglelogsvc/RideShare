import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
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
    if (req.path === '/health' || req.path.startsWith('/api')) {
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

    req.tenantId = tenantId;
    next();
  }
}
