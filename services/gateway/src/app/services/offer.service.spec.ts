/**
 * @req DRV-OFFER-010 — Instant ride offers (Multi-Ping)
 */
import { OfferService } from './offer.service';

describe('OfferService', () => {
  let service: OfferService;
  let mockFrom: any;
  let mockSupabase: any;
  let mockRealtimeService: any;

  beforeEach(() => {
    const mockChannel = {
      subscribe: jest.fn().mockReturnThis(),
      send: jest.fn().mockResolvedValue('ok'),
      unsubscribe: jest.fn().mockResolvedValue('ok')
    };

    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
      then: jest.fn().mockImplementation(function(cb: any) {
        return Promise.resolve({ data: [], error: null }).then(cb);
      })
    };

    mockSupabase = {
      from: jest.fn().mockReturnValue(mockFrom),
      channel: jest.fn().mockReturnValue(mockChannel),
      rpc: jest.fn()
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue(mockSupabase)
    };

    mockRealtimeService = {
      emitTripStateChanged: jest.fn().mockResolvedValue(true)
    };

    service = new OfferService(mockSupabaseService as any, mockRealtimeService as any);
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => cb());
  });

  describe('acceptInstantOffer', () => {
    it('validates offer and calls atomic_assign_trip', async () => {
      // 1. Validate offer
      mockFrom.single.mockResolvedValueOnce({ 
        data: { id: 'off-1', trip_id: 'trip-1', status: 'pending', expires_at: new Date(Date.now() + 10000).toISOString() }, 
        error: null 
      });
      // 2. RPC
      mockSupabase.rpc.mockResolvedValue({ 
        data: { assigned: true }, 
        error: null 
      });
      // 3. Update status (accepted)
      mockFrom.single.mockResolvedValueOnce({ data: { status: 'accepted' }, error: null });
      // 4. Update driver profile
      mockFrom.then.mockImplementationOnce((cb: any) => Promise.resolve({ data: [], error: null }).then(cb));
      // 5. Decline others
      mockFrom.then.mockImplementationOnce((cb: any) => Promise.resolve({ data: [], error: null }).then(cb));

      const result = await service.acceptInstantOffer('t1', 'drv-1', 'off-1');
      expect(result.success).toBe(true);
    });
  });
});
