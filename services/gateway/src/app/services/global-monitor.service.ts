import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';

/**
 * M9.10: UWD Global Monitor — System Health Pulse & Alerting
 *
 * Proactive failure detection before the tenant notices.
 * Tracks:
 *   - DB Pool Saturation: Connection pool usage %
 *   - Socket Latency: Heartbeat delay (target <500ms)
 *   - AI Agent Response Time: LLM call latency
 *   - Active Trips / Drivers: Operational load
 *   - Error Rate: % of failed requests in the last interval
 *
 * Triggers PagerDuty/Email alerts if any metric hits "Critical" threshold.
 */

export interface HealthSnapshot {
  dbPool: {
    active: number;
    idle: number;
    max: number;
    saturationPct: number;
  };
  socketLatencyMs: number;
  agentResponseTimeMs: number;
  activeTrips: number;
  activeDrivers: number;
  errorRatePct: number;
  alerts: HealthAlert[];
  recordedAt: string;
}

export interface HealthAlert {
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
}

// Thresholds
const THRESHOLDS = {
  DB_POOL_SATURATION_WARNING: 70,
  DB_POOL_SATURATION_CRITICAL: 90,
  SOCKET_LATENCY_WARNING_MS: 500,
  SOCKET_LATENCY_CRITICAL_MS: 2000,
  AGENT_RESPONSE_WARNING_MS: 3000,
  AGENT_RESPONSE_CRITICAL_MS: 10000,
  ERROR_RATE_WARNING_PCT: 5,
  ERROR_RATE_CRITICAL_PCT: 15,
};

@Injectable()
export class GlobalMonitorService {
  private readonly logger = new Logger(GlobalMonitorService.name);

  // In-memory counters for error rate calculation
  private requestCount = 0;
  private errorCount = 0;
  private lastSocketLatencyMs = 0;
  private lastAgentResponseMs = 0;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Record a request outcome for error rate tracking.
   * Called from middleware or interceptor.
   */
  recordRequest(isError: boolean): void {
    this.requestCount++;
    if (isError) this.errorCount++;
  }

  /**
   * Record the latest socket heartbeat latency.
   */
  recordSocketLatency(latencyMs: number): void {
    this.lastSocketLatencyMs = latencyMs;
  }

  /**
   * Record the latest AI agent response time.
   */
  recordAgentResponseTime(responseTimeMs: number): void {
    this.lastAgentResponseMs = responseTimeMs;
  }

