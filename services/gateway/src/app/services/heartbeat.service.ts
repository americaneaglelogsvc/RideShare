import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from './supabase.service';

/**
 * HeartbeatService — Distributed heartbeat for multi-tenant ghost session prevention.
 *
 * Drivers ping their heartbeat per tenant-profile via POST /driver/heartbeat.
 * If a driver_profile's last_ping_at is >60 seconds stale, that specific
 * profile is set to OFFLINE. Other tenant sessions remain unaffected.
 */
@Injectable()
export class HeartbeatService {
  private readonly logger = new Logger(HeartbeatService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Called by the driver app every ~15-30 seconds per active tenant session.
   * Upserts a heartbeat row keyed on driver_profile_id.
   */
  async ping(driverProfileId: string, tenantId: string): Promise<{ status: string }> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('driver_heartbeats')
      .upsert(
        {
          driver_profile_id: driverProfileId,
          tenant_id: tenantId,
          last_ping_at: new Date().toISOString(),
          connection_status: 'ONLINE',
        },
        { onConflict: 'driver_profile_id' },
      );

    if (error) {
      this.logger.warn(`Heartbeat upsert failed for profile ${driverProfileId}: ${error.message}`);
      return { status: 'ERROR' };
    }

    return { status: 'OK' };
  }

  /**
   * Runs every 30 seconds. Finds all heartbeats older than 60 seconds
   * and sets those specific driver_profiles to OFFLINE.
   * Crucially, this is per-profile — other tenant sessions stay active.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async sweepGhostSessions() {
    const supabase = this.supabaseService.getClient();

    const cutoff = new Date(Date.now() - 60 * 1000).toISOString();

    // Find stale heartbeats
    const { data: stale, error: fetchErr } = await supabase
      .from('driver_heartbeats')
      .select('driver_profile_id, tenant_id')
      .eq('connection_status', 'ONLINE')
      .lt('last_ping_at', cutoff);

    if (fetchErr) {
      this.logger.error('Ghost session sweep fetch error: ' + fetchErr.message);
      return;
    }

    if (!stale || stale.length === 0) return;

    this.logger.log(`Ghost sweep: ${stale.length} stale heartbeat(s) found.`);

    for (const entry of stale) {
      // Mark heartbeat as OFFLINE
      await supabase
        .from('driver_heartbeats')
        .update({ connection_status: 'OFFLINE' })
        .eq('driver_profile_id', entry.driver_profile_id);

      // Set the specific driver_profile to offline — NOT other tenant profiles
      await supabase
        .from('driver_profiles')
        .update({ status: 'offline' })
        .eq('id', entry.driver_profile_id)
        .eq('tenant_id', entry.tenant_id)
        .in('status', ['online']);

      this.logger.log(
        `Profile ${entry.driver_profile_id} (tenant ${entry.tenant_id}) → OFFLINE (ghost session cleared)`,
      );
    }
  }

  /**
   * Called when a driver explicitly disconnects from a tenant session.
   */
  async disconnect(driverProfileId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    await supabase
      .from('driver_heartbeats')
      .update({ connection_status: 'OFFLINE' })
      .eq('driver_profile_id', driverProfileId);

    await supabase
      .from('driver_profiles')
      .update({ status: 'offline' })
      .eq('id', driverProfileId)
      .in('status', ['online']);
  }

  /**
   * Admin: get all currently online heartbeats with age info.
   */
  async getHeartbeatStatus() {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('driver_heartbeats')
      .select('driver_profile_id, tenant_id, last_ping_at, connection_status')
      .eq('connection_status', 'ONLINE')
      .order('last_ping_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    const now = Date.now();
    const entries = (data || []).map((h) => ({
      ...h,
      age_seconds: Math.round((now - new Date(h.last_ping_at).getTime()) / 1000),
    }));

    return {
      success: true,
      online_count: entries.length,
      heartbeats: entries,
    };
  }
}
