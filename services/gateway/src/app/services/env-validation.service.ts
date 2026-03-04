import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';

interface EnvCheck {
  key: string;
  required: boolean;
  source: 'env' | 'vault' | 'config_file' | 'default';
}

@Injectable()
export class EnvValidationService implements OnModuleInit {
  private readonly logger = new Logger(EnvValidationService.name);

  private readonly checks: EnvCheck[] = [
    { key: 'VITE_SUPABASE_URL', required: true, source: 'env' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', required: true, source: 'env' },
    { key: 'VITE_SUPABASE_ANON_KEY', required: true, source: 'env' },
    { key: 'JWT_SECRET', required: true, source: 'env' },
    { key: 'FLUIDPAY_API_KEY', required: false, source: 'env' },
    { key: 'FCM_SERVER_KEY', required: false, source: 'env' },
    { key: 'AWS_ACCESS_KEY_ID', required: false, source: 'env' },
    { key: 'AWS_SECRET_ACCESS_KEY', required: false, source: 'env' },
    { key: 'SENDGRID_API_KEY', required: false, source: 'env' },
    { key: 'TWILIO_ACCOUNT_SID', required: false, source: 'env' },
    { key: 'TWILIO_AUTH_TOKEN', required: false, source: 'env' },
    { key: 'NODE_ENV', required: false, source: 'env' },
    { key: 'PORT', required: false, source: 'env' },
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {}

  async onModuleInit() {
    const results = this.validateAll();
    const missing = results.filter(r => r.required && !r.isSet);

    if (missing.length > 0) {
      this.logger.error(
        `CRITICAL: Missing required env vars: ${missing.map(m => m.key).join(', ')}`,
      );
    }

    const optional = results.filter(r => !r.required && !r.isSet);
    if (optional.length > 0) {
      this.logger.warn(
        `Optional env vars not set: ${optional.map(m => m.key).join(', ')}`,
      );
    }

    const setCount = results.filter(r => r.isSet).length;
    this.logger.log(`Env validation: ${setCount}/${results.length} vars configured (${missing.length} critical missing)`);

    // Log audit to DB (non-blocking)
    this.logAudit(results).catch(() => {});
  }

  validateAll(): Array<EnvCheck & { isSet: boolean; value?: string }> {
    return this.checks.map(check => {
      const value = this.configService.get<string>(check.key);
      return {
        ...check,
        isSet: !!value && value.trim().length > 0,
      };
    });
  }

  getStatus() {
    const results = this.validateAll();
    const missing = results.filter(r => r.required && !r.isSet);
    const optional = results.filter(r => !r.required && !r.isSet);

    return {
      healthy: missing.length === 0,
      total: results.length,
      configured: results.filter(r => r.isSet).length,
      missingRequired: missing.map(m => m.key),
      missingOptional: optional.map(m => m.key),
    };
  }

  private async logAudit(results: Array<EnvCheck & { isSet: boolean }>) {
    try {
      const supabase = this.supabaseService.getClient();

      const rows = results.map(r => ({
        config_key: r.key,
        is_set: r.isSet,
        source: r.source,
        checked_at: new Date().toISOString(),
      }));

      await supabase.from('env_config_audit').insert(rows);
    } catch (e: any) {
      this.logger.debug(`Env audit log skipped: ${e.message}`);
    }
  }
}
