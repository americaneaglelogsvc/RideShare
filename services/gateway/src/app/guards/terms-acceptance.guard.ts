import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformTermsService } from '../services/platform-terms.service';

export const SKIP_TERMS_CHECK = 'skipTermsCheck';

/**
 * TermsAcceptanceGuard — CANONICAL OB-LEGAL-001
 *
 * Blocks all tenant API calls until the current tenant has accepted the
 * current version of the UWD Platform Terms of Service.
 *
 * Exempted routes (decorated with @SkipTermsCheck()):
 *   - POST /onboarding/terms/accept
 *   - GET  /onboarding/terms
 *   - POST /auth/login, /auth/register
 *   - GET  /health
 */
@Injectable()
export class TermsAcceptanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly platformTermsService: PlatformTermsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TERMS_CHECK, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const request = context.switchToHttp().getRequest();
    const tenantId: string | undefined = request.headers['x-tenant-id'] || request.user?.tenantId;

    if (!tenantId) return true;

    const accepted = await this.platformTermsService.hasAccepted(tenantId);
    if (!accepted) {
      throw new ForbiddenException({
        error_code: 'TERMS_NOT_ACCEPTED',
        message:
          'Tenant must accept the UWD Platform Terms of Service before accessing the platform.',
        action: 'POST /onboarding/terms/accept',
        terms_url: '/onboarding/terms',
      });
    }

    return true;
  }
}
