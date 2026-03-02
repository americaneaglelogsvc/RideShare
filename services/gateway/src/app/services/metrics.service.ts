import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from './supabase.service';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Collect and snapshot all system metrics every 60 seconds.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetrics(): Promise<void> {
    try {
      const supabase = this.supabaseService.getClient();
      const now = new Date().toISOString();

      // uwd_active_trips_total
      const { data: activeTrips } = await supabase
        .from('trips')
        .select('id', { count: 'exact', head: true })
        .in('status', ['requested', 'assigned', 'active']);

      const activeTripsCount = (activeTrips as any)?.length ?? 0;

      // uwd_driver_concurrency_factor
      const { data: onlineProfiles } = await supabase
        .from('driver_profiles')
        .select('driver_identity_id')
        .eq('is_active', true)
        .in('status', ['online', 'on_trip']);

      const identitySet = new Set((onlineProfiles || []).map((p) => p.driver_identity_id));
      const totalOnline = onlineProfiles?.length || 0;
      const uniqueIdentities = identitySet.size;
      const concurrencyFactor = uniqueIdentities > 0
        ? Math.round((totalOnline / uniqueIdentities) * 100) / 100
        : 0;

      // uwd_billing_success_rate (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: billingEvents } = await supabase
        .from('billing_events')
        .select('status')
        .gte('created_at', thirtyDaysAgo);

      const totalBilling = billingEvents?.length || 0;
      const successBilling = (billingEvents || []).filter((e) => e.status === 'SUCCESS').length;
      const billingSuccessRate = totalBilling > 0
        ? Math.round((successBilling / totalBilling) * 10000) / 100
        : 100;

      // Batch insert metrics
      const metrics = [
        { metric_name: 'uwd_active_trips_total', metric_value: activeTripsCount, recorded_at: now },
        { metric_name: 'uwd_online_drivers_total', metric_value: totalOnline, recorded_at: now },
        { metric_name: 'uwd_unique_identities_online', metric_value: uniqueIdentities, recorded_at: now },
        { metric_name: 'uwd_driver_concurrency_factor', metric_value: concurrencyFactor, recorded_at: now },
        { metric_name: 'uwd_billing_success_rate', metric_value: billingSuccessRate, recorded_at: now },
      ];

      await supabase.from('system_metrics').insert(metrics);
    } catch (err: any) {
      this.logger.error('Metrics collection failed: ' + err.message);
    }
  }

  /**
   * Get the latest snapshot of each metric.
   */
  async getLatestMetrics(): Promise<Record<string, number>> {
    const supabase = this.supabaseService.getClient();

    const metricNames = [
      'uwd_active_trips_total',
      'uwd_online_drivers_total',
      'uwd_unique_identities_online',
      'uwd_driver_concurrency_factor',
      'uwd_billing_success_rate',
    ];

    const result: Record<string, number> = {};

    for (const name of metricNames) {
      const { data } = await supabase
        .from('system_metrics')
        .select('metric_value')
        .eq('metric_name', name)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      result[name] = data?.metric_value ?? 0;
    }

    return result;
  }

  /**
   * Get metric time-series for charting (last N hours).
   */
  async getMetricTimeSeries(metricName: string, hours = 24) {
    const supabase = this.supabaseService.getClient();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('system_metrics')
      .select('metric_value, recorded_at')
      .eq('metric_name', metricName)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true });

    if (error) return [];
    return data || [];
  }

  /**
   * Global status page API — returns health of all subsystems.
   */
  async getGlobalStatus() {
    const metrics = await this.getLatestMetrics();
    const circuitBreaker = await this.getCircuitBreakerStates();

    const overallHealthy = circuitBreaker.every((cb) => cb.state === 'CLOSED');

    return {
      status: overallHealthy ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      metrics,
      circuit_breakers: circuitBreaker,
    };
  }

  private async getCircuitBreakerStates() {
    const supabase = this.supabaseService.getClient();

    const { data } = await supabase
      .from('circuit_breaker_state')
      .select('*');

    return data || [];
  }
}
