/**
 * @req ANA-PARAL-010 — Parallel session monitoring
 */
import { ParallelSessionService } from './parallel-session.service';

describe('ParallelSessionService', () => {
  let service: ParallelSessionService;
  let mockFrom: any;
  let mockSupabase: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockImplementation(function(cb: any) {
        return Promise.resolve({ data: [], error: null }).then(cb);
      })
    };

    mockSupabase = {
      from: jest.fn().mockReturnValue(mockFrom),
      rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue(mockSupabase)
    };

    service = new ParallelSessionService(mockSupabaseService as any);
  });

  describe('scanAndLogOverlaps', () => {
    it('detects and logs multiple tenant sessions for same identity', async () => {
      // Mock RPC to return 1 overlap
      mockSupabase.rpc.mockResolvedValueOnce({ 
        data: [{ identity_id: 'idi-1', tenant_count: 2, active_trips: [] }], 
        error: null 
      });

      const result = await service.scanAndLogOverlaps();
      expect(result.length).toBe(1);
      expect(result[0].identityId).toBe('idi-1');
    });
  });
});
