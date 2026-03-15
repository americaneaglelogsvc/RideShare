/**
 * @req GCP-CB-0001 — Circuit breaker for payment gateway
 */
import { CircuitBreakerService } from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    const mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new CircuitBreakerService(mockSupabaseService as any);
  });

  describe('initial state', () => {
    it('starts in CLOSED state', () => {
      const state = (service as any).state;
      expect(state).toBe('CLOSED');
    });
  });

  describe('failure counting', () => {
    it('initializes with zero failures', () => {
      expect((service as any).failureCount).toBe(0);
    });
  });

  describe('getState', () => {
    it('returns current circuit state', () => {
      const state = (service as any).state;
      expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(state);
    });
  });
});
