/**
 * @req MSG-001 — In-app messaging only
 * @req MSG-002 — Role-based visibility
 */
import { InTripMessagingService } from './in-trip-messaging.service';

describe('InTripMessagingService', () => {
  let service: InTripMessagingService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new InTripMessagingService(mockSupabaseService as any);
  });

  describe('sendMessage', () => {
    it('saves message to DB with PII masking', async () => {
      const input = {
        tripId: 'trip-1',
        tenantId: 't1',
        senderId: 'rider-1',
        senderRole: 'rider' as const,
        messageType: 'text' as const,
        content: 'Call me at 555-123-4567'
      };

      // Mock trip validation
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: { status: 'in_progress' }, error: null });
      // Mock message insert
      mockFrom.single.mockResolvedValueOnce({ 
        data: { 
          id: 'msg-1', 
          ...input, 
          trip_id: input.tripId, 
          sender_id: input.senderId, 
          masked_content: 'Call me at (***) ***-4567' 
        }, 
        error: null 
      });

      const result = await service.sendMessage(input);
      expect(result.id).toBe('msg-1');
      expect(result.maskedContent).toContain('(***)');
    });

    it('throws if trip is not active', async () => {
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: { status: 'completed' }, error: null });
      await expect(service.sendMessage({ tripId: 't1', content: 'hi' } as any)).rejects.toThrow();
    });
  });

  describe('getConversationForRole', () => {
    it('filters messages for rider/driver participant', async () => {
      const mockTrip = { id: 'trip-1', tenant_id: 't1', rider_id: 'r1', driver_id: 'd1' };
      const mockMessages = [{ id: 'm1', content: 'hi', sender_role: 'driver' }];
      
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: mockTrip, error: null }); // Trip check
      mockFrom.limit.mockResolvedValueOnce({ data: mockMessages, error: null }); // Message select

      const result = await service.getConversationForRole('trip-1', 't1', 'r1', 'rider');
      expect(result).toHaveLength(1);
      expect(result[0].senderRole).toBe('driver');
    });

    it('allows tenant_admin to view all messages in tenant', async () => {
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: { tenant_id: 't1' }, error: null }); // Trip check
      mockFrom.limit.mockResolvedValueOnce({ data: [{ id: 'm1' }], error: null }); // Message select

      const result = await service.getConversationForRole('trip-1', 't1', 'admin-1', 'tenant_admin');
      expect(result).toHaveLength(1);
    });
  });

  describe('markRead', () => {
    it('sets read_at for a message', async () => {
      mockFrom.update.mockReturnThis();
      mockFrom.eq.mockReturnThis();
      mockFrom.is.mockResolvedValue({ error: null });

      await service.markRead('msg-1', 'user-1');
      expect(mockFrom.update).toHaveBeenCalledWith(expect.objectContaining({ read_by: 'user-1' }));
    });
  });
});
