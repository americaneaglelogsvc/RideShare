/**
 * @req DRV-PROF-010 — Driver profile management
 */
import { DriverService } from './driver.service';
import { DriverStatus } from '../dto/driver.dto';

describe('DriverService', () => {
  let service: DriverService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      ordered: jest.fn().mockReturnThis(), // Added to avoid missing method errors
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new DriverService(mockSupabaseService as any);
  });

  describe('updateStatus', () => {
    it('updates driver status and returns success', async () => {
      // resolveProfileId calls
      mockFrom.single.mockResolvedValueOnce({ data: { id: 'ident-1' }, error: null }); 
      mockFrom.single.mockResolvedValueOnce({ data: { id: 'prof-1' }, error: null }); 
      
      // update call
      mockFrom.single.mockResolvedValueOnce({ data: { status: 'online' }, error: null });

      const result = await service.updateStatus('t1', 'auth-1', { 
        status: DriverStatus.ONLINE 
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('online');
    });
  });

  describe('updateProfile', () => {
    it('updates personal info and returns full profile', async () => {
      const mockDriver = { id: 'drv-1', first_name: 'Alex', status: 'online', vehicles: [] };
      const mockLocation = { lat: 40, lng: -70 };

      // Manual mocks for all sequential single() calls
      mockFrom.single
        .mockResolvedValueOnce({ data: { id: 'ident-1' }, error: null }) // resolveProfileId (ident)
        .mockResolvedValueOnce({ data: { id: 'prof-1' }, error: null }) // resolveProfileId (profile)
        .mockResolvedValueOnce({ data: { id: 'prof-1' }, error: null }) // update().single()
        .mockResolvedValueOnce({ data: { id: 'ident-1' }, error: null }) // getProfile -> resolveProfileId (ident)
        .mockResolvedValueOnce({ data: { id: 'prof-1' }, error: null }) // getProfile -> resolveProfileId (profile)
        .mockResolvedValueOnce({ data: mockDriver, error: null }) // getProfile -> profiles fetch
        .mockResolvedValueOnce({ data: mockLocation, error: null }); // getProfile -> locations fetch

      const result = await service.updateProfile('t1', 'auth-1', { firstName: 'Alex' });
      expect(result.driver.firstName).toBe('Alex');
    });
  });
});
