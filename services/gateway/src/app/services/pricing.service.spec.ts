/**
 * @req PRIC-CALC-010 — Fare calculation (base + per-mile + time)
 * @req PRIC-SURGE-010 — Surge pricing logic
 */
import { PricingService } from './pricing.service';

describe('PricingService', () => {
  let service: PricingService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      then: jest.fn().mockImplementation(function(cb: any) {
        return Promise.resolve({ data: [], error: null }).then(cb);
      })
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new PricingService(mockSupabaseService as any);
  });

  describe('calculateQuote', () => {
    const chiToOhare = {
      pickup:  { lat: 41.8827, lng: -87.6233 },
      dropoff: { lat: 41.9786, lng: -87.9048 },
      category: 'economy',
    };

    it('returns a positive estimated_fare_cents for standard trip', async () => {
      mockFrom.then.mockImplementationOnce((cb: any) => Promise.resolve({ data: [], error: null }).then(cb));

      const result = await service.calculateQuote(chiToOhare);
      expect(result.estimated_fare_cents).toBeGreaterThan(0);
    });

    it('applies surge multiplier when recent demand is high', async () => {
      const manyTrips = Array.from({ length: 21 }, () => ({ created_at: new Date().toISOString() }));
      mockFrom.then.mockImplementationOnce((cb: any) => Promise.resolve({ data: manyTrips, error: null }).then(cb));

      const result = await service.calculateQuote({ ...chiToOhare, tenantId: 't1' });
      const surgeItem = result.line_items.find(li => li.name === 'Surge Pricing');
      expect(surgeItem).toBeDefined();
    });
  });

  describe('getVehicleCategories', () => {
    it('returns available vehicle category strings', async () => {
      const result = await service.getVehicleCategories();
      expect(result).toContain('economy');
    });
  });
});
