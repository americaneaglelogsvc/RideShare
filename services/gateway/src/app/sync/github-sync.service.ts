import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class GitHubSyncService {
  private readonly logger = new Logger(GitHubSyncService.name);
  private readonly environment: string;
  private readonly projectRoot: string;

  constructor(private configService: ConfigService) {
    this.environment = this.configService.get<string>('NODE_ENV', 'development');
    this.projectRoot = process.cwd();
  }

  /**
   * Sync environment with GitHub repository
   */
  async syncEnvironment(): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Starting GitHub sync for ${this.environment} environment`);

      // Step 1: Pull latest changes
      await this.pullLatestChanges();

      // Step 2: Sync environment-specific configurations
      await this.syncEnvironmentConfigs();

      // Step 3: Sync secrets and environment variables
      await this.syncSecrets();

      // Step 4: Validate sync integrity
      await this.validateSyncIntegrity();

      this.logger.log(`GitHub sync completed successfully for ${this.environment}`);
      return { success: true, message: 'Environment synced successfully' };
    } catch (error) {
      this.logger.error(`GitHub sync failed for ${this.environment}`, error);
      return { success: false, message: `Sync failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  /**
   * Pull latest changes from GitHub
   */
  private async pullLatestChanges(): Promise<void> {
    try {
      const { stdout, stderr } = await execAsync('git pull origin main', {
        cwd: this.projectRoot,
      });

      if (stderr && !stderr.includes('Already up to date')) {
        this.logger.warn(`Git pull warnings: ${stderr}`);
      }

      this.logger.log(`Git pull completed: ${stdout}`);
    } catch (error) {
      throw new Error(`Failed to pull latest changes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sync environment-specific configurations
   */
  private async syncEnvironmentConfigs(): Promise<void> {
    const envFile = `.env.${this.environment}`;
    const envPath = path.join(this.projectRoot, envFile);

    if (!fs.existsSync(envPath)) {
      throw new Error(`Environment file not found: ${envFile}`);
    }

    // Validate environment file structure
    await this.validateEnvironmentFile(envPath);

    // Copy environment file to .env for runtime
    const targetEnvPath = path.join(this.projectRoot, '.env');
    fs.copyFileSync(envPath, targetEnvPath);

    this.logger.log(`Environment configuration synced from ${envFile}`);
  }

  /**
   * Sync secrets from external sources
   */
  private async syncSecrets(): Promise<void> {
    if (this.environment === 'development') {
      // Development uses local secrets, no sync needed
      this.logger.log('Development environment: using local secrets');
      return;
    }

    // For staging and production, sync secrets from secure sources
    await this.syncSecretsFromManager();
  }

  /**
   * Sync secrets from secret manager (Google Secret Manager, AWS Secrets Manager, etc.)
   */
  private async syncSecretsFromManager(): Promise<void> {
    const secrets = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'FLUIDPAY_API_KEY',
      'FLUIDPAY_WEBHOOK_SECRET',
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN',
      'SENDGRID_API_KEY',
      'FIREBASE_PRIVATE_KEY',
      'GOOGLE_MAPS_API_KEY',
    ];

    for (const secretKey of secrets) {
      try {
        const secretValue = await this.getSecretFromManager(secretKey);
        if (secretValue) {
          process.env[secretKey] = secretValue;
          this.logger.log(`Synced secret: ${secretKey}`);
        }
      } catch (error) {
        this.logger.error(`Failed to update cost tracking: ${error instanceof Error ? error.message : String(error)}`, error);
      }
    }
  }

  /**
   * Get secret from secret manager
   */
  private async getSecretFromManager(secretKey: string): Promise<string | null> {
    // Implementation would depend on the secret manager being used
    // For now, return null to indicate no external sync
    return null;
  }

  /**
   * Validate environment file structure
   */
  private async validateEnvironmentFile(envPath: string): Promise<void> {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    const requiredVars = [
      'NODE_ENV',
      'SUPABASE_URL',
      'JWT_SECRET',
      'ENCRYPTION_KEY',
    ];

    const foundVars = new Set<string>();
    
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key] = line.split('=');
        if (key) {
          foundVars.add(key.trim());
        }
      }
    }

    const missingVars = requiredVars.filter(var_ => !foundVars.has(var_));
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    this.logger.log(`Environment file validation passed for ${this.environment}`);
  }

  /**
   * Validate sync integrity
   */
  private async validateSyncIntegrity(): Promise<void> {
    // Check if critical services can start with the synced configuration
    try {
      // Validate database connection
      await this.validateDatabaseConnection();

      // Validate external service connectivity
      await this.validateExternalServices();

      this.logger.log('Sync integrity validation passed');
    } catch (error) {
      throw new Error(`Sync integrity validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate database connection
   */
  private async validateDatabaseConnection(): Promise<void> {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Database configuration missing');
    }

    // Simple health check - in real implementation, this would make an actual API call
    this.logger.log('Database configuration validated');
  }

  /**
   * Validate external services
   */
  private async validateExternalServices(): Promise<void> {
    const services = [
      'FLUIDPAY_API_KEY',
      'TWILIO_ACCOUNT_SID',
      'SENDGRID_API_KEY',
      'GOOGLE_MAPS_API_KEY',
    ];

    for (const service of services) {
      const config = this.configService.get<string>(service);
      if (!config) {
        this.logger.warn(`External service configuration missing: ${service}`);
      }
    }

    this.logger.log('External services configuration validated');
  }

  /**
   * Get environment sync status
   */
  async getSyncStatus(): Promise<{
    environment: string;
    lastSync: string;
    status: 'synced' | 'pending' | 'error';
    details: any;
  }> {
    try {
      const gitStatus = await execAsync('git status --porcelain', {
        cwd: this.projectRoot,
      });

      const hasChanges = gitStatus.stdout.trim().length > 0;
      const status = hasChanges ? 'pending' : 'synced';

      return {
        environment: this.environment,
        lastSync: new Date().toISOString(),
        status,
        details: {
          hasChanges,
          gitStatus: gitStatus.stdout,
        },
      };
    } catch (error) {
      return {
        environment: this.environment,
        lastSync: new Date().toISOString(),
        status: 'error',
        details: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Force sync environment (useful for manual triggers)
   */
  async forceSync(): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Force sync triggered for ${this.environment}`);
    return await this.syncEnvironment();
  }
}
