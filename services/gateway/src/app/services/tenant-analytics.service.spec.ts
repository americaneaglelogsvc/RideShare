/**
 * @req ANA-TEN-010 — Tenant performance analytics
 */
import { TenantAnalyticsService } from './tenant-analytics.service';

describe('TenantAnalyticsService', () => {
  let service: TenantAnalyticsService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      rpc: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      single: jest.fn(),
      then: jest.fn().mockImplementation(function(cb) {
        return Promise.resolve({ data: [], error: null }).then(cb);
      })
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
        rpc: jest.fn().mockReturnValue({ error: null }),
      }),
    };

    service = new TenantAnalyticsService(mockSupabaseService as any);
  });

  describe('getFleetUtilization', () => {
    it('returns utilization stats for drivers and vehicles', async () => {
      mockFrom.single.mockResolvedValue({
        data: { 
          total_drivers: 20,
          drivers_on_trip: 10, 
          drivers_available: 5,
          drivers_offline: 5,
          utilization_pct: 66.6 
        },
        error: null
      });

      const result = await service.getFleetUtilization('t1');
      expect(result.driversAvailable).toBe(5);
      expect(result.utilizationPct).toBe(66.6);
    });
  });

  describe('getBusinessAtAGlance', () => {
    it('returns summary of key business metrics', async () => {
      // Mock all 4 sub-methods
      jest.spyOn(service, 'getFleetUtilization').mockResolvedValue({} as any);
      jest.spyOn(service, 'getServiceLevel').mockResolvedValue({} as any);
      jest.spyOn(service, 'getRevenueSummary').mockResolvedValue({} as any);
      jest.spyOn(service, 'getMarketplaceYield').mockResolvedValue({} as any);

      const result = await service.getBusinessAtAGlance('t1');
      expect(result.fleet).toBeDefined();
      expect(result.revenue).toBeDefined();
    });
  });

  describe('refreshMaterializedViews', () => {
    it('calls analytical RPC to refresh data', async () => {
      await service.refreshMaterializedViews();
      expect(service['supabaseService'].getClient().rpc).toHaveBeenCalledWith('refresh_dashboard_materialized_views');
    });
  });
});
