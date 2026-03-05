import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * SecretManagerService — CANONICAL §1.9 GCP-ARCH-0001 "Secrets: Secret Manager"
 *
 * Reads secrets from GCP Secret Manager in production/staging,
 * falls back to .env variables in local dev.
 *
 * Usage:
 *   const dbPassword = await this.secretManager.getSecret('PG_PASSWORD');
 */
@Injectable()
export class SecretManagerService implements OnModuleInit {
  private readonly logger = new Logger(SecretManagerService.name);
  private client: any = null;
  private projectId: string;
  private cache = new Map<string, { value: string; expiresAt: number }>();
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly configService: ConfigService) {
    this.projectId = this.configService.get<string>('GCP_PROJECT_ID', 'rideoo-487904');
  }

  async onModuleInit() {
    const useSecretManager = this.configService.get<string>('USE_SECRET_MANAGER', 'false');
    if (useSecretManager === 'true') {
      try {
        const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
        this.client = new SecretManagerServiceClient();
        this.logger.log(`Secret Manager initialized for project ${this.projectId}`);
      } catch (err: any) {
        this.logger.warn(`Secret Manager SDK not available: ${err.message}. Using .env fallback.`);
      }
    } else {
      this.logger.log('Secret Manager disabled (USE_SECRET_MANAGER != true). Using .env fallback.');
    }
  }

  /**
   * Get a secret value. Checks GCP Secret Manager first (if enabled),
   * then falls back to environment variables.
   */
  async getSecret(name: string, defaultValue?: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(name);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Try Secret Manager
    if (this.client) {
      try {
        const secretName = `projects/${this.projectId}/secrets/${name}/versions/latest`;
        const [version] = await this.client.accessSecretVersion({ name: secretName });
        const value = version.payload?.data?.toString() || '';
        this.cache.set(name, { value, expiresAt: Date.now() + this.cacheTtlMs });
        return value;
      } catch (err: any) {
        this.logger.warn(`Secret Manager lookup failed for ${name}: ${err.message}. Falling back to env.`);
      }
    }

    // Fallback to environment variable
    const envValue = this.configService.get<string>(name);
    if (envValue !== undefined) {
      return envValue;
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    this.logger.warn(`Secret "${name}" not found in Secret Manager or environment.`);
    return '';
  }

  /**
   * Check if Secret Manager is active (vs .env fallback).
   */
  isActive(): boolean {
    return this.client !== null;
  }

  /**
   * Invalidate a cached secret (force re-fetch on next access).
   */
  invalidateCache(name?: string) {
    if (name) {
      this.cache.delete(name);
    } else {
      this.cache.clear();
    }
  }
}
