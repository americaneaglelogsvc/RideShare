import { HourlyBookingService } from './hourly-booking.service';
import { BadRequestException } from '@nestjs/common';

describe('HourlyBookingService', () => {
  let service: HourlyBookingService;
  let mockSupabaseService: any;

  const makeMockClient = (overrides: Record<string, any> = {}) => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      ...overrides,
    }),
  });

  beforeEach(() => {
    mockSupabaseService = { getClient: jest.fn() };
    service = new HourlyBookingService(mockSupabaseService);
  });

  describe('createBooking', () => {
    it('should reject bookings shorter than 2 hours', async () => {
      await expect(
        service.createBooking({
          tenantId: 'ten-1', riderId: 'rider-1', driverCategory: 'black_sedan',
          pickupAddress: '123 Main St', pickupLat: 41.88, pickupLng: -87.63,
          scheduledStart: '2026-04-01T10:00:00Z', durationHours: 1,
        }),
      ).rejects.toThrow('Minimum hourly booking is 2 hours');
    });

    it('should reject bookings longer than 12 hours', async () => {
      await expect(
        service.createBooking({
          tenantId: 'ten-1', riderId: 'rider-1', driverCategory: 'black_sedan',
          pickupAddress: '123 Main St', pickupLat: 41.88, pickupLng: -87.63,
          scheduledStart: '2026-04-01T10:00:00Z', durationHours: 13,
        }),
      ).rejects.toThrow('Maximum hourly booking is 12 hours');
    });

    it('should create a valid 3-hour booking with default rate', async () => {
      // First call: tenant_pricing_policies query (returns null → default rate)
      // Second call: hourly_bookings insert
      const insertResult = {
        id: 'hb-1', tenant_id: 'ten-1', rider_id: 'rider-1',
        driver_id: null, status: 'pending', duration_hours: 3,
        hourly_rate_cents: 7500, estimated_total_cents: 22500,
        overage_rate_cents_per_min: 188, overage_minutes: 0,
        scheduled_start: '2026-04-01T10:00:00Z',
        actual_start: null, actual_end: null,
        actual_duration_minutes: null, actual_total_cents: null,
      };

      const calls: any[] = [];
      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockImplementation((table: string) => {
          calls.push(table);
          if (table === 'tenant_pricing_policies') {
            return {
              select: jest.fn().mockReturnThis(),
              eq: jest.fn().mockReturnThis(),
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          // hourly_bookings insert
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: insertResult, error: null }),
              }),
            }),
          };
        }),
      });

      const booking = await service.createBooking({
        tenantId: 'ten-1', riderId: 'rider-1', driverCategory: 'black_sedan',
        pickupAddress: '123 Main St', pickupLat: 41.88, pickupLng: -87.63,
        scheduledStart: '2026-04-01T10:00:00Z', durationHours: 3,
      });

      expect(booking.id).toBe('hb-1');
      expect(booking.durationHours).toBe(3);
      expect(booking.hourlyRateCents).toBe(7500);
      expect(booking.estimatedTotalCents).toBe(22500);
      expect(booking.status).toBe('pending');
    });
  });

  describe('completeBooking', () => {
    it('should calculate overage correctly', async () => {
      const startTime = new Date('2026-04-01T10:00:00Z');
      // Simulate 3h20m actual duration on a 3h booking → 20min overage
      const endTime = new Date(startTime.getTime() + (3 * 60 + 20) * 60_000);

      jest.useFakeTimers().setSystemTime(endTime);

      const booking = {
        id: 'hb-1', actual_start: startTime.toISOString(),
        duration_hours: 3, hourly_rate_cents: 7500,
        overage_rate_cents_per_min: 188, status: 'in_progress',
      };

      const updatedRow = {
        ...booking,
        status: 'completed',
        actual_end: endTime.toISOString(),
        actual_duration_minutes: 200,
        overage_minutes: 20,
        actual_total_cents: 7500 * 3 + 20 * 188, // 22500 + 3760 = 26260
        tenant_id: 'ten-1', rider_id: 'rider-1', driver_id: 'drv-1',
        estimated_total_cents: 22500, scheduled_start: startTime.toISOString(),
      };

      const callIdx = { n: 0 };
      mockSupabaseService.getClient.mockReturnValue({
        from: jest.fn().mockImplementation(() => {
          callIdx.n++;
          if (callIdx.n === 1) {
            // SELECT for the booking
            return {
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: booking, error: null }),
                  }),
                }),
              }),
            };
          }
          // UPDATE
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: updatedRow, error: null }),
                }),
              }),
            }),
          };
        }),
      });

      const result = await service.completeBooking('hb-1');
      expect(result.overageMinutes).toBe(20);
      expect(result.actualTotalCents).toBe(26260);
      expect(result.status).toBe('completed');

      jest.useRealTimers();
    });
  });
});
