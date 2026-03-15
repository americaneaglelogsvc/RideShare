/**
 * @req WBK-OUT-010 — Outbound webhooks for third-party integrations
 */
import { OutboundWebhookService, WebhookEvent } from './outbound-webhook.service';

describe('OutboundWebhookService', () => {
  let service: OutboundWebhookService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new OutboundWebhookService(mockSupabaseService as any);
  });

  describe('registerWebhook', () => {
    it('creates a webhook registration for tenant', async () => {
      const webhook = { id: 'wh-1', tenant_id: 't1', url: 'https://partner.com/webhook', events: ['trip.completed'] };
      mockFrom.single.mockResolvedValue({ data: webhook, error: null });

      const result = await service.registerWebhook('t1', 'https://partner.com/webhook', ['trip.completed']);
      expect(result.url).toBe('https://partner.com/webhook');
    });
  });

  describe('listWebhooks', () => {
    it('returns list of webhooks for tenant', async () => {
      const webhooks = [{ id: 'wh-1', url: 'https://partner.com/webhook' }];
      mockFrom.order = jest.fn().mockResolvedValue({ data: webhooks, error: null });
      const result = await service.listWebhooks('t1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('dispatch', () => {
    it('broadcasts event to registered webhooks (no return)', async () => {
      // dispatch() returns Promise<void>
      const event: WebhookEvent = {
        eventType: 'trip.completed',
        tenantId: 't1',
        payload: { trip_id: 'trip-1' },
      };
      mockFrom.order = jest.fn().mockResolvedValue({ data: [], error: null });
      await expect(service.dispatch(event)).resolves.not.toThrow();
    });
  });

  describe('emitTripCompleted', () => {
    it('dispatches trip.completed event without throwing', async () => {
      mockFrom.order = jest.fn().mockResolvedValue({ data: [], error: null });
      await expect(service.emitTripCompleted('t1', { trip_id: 'trip-1' })).resolves.not.toThrow();
    });
  });

  describe('getDeliveryLog', () => {
    it('returns delivery history for tenant webhooks', async () => {
      const log = [{ id: 'd1', response_code: 200, delivered_at: new Date().toISOString() }];
      mockFrom.limit = jest.fn().mockResolvedValue({ data: log, error: null });
      const result = await service.getDeliveryLog('t1');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('deactivateWebhook', () => {
    it('deactivates a webhook endpoint', async () => {
      mockFrom.eq.mockReturnThis();
      await expect(service.deactivateWebhook('t1', 'wh-1')).resolves.not.toThrow();
    });
  });
});
