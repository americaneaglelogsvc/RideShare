import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import * as crypto from 'crypto';

export interface WebhookEvent {
  eventType: string;
  tenantId: string;
  payload: Record<string, any>;
}

@Injectable()
export class OutboundWebhookService {
  private readonly logger = new Logger(OutboundWebhookService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Dispatch a webhook event to all registered URLs for the given tenant + event type.
   */
  async dispatch(event: WebhookEvent): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { data: webhooks, error } = await supabase
      .from('tenant_webhooks')
      .select('id, url, secret, events')
      .eq('tenant_id', event.tenantId)
      .eq('is_active', true);

    if (error || !webhooks || webhooks.length === 0) {
      return;
    }

    for (const webhook of webhooks) {
      const eventList: string[] = webhook.events || [];
      if (!eventList.includes(event.eventType)) continue;

      // Fire-and-forget with retry tracking
      this.deliverWebhook(webhook.id, event, webhook.url, webhook.secret).catch((err) => {
        this.logger.error(`Webhook delivery failed for ${webhook.id}: ${err.message}`);
      });
    }
  }

  private async deliverWebhook(
    webhookId: string,
    event: WebhookEvent,
    url: string,
    secret: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const body = JSON.stringify({
      event: event.eventType,
      tenant_id: event.tenantId,
      timestamp: new Date().toISOString(),
      data: event.payload,
    });

    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    let responseStatus = 0;
    let responseBody = '';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-UWD-Signature': signature,
          'X-UWD-Event': event.eventType,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      responseStatus = response.status;
      responseBody = await response.text().catch(() => '');

      this.logger.log(
        `Webhook ${webhookId} → ${url} [${event.eventType}]: HTTP ${responseStatus}`,
      );
    } catch (err: any) {
      responseStatus = 0;
      responseBody = err.message || 'Connection failed';
      this.logger.warn(`Webhook ${webhookId} → ${url} failed: ${responseBody}`);
    }

    // Log delivery
    await supabase.from('webhook_delivery_log').insert({
      webhook_id: webhookId,
      tenant_id: event.tenantId,
      event_type: event.eventType,
      payload: event.payload,
      response_status: responseStatus,
      response_body: responseBody.slice(0, 2000),
      delivered_at: responseStatus >= 200 && responseStatus < 300 ? new Date().toISOString() : null,
    });
  }

  /**
   * Emit TRIP_COMPLETED event to tenant webhooks.
   */
  async emitTripCompleted(tenantId: string, tripData: Record<string, any>): Promise<void> {
    await this.dispatch({
      eventType: 'TRIP_COMPLETED',
      tenantId,
      payload: tripData,
    });
  }

  /**
   * Emit TRIP_CANCELLED event to tenant webhooks.
   */
  async emitTripCancelled(tenantId: string, tripData: Record<string, any>): Promise<void> {
    await this.dispatch({
      eventType: 'TRIP_CANCELLED',
      tenantId,
      payload: tripData,
    });
  }

  /**
   * Register a new webhook for a tenant.
   */
  async registerWebhook(tenantId: string, url: string, events?: string[]) {
    const supabase = this.supabaseService.getClient();

    const secret = crypto.randomBytes(32).toString('hex');

    const { data, error } = await supabase
      .from('tenant_webhooks')
      .insert({
        tenant_id: tenantId,
        url,
        secret,
        events: events || ['TRIP_COMPLETED', 'TRIP_CANCELLED'],
      })
      .select('id, url, events, is_active, created_at')
      .single();

    if (error) throw new Error('Failed to register webhook: ' + error.message);

    return { ...data, secret };
  }

  /**
   * List webhooks for a tenant (secret masked).
   */
  async listWebhooks(tenantId: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_webhooks')
      .select('id, url, events, is_active, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw new Error('Failed to list webhooks: ' + error.message);
    return data || [];
  }

  /**
   * Deactivate a webhook.
   */
  async deactivateWebhook(tenantId: string, webhookId: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('tenant_webhooks')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', webhookId)
      .eq('tenant_id', tenantId);

    if (error) throw new Error('Failed to deactivate webhook');
    return { success: true, message: 'Webhook deactivated.' };
  }

  /**
   * Get delivery log for a webhook.
   */
  async getDeliveryLog(tenantId: string, webhookId?: string, limit = 50) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('webhook_delivery_log')
      .select('id, event_type, response_status, attempt, delivered_at, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (webhookId) query = query.eq('webhook_id', webhookId);

    const { data, error } = await query;
    if (error) throw new Error('Failed to fetch delivery log');
    return data || [];
  }
}
