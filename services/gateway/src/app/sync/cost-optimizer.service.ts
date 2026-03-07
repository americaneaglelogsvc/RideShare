import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CostOptimizerService {
  private readonly logger = new Logger(CostOptimizerService.name);
  private readonly environment: string;
  private readonly costTrackingFile: string;

  constructor(private configService: ConfigService) {
    this.environment = this.configService.get<string>('NODE_ENV', 'development');
    this.costTrackingFile = path.join(process.cwd(), 'logs', `cost-tracking-${this.environment}.json`);
  }

  /**
   * Main cost optimization scheduler - runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async optimizeCosts(): Promise<void> {
    try {
      this.logger.log(`Running cost optimization for ${this.environment} environment`);

      // Skip optimization for production
      if (this.environment === 'production') {
        this.logger.log('Skipping cost optimization for production environment');
        return;
      }

      // Check if auto-shutdown is enabled
      const autoShutdownEnabled = this.configService.get<boolean>('AUTO_SHUTDOWN_ENABLED', false);
      if (!autoShutdownEnabled) {
        this.logger.log('Auto-shutdown disabled, skipping optimization');
        return;
      }

      // Check if within shutdown schedule
      if (await this.isWithinShutdownSchedule()) {
        await this.executeShutdown();
      } else {
        await this.executeStartup();
      }

      // Update cost tracking
      await this.updateCostTracking();

    } catch (error) {
      this.logger.error(`Cost optimization failed: ${(error as Error).message}`, error);
    }
  }

  /**
   * Check if current time is within shutdown schedule
   */
  private async isWithinShutdownSchedule(): Promise<boolean> {
    const shutdownSchedule = this.configService.get<string>('SHUTDOWN_SCHEDULE', '0-6,22-23');
    const currentHour = new Date().getHours();

    // Parse schedule like "0-6,22-23" meaning midnight-6am and 10pm-11pm
    const ranges = shutdownSchedule.split(',');
    
    for (const range of ranges) {
      const [start, end] = range.split('-').map(Number);
      
      if (start <= end) {
        // Normal range like 0-6
        if (currentHour >= start && currentHour <= end) {
          return true;
        }
      } else {
        // Overnight range like 22-23 (should be handled as 22-23)
        if (currentHour >= start || currentHour <= end) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Execute shutdown procedures
   */
  private async executeShutdown(): Promise<void> {
    this.logger.log('Executing shutdown procedures');

    try {
      // Scale down Cloud Run instances to minimum
      await this.scaleDownServices();

      // Stop non-essential background jobs
      await this.stopBackgroundJobs();

      // Reduce monitoring frequency
      await this.reduceMonitoringFrequency();

      // Log shutdown event
      await this.logCostEvent('shutdown', 'Services scaled down for cost optimization');

    } catch (error) {
      this.logger.error(`Shutdown failed: ${(error as Error).message}`, error);
    }
  }

  /**
   * Execute startup procedures
   */
  private async executeStartup(): Promise<void> {
    this.logger.log('Executing startup procedures');

    try {
      // Scale up Cloud Run instances to normal levels
      await this.scaleUpServices();

      // Resume background jobs
      await this.resumeBackgroundJobs();

      // Restore normal monitoring
      await this.restoreMonitoringFrequency();

      // Log startup event
      await this.logCostEvent('startup', 'Services scaled up to normal operation');

    } catch (error) {
      this.logger.error(`Startup failed: ${(error as Error).message}`, error);
    }
  }

  /**
   * Scale down services for cost savings
   */
  private async scaleDownServices(): Promise<void> {
    if (this.environment === 'development') {
      // Development: scale to 0 instances
      this.logger.log('Development environment: scaling to 0 instances');
      return;
    }

    // Staging: scale to minimum instances
    const minInstances = this.configService.get<number>('MIN_INSTANCES', 1);
    this.logger.log(`Staging environment: scaling to ${minInstances} instances`);

    // In a real implementation, this would use GCP SDK to scale Cloud Run services
    // For now, we just log the action
  }

  /**
   * Scale up services for normal operation
   */
  private async scaleUpServices(): Promise<void> {
    if (this.environment === 'development') {
      // Development: scale to 1 instance for development
      this.logger.log('Development environment: scaling to 1 instance');
      return;
    }

    // Staging: scale to normal instances
    const normalInstances = this.configService.get<number>('MAX_INSTANCES', 10) / 2;
    this.logger.log(`Staging environment: scaling to ${normalInstances} instances`);

    // In a real implementation, this would use GCP SDK to scale Cloud Run services
  }

  /**
   * Stop non-essential background jobs
   */
  private async stopBackgroundJobs(): Promise<void> {
    const jobsToStop = [
      'analytics-processing',
      'report-generation',
      'data-cleanup',
      'backup-verification',
    ];

    for (const job of jobsToStop) {
      this.logger.log(`Stopping background job: ${job}`);
      // Implementation would stop actual job processes
    }
  }

  /**
   * Resume background jobs
   */
  private async resumeBackgroundJobs(): Promise<void> {
    const jobsToResume = [
      'analytics-processing',
      'report-generation',
      'data-cleanup',
      'backup-verification',
    ];

    for (const job of jobsToResume) {
      this.logger.log(`Resuming background job: ${job}`);
      // Implementation would resume actual job processes
    }
  }

  /**
   * Reduce monitoring frequency
   */
  private async reduceMonitoringFrequency(): Promise<void> {
    this.logger.log('Reducing monitoring frequency for cost savings');
    // Implementation would adjust monitoring intervals
  }

  /**
   * Restore normal monitoring frequency
   */
  private async restoreMonitoringFrequency(): Promise<void> {
    this.logger.log('Restoring normal monitoring frequency');
    // Implementation would restore normal monitoring intervals
  }

  /**
   * Update cost tracking data
   */
  private async updateCostTracking(): Promise<void> {
    try {
      const currentCost = await this.getCurrentCost();
      const budgetLimit = this.configService.get<number>('COST_BUDGET_LIMIT', 100);
      const alertThreshold = this.configService.get<number>('COST_ALERT_THRESHOLD', 80);

      const costData = {
        timestamp: new Date().toISOString(),
        environment: this.environment,
        currentCost,
        budgetLimit,
        alertThreshold,
        alertTriggered: currentCost > (budgetLimit * alertThreshold / 100),
      };

      // Save to tracking file
      await this.saveCostData(costData);

      // Check for alerts
      if (costData.alertTriggered) {
        await this.sendCostAlert(costData);
      }

    } catch (error) {
      this.logger.error(`Failed to update cost tracking: ${error instanceof Error ? error.message : String(error)}`, error);
    }
  }

  /**
   * Get current cost (mock implementation)
   */
  private async getCurrentCost(): Promise<number> {
    // In a real implementation, this would query GCP billing API
    // For now, return a mock value based on environment
    const baseCosts: Record<string, number> = {
      development: 0,
      staging: 25,
      production: 500,
    };

    return baseCosts[this.environment] || 0;
  }

  /**
   * Save cost data to tracking file
   */
  private async saveCostData(costData: any): Promise<void> {
    try {
      const logsDir = path.dirname(this.costTrackingFile);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      let existingData = [];
      if (fs.existsSync(this.costTrackingFile)) {
        const content = fs.readFileSync(this.costTrackingFile, 'utf8');
        existingData = JSON.parse(content);
      }

      // Keep only last 30 days of data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      existingData = existingData.filter((entry: any) => 
        new Date(entry.timestamp) > thirtyDaysAgo
      );

      existingData.push(costData);

      fs.writeFileSync(this.costTrackingFile, JSON.stringify(existingData, null, 2));
      this.logger.log(`Cost data saved to ${this.costTrackingFile}`);

    } catch (error) {
      this.logger.error(`Failed to save cost data: ${(error as Error).message}`, error);
    }
  }

  /**
   * Send cost alert
   */
  private async sendCostAlert(costData: any): Promise<void> {
    this.logger.warn(`Cost alert triggered! Current cost: $${costData.currentCost}, Budget: $${costData.budgetLimit}`);

    // Send to Slack
    const slackWebhook = this.configService.get<string>('SLACK_WEBHOOK_URL');
    if (slackWebhook) {
      await this.sendSlackAlert(costData);
    }

    // Send to PagerDuty
    const pagerDutyKey = this.configService.get<string>('PAGERDUTY_ROUTING_KEY');
    if (pagerDutyKey) {
      await this.sendPagerDutyAlert(costData);
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(costData: any): Promise<void> {
    // Implementation would send actual Slack notification
    this.logger.log(`Slack alert sent for cost threshold breach`);
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(costData: any): Promise<void> {
    // Implementation would send actual PagerDuty alert
    this.logger.log(`PagerDuty alert sent for cost threshold breach`);
  }

  /**
   * Log cost event
   */
  private async logCostEvent(event: string, message: string): Promise<void> {
    const eventData = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      event,
      message,
    };

    this.logger.log(`Cost event: ${event} - ${message}`);
  }

  /**
   * Get cost optimization status
   */
  async getCostStatus(): Promise<{
    environment: string;
    currentCost: number;
    budgetLimit: number;
    alertThreshold: number;
    lastOptimization: string;
    nextOptimization: string;
    autoShutdownEnabled: boolean;
    isWithinSchedule: boolean;
  }> {
    const currentCost = await this.getCurrentCost();
    const budgetLimit = this.configService.get<number>('COST_BUDGET_LIMIT', 100);
    const alertThreshold = this.configService.get<number>('COST_ALERT_THRESHOLD', 80);
    const autoShutdownEnabled = this.configService.get<boolean>('AUTO_SHUTDOWN_ENABLED', false);
    const isWithinSchedule = await this.isWithinShutdownSchedule();

    return {
      environment: this.environment,
      currentCost,
      budgetLimit,
      alertThreshold,
      lastOptimization: new Date().toISOString(),
      nextOptimization: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      autoShutdownEnabled,
      isWithinSchedule,
    };
  }

  /**
   * Manual cost optimization trigger
   */
  async triggerOptimization(): Promise<{ success: boolean; message: string }> {
    try {
      await this.optimizeCosts();
      return { success: true, message: 'Cost optimization triggered successfully' };
    } catch (error) {
      return { success: false, message: `Optimization failed: ${(error as Error).message}` };
    }
  }
}
