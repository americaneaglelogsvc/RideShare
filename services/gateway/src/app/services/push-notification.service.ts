import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface PushTarget {
  userId: string;
  tenantId?: string;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly fcmEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {
    this.fcmEnabled = !!this.configService.get<string>('FCM_SERVER_KEY');
    if (!this.fcmEnabled) {
      this.logger.warn('FCM_SERVER_KEY not configured — push notifications disabled (will log only)');
    }
  }

  async sendToUser(target: PushTarget, payload: PushPayload): Promise<{ sent: boolean; tokenCount: number }> {
    const tokens = await this.getUserTokens(target.userId, target.tenantId);

    if (tokens.length === 0) {
      this.logger.debug(`No push tokens for user ${target.userId}`);
      return { sent: false, tokenCount: 0 };
    }

    if (!this.fcmEnabled) {
      this.logger.log(`[DRY-RUN] Push → ${target.userId}: "${payload.title}" to ${tokens.length} devices`);
      await this.logNotification(target, payload, 'dry_run', tokens.length);
      return { sent: true, tokenCount: tokens.length };
    }

    let successCount = 0;
    const staleTokens: string[] = [];

    for (const token of tokens) {
      try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${this.configService.get<string>('FCM_SERVER_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: token.token,
            notification: {
              title: payload.title,
              body: payload.body,
              image: payload.imageUrl,
            },
            data: payload.data || {},
          }),
        });

        const result = await response.json();

        if (result.success === 1) {
          successCount++;
        } else if (result.results?.[0]?.error === 'NotRegistered') {
          staleTokens.push(token.id);
        }
      } catch (err: any) {
        this.logger.error(`FCM send failed for token ${token.id}: ${err.message}`);
      }
    }

    if (staleTokens.length > 0) {
      await this.removeStaleTokens(staleTokens);
    }

    await this.logNotification(target, payload, successCount > 0 ? 'sent' : 'failed', successCount);
    this.logger.log(`Push → ${target.userId}: ${successCount}/${tokens.length} delivered`);

    return { sent: successCount > 0, tokenCount: successCount };
  }

  async sendToTopic(topic: string, payload: PushPayload): Promise<{ sent: boolean }> {
    if (!this.fcmEnabled) {
      this.logger.log(`[DRY-RUN] Push topic "${topic}": "${payload.title}"`);
      return { sent: true };
    }

    try {
      await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.configService.get<string>('FCM_SERVER_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: `/topics/${topic}`,
          notification: {
            title: payload.title,
            body: payload.body,
            image: payload.imageUrl,
          },
          data: payload.data || {},
        }),
      });
      return { sent: true };
    } catch (err: any) {
      this.logger.error(`FCM topic send failed: ${err.message}`);
      return { sent: false };
    }
  }

  async registerToken(userId: string, token: string, platform: string, tenantId?: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform,
        tenant_id: tenantId || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' },
    );

    this.logger.log(`Push token registered: user=${userId} platform=${platform}`);
  }

  async unregisterToken(userId: string, token: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    await supabase.from('push_tokens').delete().eq('user_id', userId).eq('token', token);
  }

  // Convenience methods for common notification types
  async notifyRideOffer(driverId: string, tenantId: string, tripId: string, pickupAddress: string) {
    return this.sendToUser(
      { userId: driverId, tenantId },
      {
        title: 'New Ride Request',
        body: `Pickup at ${pickupAddress}`,
        data: { type: 'ride_offer', trip_id: tripId, tenant_id: tenantId },
      },
    );
  }

  async notifyTripUpdate(userId: string, tenantId: string, tripId: string, status: string) {
    const statusMessages: Record<string, string> = {
      assigned: 'A driver has been assigned to your ride',
      driver_en_route: 'Your driver is on the way',
      driver_arrived: 'Your driver has arrived',
      active: 'Your trip has started',
      completed: 'Your trip is complete',
      cancelled: 'Your ride has been cancelled',
    };

    return this.sendToUser(
      { userId, tenantId },
      {
        title: 'Trip Update',
        body: statusMessages[status] || `Trip status: ${status}`,
        data: { type: 'trip_update', trip_id: tripId, status, tenant_id: tenantId },
      },
    );
  }

  async notifyPayoutComplete(driverId: string, tenantId: string, amountCents: number) {
    const dollars = (amountCents / 100).toFixed(2);
    return this.sendToUser(
      { userId: driverId, tenantId },
      {
        title: 'Payout Received',
        body: `$${dollars} has been deposited to your account`,
        data: { type: 'payout_complete', amount_cents: String(amountCents), tenant_id: tenantId },
      },
    );
  }

  private async getUserTokens(userId: string, tenantId?: string): Promise<Array<{ id: string; token: string }>> {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('push_tokens')
      .select('id, token')
      .eq('user_id', userId);

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    const { data } = await query;
    return data || [];
  }

  private async removeStaleTokens(tokenIds: string[]): Promise<void> {
    const supabase = this.supabaseService.getClient();
    await supabase.from('push_tokens').delete().in('id', tokenIds);
    this.logger.log(`Removed ${tokenIds.length} stale push tokens`);
  }

  private async logNotification(target: PushTarget, payload: PushPayload, status: string, deviceCount: number): Promise<void> {
    const supabase = this.supabaseService.getClient();
    await supabase.from('notification_log').insert({
      user_id: target.userId,
      tenant_id: target.tenantId,
      channel: 'push',
      title: payload.title,
      body: payload.body,
      status,
      device_count: deviceCount,
    });
  }
}
