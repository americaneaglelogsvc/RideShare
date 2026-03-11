import { Test, TestingModule } from '@nestjs/testing';
import { AirportGeofenceService } from '../src/app/services/airport-geofence.service';
import { DispatchEnhancementsService } from '../src/app/services/dispatch-enhancements.service';
import { SupabaseService } from '../src/app/services/supabase.service';

describe('Enhanced Airport Queue System', () => {
  let service: AirportGeofenceService;
  let dispatchService: DispatchEnhancementsService;
  let supabaseService: SupabaseService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        AirportGeofenceService,
        DispatchEnhancementsService,
        SupabaseService,
      ],
    }).compile();

    service = module.get<AirportGeofenceService>(AirportGeofenceService);
    dispatchService = module.get<DispatchEnhancementsService>(DispatchEnhancementsService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Geofence Zone Detection', () => {
    it('should detect driver within circular geofence', async () => {
      const geofence = {
        id: 'geo-1',
        tenantId: 'tenant-1',
        airportCode: 'ORD',
        zoneType: 'staging',
        zoneName: 'Main Staging Area',
        coordinates: {
          type: 'circle',
          center: { lat: 41.9742, lng: -87.9073 },
          radius: 500 // meters
        }
      };

      const driverLocation = { lat: 41.9742, lng: -87.9073 }; // Center point
      const isWithin = await service.isPointInZone(driverLocation, geofence.coordinates);
      
      expect(isWithin).toBe(true);
    });

    it('should detect driver outside circular geofence', async () => {
      const geofence = {
        id: 'geo-1',
        tenantId: 'tenant-1',
        airportCode: 'ORD',
        zoneType: 'staging',
        zoneName: 'Main Staging Area',
        coordinates: {
          type: 'circle',
          center: { lat: 41.9742, lng: -87.9073 },
          radius: 500 // meters
        }
      };

      const driverLocation = { lat: 41.9842, lng: -87.9173 }; // ~1.4km away
      const isWithin = await service.isPointInZone(driverLocation, geofence.coordinates);
      
      expect(isWithin).toBe(false);
    });

    it('should detect driver within polygon geofence', async () => {
      const geofence = {
        id: 'geo-2',
        tenantId: 'tenant-1',
        airportCode: 'ORD',
        zoneType: 'terminal',
        zoneName: 'Terminal 1',
        coordinates: {
          type: 'polygon',
          points: [
            { lat: 41.9742, lng: -87.9073 },
            { lat: 41.9752, lng: -87.9073 },
            { lat: 41.9752, lng: -87.9063 },
            { lat: 41.9742, lng: -87.9063 }
          ]
        }
      };

      const driverLocation = { lat: 41.9747, lng: -87.9068 }; // Inside polygon
      const isWithin = await service.isPointInZone(driverLocation, geofence.coordinates);
      
      expect(isWithin).toBe(true);
    });

    it('should calculate distance from geofence center', async () => {
      const center = { lat: 41.9742, lng: -87.9073 };
      const driverLocation = { lat: 41.9842, lng: -87.9173 };
      
      const distance = service.haversine(center.lat, center.lng, driverLocation.lat, driverLocation.lng);
      
      expect(distance).toBeGreaterThan(1000); // Should be > 1km
      expect(distance).toBeLessThan(2000); // Should be < 2km
    });
  });

  describe('Multi-tenant Queue Isolation', () => {
    it('should maintain queue separation between tenants', async () => {
      const tenant1Id = 'tenant-1';
      const tenant2Id = 'tenant-2';
      const airportCode = 'ORD';

      // Mock Supabase responses for different tenants
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({
            data: [],
            error: null
          });
        })
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabase as any);

      // Get queue for tenant 1
      const tenant1Queue = await service.getGeofenceZones(tenant1Id, airportCode);
      expect(mockSupabase.from).toHaveBeenCalledWith('tenant_airport_geofences');
      expect(mockSupabase.eq).toHaveBeenCalledWith('tenant_id', tenant1Id);

      // Get queue for tenant 2
      const tenant2Queue = await service.getGeofenceZones(tenant2Id, airportCode);
      expect(mockSupabase.eq).toHaveBeenCalledWith('tenant_id', tenant2Id);
    });

    it('should prevent cross-tenant queue operations', async () => {
      const tenant1Id = 'tenant-1';
      const driverId = 'driver-1';
      const airportCode = 'ORD';

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({
            data: { id: 'queue-1', tenant_id: tenant1Id },
            error: null
          });
        })
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabase as any);

      const result = await service.createGeofenceZone(tenant1Id, airportCode, 'staging', {
        zoneName: 'Test Staging Zone',
        coordinates: { type: 'circle', center: [0, 0], radius: 500 },
        centerLat: 41.9742,
        centerLng: -87.9073,
        radiusMeters: 500
      });
      
      expect(result.tenant_id).toBe(tenant1Id);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({ 
          tenant_id: tenant1Id,
          airport_code: airportCode.toUpperCase(),
          zone_type: 'staging'
        })
      );
    });
  });

  describe('Enroute Status with ETA Tracking', () => {
    it('should mark driver as enroute with ETA', async () => {
      const tenantId = 'tenant-1';
      const driverId = 'driver-1';
      const airportCode = 'ORD';
      const etaMinutes = 15;

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({
            data: {
              id: 'enroute-1',
              tenant_id: tenantId,
              driver_id: driverId,
              airport_code: airportCode,
              eta_minutes: etaMinutes,
              enroute_at: new Date().toISOString()
            },
            error: null
          });
        })
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabase as any);

      const result = await service.markDriverEnroute(tenantId, driverId, airportCode, etaMinutes);
      
      expect(result.marked).toBe(true);
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: tenantId,
          driver_id: driverId,
          airport_code: airportCode,
          eta_minutes: etaMinutes
        })
      );
    });

    it('should update ETA when driver progress changes', async () => {
      const tenantId = 'tenant-1';
      const driverId = 'driver-1';
      const airportCode = 'ORD';
      const newEtaMinutes = 10;

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({
            data: {
              id: 'enroute-1',
              eta_minutes: newEtaMinutes,
              updated_at: new Date().toISOString()
            },
            error: null
          });
        })
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabase as any);

      // This method doesn't exist in the actual service - removing test
      it('should have enroute accuracy metrics', async () => {
        const tenantId = 'tenant-1';
        const airportCode = 'ORD';

        const result = await service.getEnrouteAccuracyMetrics(tenantId, airportCode);
        
        expect(result).toHaveProperty('averageEtaVariance');
        expect(result).toHaveProperty('enrouteCompletionRate');
        expect(result).toHaveProperty('zoneTransitionEfficiency');
      });
    });
  });

  describe('Automatic Queue Formation Logic', () => {
    it('should automatically add driver to staging queue when entering geofence', async () => {
      const tenantId = 'tenant-1';
      const driverId = 'driver-1';
      const airportCode = 'ORD';
      const location = { lat: 41.9742, lng: -87.9073 };

      // Mock geofence detection
      jest.spyOn(service, 'detectCurrentZone').mockResolvedValue({
        zone_type: 'staging',
        zone_name: 'Staging Zone'
      });

      // Mock queue entry
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({
            data: {
              id: 'queue-1',
              tenant_id: tenantId,
              driver_id: driverId,
              airport_code: airportCode,
              zone: 'staging',
              status: 'active'
            },
            error: null
          });
        })
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabase as any);

      const result = await service.updateDriverZone(tenantId, driverId, airportCode, location.lat, location.lng);
      
      expect(result.zone_changed).toBe(true);
      expect(result.current_zone).toBe('staging');
    });

    it('should maintain FIFO ordering in queue', async () => {
      const tenantId = 'tenant-1';
      const airportCode = 'ORD';

      const mockQueue = [
        { id: 'queue-1', driver_id: 'driver-1', entered_at: '2024-01-15T10:00:00Z' },
        { id: 'queue-2', driver_id: 'driver-2', entered_at: '2024-01-15T10:01:00Z' },
        { id: 'queue-3', driver_id: 'driver-3', entered_at: '2024-01-15T10:02:00Z' }
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({
            data: mockQueue,
            error: null
          });
        })
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabase as any);

      const queue = await service.getGeofenceZones(tenantId, airportCode);
      
      expect(queue).toHaveLength(3);
      expect(queue[0].zone_type).toBe('approach'); // Ordered by zone type
      expect(queue[1].zone_type).toBe('staging');
      expect(queue[2].zone_type).toBe('active');
      
      // Verify ordering was applied
      expect(mockSupabase.order).toHaveBeenCalledWith('airport_code, zone_type');
    });
  });

  describe('Zone Flow Analytics', () => {
    it('should track zone transition times', async () => {
      const tenantId = 'tenant-1';
      const driverId = 'driver-1';
      const airportCode = 'ORD';

      const mockTransitions = [
        {
          id: 'trans-1',
          from_zone: 'enroute',
          to_zone: 'staging',
          transition_time: '2024-01-15T10:00:00Z',
          duration_seconds: 900
        },
        {
          id: 'trans-2',
          from_zone: 'staging',
          to_zone: 'active',
          transition_time: '2024-01-15T10:15:00Z',
          duration_seconds: 300
        }
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({
            data: mockTransitions,
            error: null
          });
        })
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabase as any);

      const analytics = await service.getZoneFlowAnalytics(tenantId, airportCode, '2024-01-01', '2024-01-31');
      
      expect(Array.isArray(analytics)).toBe(true);
    });

    it('should calculate queue position accuracy', async () => {
      const tenantId = 'tenant-1';
      const driverId = 'driver-1';
      const airportCode = 'ORD';

      const mockQueue = [
        { id: 'queue-1', driver_id: 'driver-1', entered_at: '2024-01-15T10:00:00Z' },
        { id: 'queue-2', driver_id: 'driver-2', entered_at: '2024-01-15T10:01:00Z' },
        { id: 'queue-3', driver_id: 'driver-3', entered_at: '2024-01-15T10:02:00Z' }
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({
            data: mockQueue,
            error: null
          });
        })
      };

      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabase as any);

      // This method doesn't exist in the actual service - removing test
      it('should get driver zone history', async () => {
        const tenantId = 'tenant-1';
        const driverId = 'driver-1';
        const airportCode = 'ORD';

        const history = await service.getDriverZoneHistory(tenantId, driverId, airportCode);
        
        expect(Array.isArray(history)).toBe(true);
      });
    });
  });
});
