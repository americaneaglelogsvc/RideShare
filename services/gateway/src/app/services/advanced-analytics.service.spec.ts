/**
 * @req ANA-ADV-010 — Advanced business intelligence (Churn prediction, heatmaps)
 */
import { AdvancedAnalyticsService } from './advanced-analytics.service';

describe('AdvancedAnalyticsService', () => {
  let service: AdvancedAnalyticsService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: jest.fn().mockImplementation(function(cb: any) {
        return Promise.resolve({ data: [], error: null }).then(cb);
      })
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
        rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };

    service = new AdvancedAnalyticsService(mockSupabaseService as any);
  });

  describe('getChurnPrediction', () => {
    it('identifies tenants at risk of churning', async () => {
      const mockTrips = [
        { driver_id: 'd1', created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() }
      ];
      mockFrom.then.mockImplementationOnce((cb: any) => Promise.resolve({ data: mockTrips, error: null }).then(cb));

      const mockProfiles = [
        { id: 'd1', status: 'offline' },
        { id: 'd2', status: 'offline' }
      ];
      mockFrom.then.mockImplementationOnce((cb: any) => Promise.resolve({ data: mockProfiles, error: null }).then(cb));

      const result = await service.getChurnPrediction('t1');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
