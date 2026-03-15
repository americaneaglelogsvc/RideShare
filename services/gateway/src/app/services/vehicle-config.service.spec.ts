/**
 * @req VEH-CAT-010 — Vehicle category configuration per tenant
 */
import { VehicleConfigService } from './vehicle-config.service';

describe('VehicleConfigService', () => {
  let service: VehicleConfigService;
  let mockFrom: any;

  beforeEach(() => {
    mockFrom = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(),
      single: jest.fn(),
    };

    const mockSupabaseService = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue(mockFrom),
      }),
    };

    service = new VehicleConfigService(mockSupabaseService as any);
  });

  describe('createVehicleConfig', () => {
    const validReq = {
      vehicle_type: 'luxury_sedan', display_name: 'Luxury Sedan', passenger_capacity: 4,
      luggage_capacity: 'medium', base_rate_cents: 800, per_mile_rate_cents: 300, per_minute_rate_cents: 75,
    };

    it('throws BadRequestException when vehicle type already exists', async () => {
      mockFrom.maybeSingle.mockResolvedValue({ data: { id: 'existing' }, error: null });
      await expect(service.createVehicleConfig('t1', validReq)).rejects.toThrow("already exists");
    });

    it('creates vehicle config successfully', async () => {
      // not existing
      mockFrom.maybeSingle.mockResolvedValue({ data: null, error: null });
      const config = { id: 'vc-1', tenant_id: 't1', vehicle_type: 'luxury_sedan' };
      mockFrom.single.mockResolvedValue({ data: config, error: null });

      const result = await service.createVehicleConfig('t1', validReq);
      expect(result.vehicle_type).toBe('luxury_sedan');
    });

    it('throws BadRequestException when required fields are missing', async () => {
      await expect(service.createVehicleConfig('t1', {
        vehicle_type: '', display_name: '', passenger_capacity: 0,
        luggage_capacity: 'medium', base_rate_cents: 0, per_mile_rate_cents: 0, per_minute_rate_cents: 0,
      })).rejects.toThrow('required');
    });
  });

  describe('getVehicleConfigs', () => {
    it('returns tenant-scoped vehicle configs', async () => {
      const configs = [
        { id: 'vc-1', vehicle_type: 'luxury_sedan', display_name: 'Luxury Sedan' },
        { id: 'vc-2', vehicle_type: 'luxury_suv', display_name: 'Luxury SUV' },
      ];
      mockFrom.order = jest.fn().mockResolvedValue({ data: configs, error: null });
      const result = await service.getVehicleConfigs('t1');
      expect(result).toHaveLength(2);
    });

    it('throws on DB error', async () => {
      mockFrom.order = jest.fn().mockResolvedValue({ data: null, error: { message: 'db error' } });
      await expect(service.getVehicleConfigs('t1')).rejects.toThrow('Failed to fetch vehicle configs');
    });
  });

  describe('getVehicleConfigByType', () => {
    it('returns config when found and active', async () => {
      const config = { id: 'vc-1', vehicle_type: 'luxury_sedan', is_active: true };
      mockFrom.single.mockResolvedValue({ data: config, error: null });
      const result = await service.getVehicleConfigByType('t1', 'luxury_sedan');
      expect(result?.vehicle_type).toBe('luxury_sedan');
    });

    it('returns null when vehicle type not found', async () => {
      mockFrom.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
      const result = await service.getVehicleConfigByType('t1', 'motorbike');
      expect(result).toBeNull();
    });
  });

  describe('updateVehicleConfig', () => {
    it('updates vehicle config fields', async () => {
      const updated = { id: 'vc-1', vehicle_type: 'luxury_sedan', per_mile_rate_cents: 350 };
      mockFrom.single.mockResolvedValue({ data: updated, error: null });
      const result = await service.updateVehicleConfig('t1', 'luxury_sedan', { per_mile_rate_cents: 350 });
      expect(result.per_mile_rate_cents).toBe(350);
    });
  });

  describe('getVehicleCategories', () => {
    it('returns mapped VehicleCategory array', async () => {
      // getVehicleCategories delegates to getVehicleConfigs
      const configs = [{ id: 'vc-1', vehicle_type: 'luxury_sedan', display_name: 'Luxury Sedan',
        passenger_capacity: 4, luggage_capacity: 'medium', features: [],
        base_rate_cents: 800, per_mile_rate_cents: 300, per_minute_rate_cents: 75, is_active: true }];
      mockFrom.order = jest.fn().mockResolvedValue({ data: configs, error: null });
      const result = await service.getVehicleCategories('t1');
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('luxury_sedan');
      expect(result[0].pricing.base).toBe(8.00);
    });
  });
});
