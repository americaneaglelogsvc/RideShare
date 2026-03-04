import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class ConfigValidatorService implements OnModuleInit {
  private readonly logger = new Logger(ConfigValidatorService.name);
  private ajv: Ajv;
  private platformValidator: ValidateFunction | null = null;
  private tenantValidator: ValidateFunction | null = null;
  private policyValidator: ValidateFunction | null = null;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  onModuleInit() {
    this.loadSchemas();
  }

  private loadSchemas() {
    const schemasDir = path.resolve(__dirname, '../../../../Requirements/schemas');

    try {
      const platformSchema = JSON.parse(
        fs.readFileSync(path.join(schemasDir, 'platform_config.schema.json'), 'utf-8'),
      );
      this.platformValidator = this.ajv.compile(platformSchema);
      this.logger.log('Loaded platform_config schema');
    } catch (e: any) {
      this.logger.warn(`Could not load platform_config schema: ${e.message}`);
    }

    try {
      const tenantSchema = JSON.parse(
        fs.readFileSync(path.join(schemasDir, 'tenant_config.schema.json'), 'utf-8'),
      );
      this.tenantValidator = this.ajv.compile(tenantSchema);
      this.logger.log('Loaded tenant_config schema');
    } catch (e: any) {
      this.logger.warn(`Could not load tenant_config schema: ${e.message}`);
    }

    try {
      const policySchema = JSON.parse(
        fs.readFileSync(path.join(schemasDir, 'tenant_policy_config.schema.json'), 'utf-8'),
      );
      this.policyValidator = this.ajv.compile(policySchema);
      this.logger.log('Loaded tenant_policy_config schema');
    } catch (e: any) {
      this.logger.warn(`Could not load tenant_policy_config schema: ${e.message}`);
    }
  }

  validatePlatformConfig(config: Record<string, unknown>): ConfigValidationResult {
    if (!this.platformValidator) {
      return { valid: true, errors: ['Schema not loaded — validation skipped'] };
    }

    const valid = this.platformValidator(config) as boolean;
    const errors = valid
      ? []
      : (this.platformValidator.errors || []).map(
          (e) => `${e.instancePath || '/'} ${e.message}`,
        );

    return { valid, errors };
  }

  validateTenantConfig(config: Record<string, unknown>): ConfigValidationResult {
    if (!this.tenantValidator) {
      return { valid: true, errors: ['Schema not loaded — validation skipped'] };
    }

    const valid = this.tenantValidator(config) as boolean;
    const errors = valid
      ? []
      : (this.tenantValidator.errors || []).map(
          (e) => `${e.instancePath || '/'} ${e.message}`,
        );

    return { valid, errors };
  }

  validatePolicyConfig(config: Record<string, unknown>): ConfigValidationResult {
    if (!this.policyValidator) {
      return { valid: true, errors: ['Schema not loaded — validation skipped'] };
    }

    const valid = this.policyValidator(config) as boolean;
    const errors = valid
      ? []
      : (this.policyValidator.errors || []).map(
          (e) => `${e.instancePath || '/'} ${e.message}`,
        );

    return { valid, errors };
  }

  validateOrThrow(type: 'platform' | 'tenant' | 'policy', config: Record<string, unknown>): void {
    let result: ConfigValidationResult;

    switch (type) {
      case 'platform':
        result = this.validatePlatformConfig(config);
        break;
      case 'tenant':
        result = this.validateTenantConfig(config);
        break;
      case 'policy':
        result = this.validatePolicyConfig(config);
        break;
    }

    if (!result.valid) {
      throw new BadRequestException({
        message: `${type} config validation failed`,
        errors: result.errors,
      });
    }
  }
}
