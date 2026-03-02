import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from './supabase.service';

/**
 * M9.3: Conflict & Overlap Monitoring — Parallel Session Monitor
 *
 * Detects and logs driver_identities that are currently ON_TRIP for 2+ tenants
 * simultaneously. This is a NEUTRAL monitoring service — it does NOT block
 * the driver. It simply provides data to the UWD Admin for volume analysis.
 *
 * "Driver Autonomy" is preserved: the system observes but does not interfere.
 */

export interface ParallelSessionEntry {
  identityId: string;
  tenantCount: number;
  activeTenantTrips: Array<{
    tenantId: string;
    profileId: string;
    tripId: string;
    status: string;
  }>;
  detectedAt: string;
}

@Injectable()
export class ParallelSessionService {
  private readonly logger = new Logger(ParallelSessionService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Cron: Run every 30 seconds to detect parallel sessions.
   * Logs new overlaps and resolves ended ones.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async detectParallelSessions(): Promise<void> {
    try {
      await this.scanAndLogOverlaps();
    } catch (err: any) {
      this.logger.error(`Parallel session scan error: ${err.message}`);
    }
  }

  /**
   * Core detection logic — uses the detect_parallel_sessions() RPC when available,
   * falls back to manual query.
   */
  async scanAndLogOverlaps(): Promise<ParallelSessionEntry[]> {
    const supabase = this.supabaseService.getClient();
    let overlaps: ParallelSessionEntry[] = [];

    // Try RPC first
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('detect_parallel_sessions');

      if (!rpcError && rpcResult) {
        overlaps = (rpcResult as any[]).map((row) => ({
          identityId: row.identity_id,
          tenantCount: Number(row.tenant_count),
          activeTenantTrips: row.active_trips || [],
          detectedAt: new Date().toISOString(),
        }));
      } else {
        overlaps = await this.manualDetection();
      }
    } catch {
      overlaps = await this.manualDetection();
    }

    // Log new overlaps
    for (const overlap of overlaps) {
      await this.logOverlap(overlap);
    }

    // Resolve ended overlaps
    await this.resolveEndedOverlaps(overlaps.map((o) => o.identityId));

    if (overlaps.length > 0) {
      this.logger.log(
        `M9.3: Detected ${overlaps.length} driver(s) with parallel multi-tenant trips`,
      );
    }

    return overlaps;
  }

  /**
   * Fallback: Manual detection when RPC is unavailable.
   */
  private async manualDetection(): Promise<ParallelSessionEntry[]> {
    const supabase = this.supabaseService.getClient();

    // Get all driver profiles currently in an active trip state
    const { data: activeProfiles, error } = await supabase
      .from('driver_profiles')
      .select('id, tenant_id, status, driver_identity_id')
      .eq('is_active', true)
      .in('status', ['en_route_pickup', 'at_pickup', 'en_route_dropoff', 'busy', 'on_trip']);

    if (error || !activeProfiles) return [];

    // Group by identity
    const byIdentity: Record<string, Array<{ tenantId: string; profileId: string; status: string }>> = {};
    for (const profile of activeProfiles) {
      const iid = profile.driver_identity_id;
      if (!byIdentity[iid]) byIdentity[iid] = [];
      byIdentity[iid].push({
        tenantId: profile.tenant_id,
        profileId: profile.id,
        status: profile.status,
      });
    }

    // Filter to only multi-tenant overlaps
    const overlaps: ParallelSessionEntry[] = [];
    for (const [identityId, sessions] of Object.entries(byIdentity)) {
      const uniqueTenants = new Set(sessions.map((s) => s.tenantId));
      if (uniqueTenants.size >= 2) {
        // Fetch active trip IDs for each session
        const tripsWithIds: Array<{ tenantId: string; profileId: string; tripId: string; status: string }> = [];
        for (const session of sessions) {
          const { data: trip } = await supabase
            .from('trips')
            .select('id')
            .eq('tenant_id', session.tenantId)
            .eq('driver_id', session.profileId)
            .in('status', ['assigned', 'active'])
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          tripsWithIds.push({
            tenantId: session.tenantId,
            profileId: session.profileId,
            tripId: trip?.id || 'unknown',
            status: session.status,
          });
        }

        overlaps.push({
          identityId,
          tenantCount: uniqueTenants.size,
          activeTenantTrips: tripsWithIds,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    return overlaps;
  }

  /**
   * Log an overlap to the parallel_session_log table.
   * Idempotent: only logs if there isn't already an active (unresolved) entry for this identity.
   */
  private async logOverlap(overlap: ParallelSessionEntry): Promise<void> {
    const supabase = this.supabaseService.getClient();

    // Check if there's already an active log for this identity
    const { data: existing } = await supabase
      .from('parallel_session_log')
      .select('id')
      .eq('driver_identity_id', overlap.identityId)
      .is('resolved_at', null)
      .single();

    if (existing) return; // Already tracked

    await supabase.from('parallel_session_log').insert({
      driver_identity_id: overlap.identityId,
      concurrent_trips: overlap.activeTenantTrips,
      tenant_count: overlap.tenantCount,
      detected_at: overlap.detectedAt,
    });
  }

  /**
   * Resolve overlaps that are no longer active.
   */
  private async resolveEndedOverlaps(currentOverlapIdentities: string[]): Promise<void> {
    const supabase = this.supabaseService.getClient();

    // Get all unresolved entries
    const { data: unresolvedEntries } = await supabase
      .from('parallel_session_log')
      .select('id, driver_identity_id, detected_at')
      .is('resolved_at', null);

    if (!unresolvedEntries) return;

    for (const entry of unresolvedEntries) {
      if (!currentOverlapIdentities.includes(entry.driver_identity_id)) {
        // This overlap has ended
        const detectedAt = new Date(entry.detected_at).getTime();
        const durationSeconds = Math.round((Date.now() - detectedAt) / 1000);

        await supabase
          .from('parallel_session_log')
          .update({
            resolved_at: new Date().toISOString(),
            duration_seconds: durationSeconds,
          })
          .eq('id', entry.id);
      }
    }
  }

  /**
   * Get parallel session data for admin dashboard.
   */
  async getParallelSessionReport(options?: {
    activeOnly?: boolean;
    limit?: number;
  }): Promise<{
    activeOverlaps: ParallelSessionEntry[];
    recentHistory: any[];
    stats: {
      currentActiveOverlaps: number;
      totalOverlapsToday: number;
      avgDurationSeconds: number;
    };
  }> {
    const supabase = this.supabaseService.getClient();

    // Current active overlaps
    const currentOverlaps = await this.scanAndLogOverlaps();

    // Recent history (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: history } = await supabase
      .from('parallel_session_log')
      .select('*')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(options?.limit || 100);

    // Stats
    const totalToday = history?.length || 0;
    const resolvedEntries = (history || []).filter((h: any) => h.duration_seconds != null);
    const avgDuration = resolvedEntries.length > 0
      ? Math.round(resolvedEntries.reduce((s: number, h: any) => s + h.duration_seconds, 0) / resolvedEntries.length)
      : 0;

    return {
      activeOverlaps: currentOverlaps,
      recentHistory: history || [],
      stats: {
        currentActiveOverlaps: currentOverlaps.length,
        totalOverlapsToday: totalToday,
        avgDurationSeconds: avgDuration,
      },
    };
  }
}
