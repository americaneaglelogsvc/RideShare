/**
 * @req PRI-POL-010 — Dynamic pricing policies
 */
import { PricingPolicyService } from './pricing-policy.service';

describe('PricingPolicyService', () => {
  let service: PricingPolicyService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new PricingPolicyService(mockSupabaseService as any);
  });

  describe('getPolicies', () => {
    it('returns default policies when none found in DB', async () => {
      mockFrom.maybeSingle.mockResolvedValue({ data: null, error: null });
      const result = await service.getPolicies('t1');
      expect(result.cancellation.freeCancelWindowSeconds).toBeDefined();
    });

    it('merges DB policies with defaults', async () => {
      const dbPolicies = { cancellation: { freeCancelWindowSeconds: 300 } };
      mockFrom.maybeSingle.mockResolvedValue({ data: { policies: dbPolicies }, error: null });
      const result = await service.getPolicies('t1');
      expect(result.cancellation.freeCancelWindowSeconds).toBe(300);
      expect(result.surge.enabled).toBe(true); // From default
    });
  });

  describe('calculateCancellationFee', () => {
    it('returns zero if cancelled within free window', async () => {
      // getPolicies will use defaults
      const result = await service.calculateCancellationFee('t1', new Date().toISOString(), 'rider');
      expect(result.feeCents).toBe(0);
      expect(result.reason).toBe('within_free_cancel_window');
    });

    it('returns late fee if cancelled after window', async () => {
      const longAgo = new Date(Date.now() - 3600000).toISOString();
      const result = await service.calculateCancellationFee('t1', longAgo, 'rider');
      expect(result.feeCents).toBeGreaterThan(0);
      expect(result.reason).toBe('late_cancel_fee');
    });
  });

  describe('triggerSurge', () => {
    it('inserts a surge event with propagation delay', async () => {
      const mockResult = { id: 's1', multiplier: 2.0 };
      mockFrom.single.mockResolvedValue({ data: mockResult, error: null });

      const result = await service.triggerSurge('t1', 'chi_downtown', 2.0);
      expect(result.multiplier).toBe(2.0);
      expect(mockFrom.insert).toHaveBeenCalled();
    });
  });
});
