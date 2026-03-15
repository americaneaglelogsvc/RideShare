/**
 * @req DIS-RSV-010 — Advanced trip reservations
 */
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    // Mocks for constructor dependencies
    const mockDispatchService = { dispatchRide: jest.fn() };
    const mockPricingService = { calculateQuote: jest.fn() };

    service = new ReservationsService(
      mockSupabaseService as any,
      mockDispatchService as any,
      mockPricingService as any
    );
  });

  describe('createBooking', () => {
    it('creates a booking from a quote', async () => {
      const booking = { id: 'book-1', status: 'pending' };
      // Mock quote lookup
      mockFrom.select.mockReturnThis();
      mockFrom.single.mockResolvedValueOnce({ 
        data: { 
          id: 'q1', 
          pickup_location: {}, 
          dropoff_location: {}, 
          category: 'std', 
          total_cents: 1000 
        }, 
        error: null 
      });

      // Mock rider lookup/create
      mockFrom.single.mockResolvedValueOnce({ data: { id: 'rider-1' }, error: null });

      // Mock dispatch
      (service as any).dispatchService.dispatchRide.mockResolvedValue('trip-1');

      // Mock booking insert
      mockFrom.single.mockResolvedValueOnce({ data: booking, error: null });

      const result = await service.createBooking({
        tenantId: 't1',
        quote_id: 'quote-123',
        rider_name: 'John Rider',
        rider_phone: '+15550001111',
        pickup_time: new Date().toISOString()
      });
      expect(result.booking_id).toBe('book-1');
    });
  });

  describe('getBookingStatus', () => {
    it('returns status and driver info', async () => {
      const mockBooking = {
        id: 'book-1',
        status: 'assigned',
        trips: {
          status: 'en_route',
          driver_profiles: {
            first_name: 'Max',
            last_name: 'Driver',
            phone: '5550001234',
            vehicles: [{ year: 2022, make: 'Toyota', model: 'Camry', license_plate: 'XYZ-123' }]
          }
        }
      };
      mockFrom.single.mockResolvedValue({ data: mockBooking, error: null });

      const result = await service.getBookingStatus('book-1', 't1');
      expect(result.booking_id).toBe('book-1');
      expect(result.driver_info?.name).toContain('Max');
    });
  });

  describe('cancelBooking', () => {
    it('marks booking and trip as cancelled', async () => {
      mockFrom.single.mockResolvedValue({ data: { trip_id: 'trip-1' }, error: null });
      mockFrom.update.mockReturnThis();
      mockFrom.eq.mockReturnThis();
      
      const result = await service.cancelBooking('book-1', 't1');
      expect(result.success).toBe(true);
    });
  });
});
