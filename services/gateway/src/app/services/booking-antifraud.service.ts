import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface VelocityCheckResult {
  allowed: boolean;
  attemptsInWindow: number;
  message: string;
}

@Injectable()
export class BookingAntifraudService {
  private readonly logger = new Logger(BookingAntifraudService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Check booking velocity using the DB RPC, with a fallback to direct query.
   * Throws ForbiddenException if the rider is rate-limited.
   */
  async checkAndEnforceVelocity(
    tenantId: string,
    riderId: string,
    windowMinutes = 10,
    maxAttempts = 5,
  ): Promise<VelocityCheckResult> {
    const supabase = this.supabaseService.getClient();

    // Try the RPC first (defined in migration 1013)
    const { data, error } = await supabase.rpc('check_booking_velocity', {
      p_tenant_id: tenantId,
      p_rider_id: riderId,
      p_window_minutes: windowMinutes,
      p_max_attempts: maxAttempts,
    });

    if (error) {
      this.logger.warn(`Velocity RPC failed, falling back to direct query: ${error.message}`);
      return this.checkVelocityDirect(tenantId, riderId, windowMinutes, maxAttempts);
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return { allowed: true, attemptsInWindow: 0, message: 'OK' };
    }

    if (!row.allowed) {
      this.logger.warn(`Booking blocked for rider ${riderId}: ${row.message}`);
      throw new ForbiddenException(row.message);
    }

    return {
      allowed: row.allowed,
      attemptsInWindow: row.attempts_in_window,
      message: row.message,
    };
  }

  /**
   * Direct query fallback if the RPC is not available.
   */
  private async checkVelocityDirect(
    tenantId: string,
    riderId: string,
    windowMinutes: number,
    maxAttempts: number,
  ): Promise<VelocityCheckResult> {
    const supabase = this.supabaseService.getClient();
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { count } = await supabase
      .from('booking_velocity_log')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('rider_id', riderId)
      .eq('action', 'booking_attempt')
      .gte('created_at', windowStart);

    const attempts = count || 0;

    if (attempts >= maxAttempts) {
      // Log the block
      await supabase.from('booking_velocity_log').insert({
        tenant_id: tenantId,
        rider_id: riderId,
        action: 'booking_blocked',
      });

      throw new ForbiddenException('Too many booking attempts. Please try again later.');
    }

    // Log the attempt
    await supabase.from('booking_velocity_log').insert({
      tenant_id: tenantId,
      rider_id: riderId,
      action: 'booking_attempt',
    });

    return {
      allowed: true,
      attemptsInWindow: attempts + 1,
      message: 'OK',
    };
  }

  /**
   * Flag a rider account for suspicious activity.
   */
  async flagAccount(tenantId: string, riderId: string, metadata?: Record<string, unknown>) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.from('booking_velocity_log').insert({
      tenant_id: tenantId,
      rider_id: riderId,
      action: 'account_flagged',
      metadata: metadata || {},
    });

    if (error) {
      this.logger.error(`Failed to flag account: ${error.message}`);
    }

    this.logger.warn(`Account flagged: rider ${riderId} in tenant ${tenantId}`);
    return { flagged: true };
  }

  /**
   * Get velocity stats for a rider (admin use).
   */
  async getVelocityStats(tenantId: string, riderId: string, windowMinutes = 60) {
    const supabase = this.supabaseService.getClient();
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { data } = await supabase
      .from('booking_velocity_log')
      .select('action, created_at')
      .eq('tenant_id', tenantId)
      .eq('rider_id', riderId)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false });

    const logs = data || [];
    return {
      totalEvents: logs.length,
      attempts: logs.filter(l => l.action === 'booking_attempt').length,
      blocks: logs.filter(l => l.action === 'booking_blocked').length,
      flags: logs.filter(l => l.action === 'account_flagged').length,
      recentEvents: logs.slice(0, 20),
    };
  }
}
