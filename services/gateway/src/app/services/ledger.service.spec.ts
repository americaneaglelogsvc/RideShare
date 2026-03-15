/**
 * @req FIN-LEDGER-010 — Immutable ledger
 */
import { LedgerService } from './ledger.service';

describe('LedgerService', () => {
  let service: LedgerService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new LedgerService(mockSupabaseService as any);
  });

  describe('recordTripFare', () => {
    it('creates ledger entry for a completed trip', async () => {
      // In recordTripFare, insert is NOT followed by single/select.
      // So it must be thenable or return a promise.
      mockFrom.insert.mockImplementation(() => Promise.resolve({ error: null }));

      const result = await service.recordTripFare({
        tenantId: 't1',
        tripId: 'trip-1',
        driverId: 'drv-1',
        fareCents: 5000,
        platformFeeCents: 500,
        tenantNetCents: 500,
        driverPayoutCents: 4000
      });

      expect(result.success).toBe(true);
      expect(mockFrom.insert).toHaveBeenCalled();
    });
  });

  describe('recordLedgerEvent', () => {
    it('records custom ledger event', async () => {
      mockFrom.insert.mockImplementation(() => Promise.resolve({ error: null }));

      const result = await service.recordLedgerEvent({
        tenantId: 't1',
        eventType: 'TRIP_ASSIGNED',
        tripId: 'trip-1',
        driverId: 'drv-1',
        fareCents: 500,
        metadata: { reason: 'bonus' }
      });

      expect(result.success).toBe(true);
      expect(mockFrom.insert).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'TRIP_ASSIGNED' }));
    });
  });

  describe('record', () => {
    it('records a generic double-entry and returns ID', async () => {
      // In record, insert is followed by select().single()
      mockFrom.insert.mockReturnThis();
      mockFrom.select.mockReturnThis();
      mockFrom.single.mockResolvedValue({ data: { id: 'gen-1' }, error: null });
      
      const result = await service.record({
        tenant_id: 't1',
        type: 'bonus',
        debit_account: 'platform',
        credit_account: 'driver-1',
        amount_cents: 1000
      });
      
      expect(result).toBe('gen-1');
    });
  });
});
