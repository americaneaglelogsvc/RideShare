/**
 * @req FIN-TAX-010 — Tax compliance (TIN collection, 1099-K reporting)
 */
import { TaxService } from './tax.service';

describe('TaxService', () => {
  let service: TaxService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
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

    service = new TaxService(mockSupabaseService as any);
  });

  describe('collectTin', () => {
    it('stores TIN for a driver identity', async () => {
      mockFrom.then.mockImplementationOnce((cb: any) => Promise.resolve({ error: null }).then(cb));
      const result = await service.collectTin('idi-1', '123456789', true);
      expect(result.success).toBe(true);
    });
  });

  describe('getDriverTaxSummary', () => {
    it('aggregates driver earnings for a tax year', async () => {
      const mockSummaries = [
        { gross_earnings_cents: 10000, net_earnings_cents: 8000, trip_count: 5 }
      ];
      mockFrom.then.mockImplementationOnce((cb: any) => Promise.resolve({ data: mockSummaries, error: null }).then(cb));

      const result = await service.getDriverTaxSummary(2024, 'idi-1');
      expect(result.total_gross_earnings_cents).toBe(10000);
    });
  });
});
