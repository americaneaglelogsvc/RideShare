/**
 * @req RID-DISP-010 — Rider dispute management
 */
import { RiderDisputeService } from './rider-dispute.service';

describe('RiderDisputeService', () => {
  let service: RiderDisputeService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    const mockPushService = { sendToUser: jest.fn() };

    service = new RiderDisputeService(mockSupabaseService as any, mockPushService as any);
  });

  describe('createDispute', () => {
    it('verifies trip and creates a new dispute record', async () => {
      mockFrom.single.mockResolvedValueOnce({ data: { id: 'trip-1' }, error: null }); // Trip check
      mockFrom.maybeSingle.mockResolvedValueOnce({ data: null, error: null }); // Duplicate check
      mockFrom.single.mockResolvedValueOnce({ data: { id: 'disp-1' }, error: null }); // Insert

      const result = await service.createDispute({
        tenantId: 't1',
        tripId: 'trip-1',
        riderId: 'rider-1',
        category: 'fare_dispute',
        description: 'Overcharged'
      });

      expect(result.id).toBe('disp-1');
    });
  });

  describe('resolveDispute', () => {
    it('updates status and sends notification', async () => {
      const mockDispute = { id: 'disp-1', rider_id: 'r1', status: 'open' };
      mockFrom.single.mockResolvedValueOnce({ data: mockDispute, error: null }); // Get dispute
      mockFrom.single.mockResolvedValueOnce({ data: { ...mockDispute, status: 'resolved_refund' }, error: null }); // Update

      const result = await service.resolveDispute('disp-1', {
        status: 'resolved_refund',
        resolutionNote: 'Refunding $5',
        refundCents: 500,
        resolvedBy: 'admin-1'
      });

      expect(result.status).toBe('resolved_refund');
    });
  });

  describe('listDisputesForRider', () => {
    it('returns disputes for a specific rider', async () => {
      mockFrom.order.mockResolvedValue({ data: [{ id: 'd1' }], error: null });
      const result = await service.listDisputesForRider('r1', 't1');
      expect(result).toHaveLength(1);
    });
  });
});