  /**
   * Cron: Capture system health snapshot every minute.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async captureHealthSnapshot(): Promise<void> {
    try {
      const snapshot = await this.getDetailedHealth();

      // Persist to DB for historical analysis
      const supabase = this.supabaseService.getClient();
      await supabase.from('system_health_snapshots').insert({
        db_pool_active: snapshot.dbPool.active,
        db_pool_idle: snapshot.dbPool.idle,
        db_pool_max: snapshot.dbPool.max,
        db_pool_saturation_pct: snapshot.dbPool.saturationPct,
        socket_latency_ms: snapshot.socketLatencyMs,
        agent_response_time_ms: snapshot.agentResponseTimeMs,
        active_trips: snapshot.activeTrips,
        active_drivers: snapshot.activeDrivers,
        error_rate_pct: snapshot.errorRatePct,
        alerts: snapshot.alerts,
      });

      // Fire alerts if critical
      for (const alert of snapshot.alerts) {
        if (alert.severity === 'critical') {
          await this.fireAlert(alert);
        }
      }

      // Reset counters after snapshot
      this.requestCount = 0;
      this.errorCount = 0;

      // Cleanup old snapshots periodically (every ~60 snapshots = ~1hr)
      if (Math.random() < 0.017) {
        try { await supabase.rpc('cleanup_old_health_snapshots'); } catch { /* best-effort */ }
      }
    } catch (err: any) {
      this.logger.warn(`Health snapshot failed: ${err.message}`);
    }
  }

  /**
   * /health/detailed endpoint data — internal only.
   */
  async getDetailedHealth(): Promise<HealthSnapshot> {
    const supabase = this.supabaseService.getClient();
    const alerts: HealthAlert[] = [];

    // 1. DB Pool Saturation (estimate via concurrent query timing)
    const dbPoolStart = Date.now();
    const { count: activeTrips } = await supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .in('status', ['requested', 'assigned', 'active']);
    const dbQueryMs = Date.now() - dbPoolStart;

    // Estimate pool saturation from query latency
    // Under normal load: <50ms. At saturation: >200ms
    const estimatedPoolMax = 20; // Supabase default connection pool
    const estimatedActive = Math.min(Math.ceil(dbQueryMs / 10), estimatedPoolMax);
    const estimatedIdle = Math.max(estimatedPoolMax - estimatedActive, 0);
    const saturationPct = Math.round((estimatedActive / estimatedPoolMax) * 10000) / 100;

    if (saturationPct >= THRESHOLDS.DB_POOL_SATURATION_CRITICAL) {
      alerts.push({
        metric: 'db_pool_saturation',
        value: saturationPct,
        threshold: THRESHOLDS.DB_POOL_SATURATION_CRITICAL,
        severity: 'critical',
        message: `DB pool saturation at ${saturationPct}% — connection exhaustion imminent`,
      });
    } else if (saturationPct >= THRESHOLDS.DB_POOL_SATURATION_WARNING) {
      alerts.push({
        metric: 'db_pool_saturation',
        value: saturationPct,
        threshold: THRESHOLDS.DB_POOL_SATURATION_WARNING,
        severity: 'warning',
        message: `DB pool saturation at ${saturationPct}% — approaching capacity`,
      });
    }

    // 2. Socket Latency
    if (this.lastSocketLatencyMs >= THRESHOLDS.SOCKET_LATENCY_CRITICAL_MS) {
      alerts.push({
        metric: 'socket_latency',
        value: this.lastSocketLatencyMs,
        threshold: THRESHOLDS.SOCKET_LATENCY_CRITICAL_MS,
        severity: 'critical',
        message: `Socket heartbeat latency ${this.lastSocketLatencyMs}ms — exceeds 2000ms critical threshold`,
      });
    } else if (this.lastSocketLatencyMs >= THRESHOLDS.SOCKET_LATENCY_WARNING_MS) {
      alerts.push({
        metric: 'socket_latency',
        value: this.lastSocketLatencyMs,
        threshold: THRESHOLDS.SOCKET_LATENCY_WARNING_MS,
        severity: 'warning',
        message: `Socket heartbeat latency ${this.lastSocketLatencyMs}ms — exceeds 500ms threshold`,
      });
    }

    // 3. AI Agent Response Time
    if (this.lastAgentResponseMs >= THRESHOLDS.AGENT_RESPONSE_CRITICAL_MS) {
      alerts.push({
        metric: 'agent_response_time',
        value: this.lastAgentResponseMs,
        threshold: THRESHOLDS.AGENT_RESPONSE_CRITICAL_MS,
        severity: 'critical',
        message: `AI agent response time ${this.lastAgentResponseMs}ms — dispatch loop may be blocked`,
      });
    } else if (this.lastAgentResponseMs >= THRESHOLDS.AGENT_RESPONSE_WARNING_MS) {
      alerts.push({
        metric: 'agent_response_time',
        value: this.lastAgentResponseMs,
        threshold: THRESHOLDS.AGENT_RESPONSE_WARNING_MS,
        severity: 'warning',
        message: `AI agent response time ${this.lastAgentResponseMs}ms — above 3s warning`,
      });
    }

    // 4. Error Rate
    const errorRatePct = this.requestCount > 0
      ? Math.round((this.errorCount / this.requestCount) * 10000) / 100
      : 0;

    if (errorRatePct >= THRESHOLDS.ERROR_RATE_CRITICAL_PCT) {
      alerts.push({
        metric: 'error_rate',
        value: errorRatePct,
        threshold: THRESHOLDS.ERROR_RATE_CRITICAL_PCT,
        severity: 'critical',
        message: `Error rate ${errorRatePct}% — system degradation detected`,
      });
    } else if (errorRatePct >= THRESHOLDS.ERROR_RATE_WARNING_PCT) {
      alerts.push({
        metric: 'error_rate',
        value: errorRatePct,
        threshold: THRESHOLDS.ERROR_RATE_WARNING_PCT,
        severity: 'warning',
        message: `Error rate ${errorRatePct}% — above 5% warning threshold`,
      });
    }

    // 5. Active Drivers count
    const { count: activeDrivers } = await supabase
      .from('driver_profiles')
      .select('id', { count: 'exact', head: true })
      .in('status', ['online', 'on_trip', 'en_route_pickup']);

    return {
      dbPool: {
        active: estimatedActive,
        idle: estimatedIdle,
        max: estimatedPoolMax,
        saturationPct,
      },
      socketLatencyMs: this.lastSocketLatencyMs,
      agentResponseTimeMs: this.lastAgentResponseMs,
      activeTrips: activeTrips ?? 0,
      activeDrivers: activeDrivers ?? 0,
      errorRatePct,
      alerts,
      recordedAt: new Date().toISOString(),
    };
  }

  /**
   * Get health history for the last N minutes.
   */
  async getHealthHistory(minutes: number = 60): Promise<any[]> {
    const supabase = this.supabaseService.getClient();
    const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('system_health_snapshots')
      .select('*')
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false })
      .limit(minutes);

    return data || [];
  }

  /**
   * Fire a critical alert via configured channels (PagerDuty, email, etc.)
   */
  private async fireAlert(alert: HealthAlert): Promise<void> {
    this.logger.error(
      `M9.10 CRITICAL ALERT: ${alert.metric} = ${alert.value} (threshold: ${alert.threshold}) — ${alert.message}`,
    );

    // PagerDuty integration (if configured)
    const pagerdutyKey = this.configService.get<string>('PAGERDUTY_ROUTING_KEY');
    if (pagerdutyKey) {
      try {
        const payload = {
          routing_key: pagerdutyKey,
          event_action: 'trigger',
          payload: {
            summary: `UWD Alert: ${alert.message}`,
            severity: alert.severity,
            source: 'urwaydispatch.com',
            component: alert.metric,
            custom_details: {
              value: alert.value,
              threshold: alert.threshold,
              timestamp: new Date().toISOString(),
            },
          },
        };

        // Fire-and-forget — don't block health check for external call
        fetch('https://events.pagerduty.com/v2/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch((err) => {
          this.logger.warn(`PagerDuty alert failed: ${err.message}`);
        });
      } catch {
        // PagerDuty is best-effort
      }
    }

    // Email alert (if configured)
    const alertEmail = this.configService.get<string>('ALERT_EMAIL');
    if (alertEmail) {
      this.logger.log(`M9.10: Would email ${alertEmail} — ${alert.message}`);
      // In production, integrate with SendGrid/SES here
    }
  }
}
