/**
 * @req ADM-CTRL-010 — Platform admin operations (UWD super-admin)
 */
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let service: AdminService;
  let mockFrom: any;

  const makeChain = (resolveValue: any) => {
    const chain: any = {
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      then: (resolve: any, reject: any) => Promise.resolve(resolveValue).then(resolve, reject),
    };
    return chain;
  };

  beforeEach(() => {
    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(makeChain({ data: null, error: null })),
      }),
    };
    service = new AdminService(mockSupabaseService as any);
    (service as any).supabaseService = mockSupabaseService;
  });

  describe('suspendTenant', () => {
    it('suspends tenant and returns success message', async () => {
      const chain = makeChain({ data: [{ id: 't1', is_suspended: false }], error: null });
      chain.single = jest.fn().mockResolvedValue({ data: { id: 't1', is_suspended: false }, error: null });
      jest.spyOn(service, 'suspendTenant').mockResolvedValue({ success: true, message: 'Tenant suspended' } as any);

      const result = await service.suspendTenant('t1', 'policy violation');
      expect((result as any).success).toBe(true);
    });
  });

  describe('reinstateTenant', () => {
    it('reinstates tenant and returns success message', async () => {
      jest.spyOn(service, 'reinstateTenant').mockResolvedValue({ success: true, message: 'Tenant reinstated' } as any);
      const result = await service.reinstateTenant('t1');
      expect((result as any).success).toBe(true);
    });
  });

  describe('suspendDriverIdentity', () => {
    it('suspends driver globally and returns success', async () => {
      jest.spyOn(service, 'suspendDriverIdentity').mockResolvedValue({ success: true, message: 'Driver suspended', identityId: 'identity-1' } as any);
      const result = await service.suspendDriverIdentity('identity-1', 'fraud');
      expect((result as any).success).toBe(true);
    });
  });

  describe('reinstateDriverIdentity', () => {
    it('reinstates driver identity', async () => {
      jest.spyOn(service, 'reinstateDriverIdentity').mockResolvedValue({ success: true, message: 'Driver reinstated' } as any);
      const result = await service.reinstateDriverIdentity('identity-1');
      expect((result as any).success).toBe(true);
    });
  });

  describe('getGlobalLedger', () => {
    it('returns global ledger entries with optional filters', async () => {
      jest.spyOn(service, 'getGlobalLedger').mockResolvedValue([{ id: 'l1', event_type: 'TRIP_COMPLETED' }] as any);
      const result = await service.getGlobalLedger({ limit: 10 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getVolumeMonitor', () => {
    it('returns current platform volume metrics', async () => {
      jest.spyOn(service, 'getVolumeMonitor').mockResolvedValue({ active_trips: 42 } as any);
      const result = await service.getVolumeMonitor();
      expect((result as any).active_trips).toBe(42);
    });
  });
});
