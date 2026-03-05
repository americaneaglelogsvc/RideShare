import { Injectable, Logger } from '@nestjs/common';
import { FeatureGateService } from './feature-gate.service';

/**
 * BackgroundCheckService — CANONICAL §3.7 "Pluggable background check provider"
 *
 * Feature-gated stub with provider interface. Tenants can configure:
 *   - Provider: 'checkr', 'sterling', 'manual' (default)
 *   - Re-screening interval (months)
 *   - Required check types per vehicle category
 *
 * The 'manual' provider delegates to tenant ops for attestation review.
 */

export interface BackgroundCheckProvider {
  name: string;
  initiateCheck(driverId: string, checkTypes: string[]): Promise<BackgroundCheckResult>;
  getStatus(checkId: string): Promise<BackgroundCheckResult>;
}

export interface BackgroundCheckResult {
  checkId: string;
  status: 'pending' | 'clear' | 'consider' | 'failed' | 'expired';
  checkTypes: string[];
  completedAt?: string;
  expiresAt?: string;
  details?: Record<string, any>;
}

export interface BackgroundCheckConfig {
  provider: 'checkr' | 'sterling' | 'manual';
  rescreeningIntervalMonths: number;
  requiredChecks: {
    standard: string[];
    luxury: string[];
    nemt: string[];
  };
}

const DEFAULT_CONFIG: BackgroundCheckConfig = {
  provider: 'manual',
  rescreeningIntervalMonths: 12,
  requiredChecks: {
    standard: ['criminal', 'mvr', 'ssn_trace'],
    luxury: ['criminal', 'mvr', 'ssn_trace', 'drug_screen'],
    nemt: ['criminal', 'mvr', 'ssn_trace', 'drug_screen', 'medical_card'],
  },
};

@Injectable()
export class BackgroundCheckService {
  private readonly logger = new Logger(BackgroundCheckService.name);

  constructor(private readonly featureGateService: FeatureGateService) {}

  async isEnabled(tenantId: string): Promise<boolean> {
    return this.featureGateService.isEnabled('background_check_provider', { tenantId });
  }

  getConfig(): BackgroundCheckConfig {
    return { ...DEFAULT_CONFIG };
  }

  getRequiredChecks(vehicleCategory: string): string[] {
    const config = this.getConfig();
    switch (vehicleCategory) {
      case 'luxury': return config.requiredChecks.luxury;
      case 'nemt': return config.requiredChecks.nemt;
      default: return config.requiredChecks.standard;
    }
  }

  /**
   * Initiate a background check via the configured provider.
   * Currently only 'manual' provider is implemented.
   */
  async initiateCheck(
    tenantId: string,
    driverId: string,
    vehicleCategory: string,
  ): Promise<BackgroundCheckResult> {
    const enabled = await this.isEnabled(tenantId);
    const config = this.getConfig();
    const checkTypes = this.getRequiredChecks(vehicleCategory);

    if (!enabled || config.provider === 'manual') {
      this.logger.log(
        `Manual background check initiated: driver=${driverId} tenant=${tenantId} types=${checkTypes.join(',')}`,
      );
      return {
        checkId: `manual_${driverId}_${Date.now()}`,
        status: 'pending',
        checkTypes,
        details: { provider: 'manual', note: 'Requires tenant ops review and attestation' },
      };
    }

    // Future: integrate with Checkr/Sterling APIs here
    this.logger.log(
      `Background check initiated via ${config.provider}: driver=${driverId} types=${checkTypes.join(',')}`,
    );
    return {
      checkId: `${config.provider}_${driverId}_${Date.now()}`,
      status: 'pending',
      checkTypes,
    };
  }

  /**
   * Check if a driver's background check is due for re-screening.
   */
  isRescreeningDue(lastCheckDate: string): boolean {
    const config = this.getConfig();
    const lastCheck = new Date(lastCheckDate);
    const now = new Date();
    const monthsSince = (now.getFullYear() - lastCheck.getFullYear()) * 12 +
      (now.getMonth() - lastCheck.getMonth());
    return monthsSince >= config.rescreeningIntervalMonths;
  }
}
