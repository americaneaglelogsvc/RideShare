/**
 * @req COM-PUSH-010 — Push notifications
 */
import { PushNotificationService } from './push-notification.service';

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'FCM_SERVER_KEY') return 'test-key';
        return null;
      })
    };

    service = new PushNotificationService(mockConfigService as any, mockSupabaseService as any);
  });

  describe('sendToUser', () => {
    it('fetches user tokens and sends via FCM', async () => {
      mockFrom.select.mockReturnThis();
      mockFrom.or.mockResolvedValue({ data: [{ id: 't1', token: 'token-abc' }], error: null });
      mockFrom.insert.mockResolvedValue({ error: null });

      // Mock global fetch
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ success: 1 })
      } as any);

      const result = await service.sendToUser({ userId: 'u1', tenantId: 't1' }, { title: 'Hi', body: 'Hello' });
      expect(result.sent).toBe(true);
      expect(result.tokenCount).toBe(1);
    });
  });

  describe('registerToken', () => {
    it('upserts push token for user', async () => {
      mockFrom.upsert.mockResolvedValue({ error: null });
      await service.registerToken('u1', 'token-123', 'ios', 't1');
      expect(mockFrom.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: 'u1', token: 'token-123' }),
        expect.anything()
      );
    });
  });

  describe('notifyRideOffer', () => {
    it('sends specific payload for ride offers', async () => {
      const spy = jest.spyOn(service, 'sendToUser').mockResolvedValue({ sent: true, tokenCount: 1 });
      await service.notifyRideOffer('d1', 't1', 'trip-1', 'Main St');
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'd1' }),
        expect.objectContaining({ title: 'New Ride Request' })
      );
    });
  });
});
