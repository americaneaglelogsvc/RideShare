/**
 * @req AUD-EVT-0001 — Audit event taxonomy (all money/state changes)
 */
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;

  const makeChainableMock = (resolveValue: any) => {
    const chain: any = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn(),
      // Make the object thenable so `await chain` resolves
      then: (resolve: any, reject: any) => Promise.resolve(resolveValue).then(resolve, reject),
    };
    return chain;
  };

  beforeEach(() => {
    const mockSupabaseService = { getClient: jest.fn() };
    service = new AuditService(mockSupabaseService as any);
    (service as any).supabaseService = mockSupabaseService;
  });

  describe('emit', () => {
    const baseEvent = {
      actorId: 'user-1',
      actorType: 'user' as const,
      eventType: 'TRIP_COMPLETED',
      resourceType: 'trip',
      resourceId: 'trip-1',
      action: 'update' as const,
    };

    it('inserts audit event and returns id on success', async () => {
      const fromChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'evt-1' }, error: null }),
          }),
        }),
      };
      (service as any).supabaseService.getClient = jest.fn().mockReturnValue({ from: jest.fn().mockReturnValue(fromChain) });

      const id = await service.emit(baseEvent);
      expect(id).toBe('evt-1');
    });

    it('returns null on DB error (fail-safe — never throws)', async () => {
      const fromChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: { message: 'db down' } }),
          }),
        }),
      };
      (service as any).supabaseService.getClient = jest.fn().mockReturnValue({ from: jest.fn().mockReturnValue(fromChain) });

      const id = await service.emit(baseEvent);
      expect(id).toBeNull();
    });

    it('returns null on exception (fail-safe)', async () => {
      const fromChain = {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(new Error('network error')),
          }),
        }),
      };
      (service as any).supabaseService.getClient = jest.fn().mockReturnValue({ from: jest.fn().mockReturnValue(fromChain) });

      const id = await service.emit(baseEvent);
      expect(id).toBeNull();
    });
  });

  describe('query', () => {
    it('returns empty array when DB returns error', async () => {
      const chain = makeChainableMock({ data: null, error: { message: 'db error' } });
      (service as any).supabaseService.getClient = jest.fn().mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await service.query({ tenantId: 't1' });
      expect(result).toEqual([]);
    });

    it('returns events when found', async () => {
      const events = [{ id: 'evt-1', event_type: 'TRIP_COMPLETED' }];
      const chain = makeChainableMock({ data: events, error: null });
      (service as any).supabaseService.getClient = jest.fn().mockReturnValue({ from: jest.fn().mockReturnValue(chain) });

      const result = await service.query({ tenantId: 't1', limit: 10 });
      expect(result).toHaveLength(1);
      expect(result[0].event_type).toBe('TRIP_COMPLETED');
    });
  });
});
