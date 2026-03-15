/**
 * @req NOTIF-EVT-010 — Multichannel notification dispatch
 */
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'ntf-1' }, error: null }),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new NotificationService(mockSupabaseService as any);
  });

  describe('dispatch', () => {
    it('queues a notification and returns log ID', async () => {
      const payload = {
        tenantId: 't1',
        recipientEmail: 'rider@example.com',
        eventType: 'RIDE_CONFIRMED',
        subject: 'Trip Confirmed',
        templateData: { driverName: 'Max' }
      };

      const result = await service.dispatch(payload);
      expect(result.id).toBe('ntf-1');
      expect(mockFrom.insert).toHaveBeenCalled();
    });
  });

  describe('sendRideConfirmationSms', () => {
    it('delegates to SMS service', async () => {
      const mockSmsService = {
        sendRideConfirmation: jest.fn().mockResolvedValue({ success: true })
      };
      (service as any).smsService = mockSmsService;

      await service.sendRideConfirmationSms('t1', '5551234', 'Max', '5 mins');
      expect(mockSmsService.sendRideConfirmation).toHaveBeenCalledWith('t1', '5551234', 'Max', '5 mins');
    });
  });
});
