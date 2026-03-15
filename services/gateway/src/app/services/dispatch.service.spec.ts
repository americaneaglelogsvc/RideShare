/**
 * @req TRP-STM-0001 — Trip state machine transitions
 * @req DIS-OFR-0001 — Offer lifecycle state machine
 * @req DIS-REAL-0001 — Realtime dispatch
 */
import { DispatchService, TripStatus } from './dispatch.service';

describe('DispatchService', () => {
  let service: DispatchService;
  let mockFrom: any;
  let mockRpc: jest.Mock;
  let mockLedgerService: any;
  let mockRealtimeService: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    mockRpc = jest.fn();

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
        rpc: mockRpc,
      }),
    };

    mockRealtimeService = {
      emitTripStateChanged: jest.fn().mockResolvedValue(undefined),
    };

    mockLedgerService = {
      recordLedgerEvent: jest.fn().mockResolvedValue(undefined),
      recordTripFare: jest.fn().mockResolvedValue(undefined),
    };

    service = new DispatchService(
      mockSupabaseService as any,
      mockRealtimeService as any,
      mockLedgerService as any,
    );
  });

  // ─────────────────────────────────────────────────────────────
  // cancelTrip
  // ─────────────────────────────────────────────────────────────
  describe('cancelTrip', () => {
    it('returns success:false when trip not found', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'not found' } });
      const result = await service.cancelTrip('t1', 'trip-1', 'rider');
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('returns success:false when trip is completed (terminal state)', async () => {
      mockFrom.single
        .mockResolvedValueOnce({ data: { id: 'trip-1', status: TripStatus.COMPLETED, fare_cents: 2000 }, error: null })
        .mockResolvedValue({ data: null, error: null });
      const result = await service.cancelTrip('t1', 'trip-1', 'rider');
      expect(result.success).toBe(false);
      expect(result.message).toContain('cannot be cancelled');
    });

    it('applies no cancellation fee when rider cancels a REQUESTED trip', async () => {
      // Fetch trip → update to cancelled → decline offers
      mockFrom.single
        .mockResolvedValueOnce({ data: { id: 'trip-1', status: TripStatus.REQUESTED, fare_cents: 3000, driver_id: null }, error: null })
        .mockResolvedValue({ data: { id: 'trip-1', status: TripStatus.CANCELLED, cancellation_fee_cents: 0 }, error: null });

      const result = await service.cancelTrip('t1', 'trip-1', 'rider');
      expect(result.success).toBe(true);
      expect(result.cancellationFeeCents).toBe(0);
    });

    it('applies late-cancel fee ($5 flat + 10% fare) when rider cancels ASSIGNED trip', async () => {
      const fareCents = 2000;
      const expectedFee = 500 + Math.floor(fareCents * 0.10); // 500 + 200 = 700

      mockFrom.single
        .mockResolvedValueOnce({ data: { id: 'trip-1', status: TripStatus.ASSIGNED, fare_cents: fareCents, driver_id: 'drv-1' }, error: null })
        .mockResolvedValue({ data: { id: 'trip-1', status: TripStatus.CANCELLED, cancellation_fee_cents: expectedFee }, error: null });

      const result = await service.cancelTrip('t1', 'trip-1', 'rider', 'changed mind');
      expect(result.success).toBe(true);
      expect(result.cancellationFeeCents).toBe(expectedFee);
    });

    it('applies no fee when driver cancels', async () => {
      mockFrom.single
        .mockResolvedValueOnce({ data: { id: 'trip-1', status: TripStatus.ASSIGNED, fare_cents: 5000, driver_id: 'drv-1' }, error: null })
        .mockResolvedValue({ data: { id: 'trip-1', status: TripStatus.CANCELLED }, error: null });

      const result = await service.cancelTrip('t1', 'trip-1', 'driver');
      expect(result.success).toBe(true);
      expect(result.cancellationFeeCents).toBe(0);
    });

    it('records a TRIP_CANCELLED ledger event on success', async () => {
      mockFrom.single
        .mockResolvedValueOnce({ data: { id: 'trip-1', status: TripStatus.REQUESTED, fare_cents: 1000, driver_id: null }, error: null })
        .mockResolvedValue({ data: { id: 'trip-1', status: TripStatus.CANCELLED }, error: null });

      await service.cancelTrip('t1', 'trip-1', 'system');
      expect(mockLedgerService.recordLedgerEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'TRIP_CANCELLED', tripId: 'trip-1' }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // acceptOffer (atomic_assign_trip)
  // ─────────────────────────────────────────────────────────────
  describe('acceptOffer', () => {
    it('returns success:false when atomic_assign_trip returns assigned=false (race lost)', async () => {
      mockRpc.mockResolvedValue({ data: [{ assigned: false }], error: null });

      const result = await service.acceptOffer('t1', 'trip-1', 'drv-1');
      expect(result.success).toBe(false);
      expect(result.message).toContain('no longer available');
    });

    it('returns success:true and records ledger event when atomic assignment succeeds', async () => {
      mockRpc.mockResolvedValue({ data: [{ assigned: true }], error: null });
      mockFrom.single.mockResolvedValue({ data: { id: 'trip-1', fare_cents: 3000 }, error: null });

      const result = await service.acceptOffer('t1', 'trip-1', 'drv-1');
      expect(result.success).toBe(true);
      expect(mockLedgerService.recordLedgerEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'TRIP_ASSIGNED', tripId: 'trip-1', driverId: 'drv-1' }),
      );
    });

    it('emits TripStateChanged with ASSIGNED status on success', async () => {
      mockRpc.mockResolvedValue({ data: [{ assigned: true }], error: null });
      mockFrom.single.mockResolvedValue({ data: { id: 'trip-1', fare_cents: 1500 }, error: null });

      await service.acceptOffer('t1', 'trip-1', 'drv-1');
      expect(mockRealtimeService.emitTripStateChanged).toHaveBeenCalledWith(
        expect.objectContaining({ tripId: 'trip-1', status: TripStatus.ASSIGNED, driverId: 'drv-1' }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // startTrip
  // ─────────────────────────────────────────────────────────────
  describe('startTrip', () => {
    it('returns success:false when trip is not in ASSIGNED state (DB returns no row)', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'no rows' } });
      const result = await service.startTrip('t1', 'trip-1');
      expect(result.success).toBe(false);
    });

    it('records TRIP_STARTED ledger event and emits realtime on success', async () => {
      const trip = { id: 'trip-1', driver_id: 'drv-1', fare_cents: 2500 };
      mockFrom.single.mockResolvedValue({ data: trip, error: null });

      const result = await service.startTrip('t1', 'trip-1');
      expect(result.success).toBe(true);
      expect(mockLedgerService.recordLedgerEvent).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'TRIP_STARTED' }),
      );
      expect(mockRealtimeService.emitTripStateChanged).toHaveBeenCalledWith(
        expect.objectContaining({ status: TripStatus.ACTIVE }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // completeTrip
  // ─────────────────────────────────────────────────────────────
  describe('completeTrip', () => {
    it('returns success:false when trip is not ACTIVE (DB error)', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'no active trip' } });
      const result = await service.completeTrip('t1', 'trip-1');
      expect(result.success).toBe(false);
    });

    it('records trip fare via ledger on successful completion', async () => {
      const trip = { id: 'trip-1', driver_id: 'drv-1', fare_cents: 4000 };
      mockFrom.single
        .mockResolvedValueOnce({ data: trip, error: null })   // complete update
        .mockResolvedValue({ data: null, error: null });       // fee schedule

      const result = await service.completeTrip('t1', 'trip-1');
      expect(result.success).toBe(true);
      expect(mockLedgerService.recordTripFare).toHaveBeenCalledWith(
        expect.objectContaining({ tripId: 'trip-1', fareCents: 4000 }),
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // findAvailableDrivers
  // ─────────────────────────────────────────────────────────────
  describe('findAvailableDrivers', () => {
    it('returns empty array when DB returns error', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { message: 'db error' } });
      // findAvailableDrivers uses from().select()... without single() — mock the chain end
      mockFrom.order.mockResolvedValue({ data: null, error: { message: 'db error' } });

      const result = await service.findAvailableDrivers('t1', 41.8, -87.6, 'BLACK_SEDAN');
      expect(result).toEqual([]);
    });
  });
});
