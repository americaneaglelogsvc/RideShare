import { Test, TestingModule } from '@nestjs/testing';
import { EnhancedDriverService } from '../../../services/gateway/src/app/services/enhanced-driver.service';
import { SupabaseService } from '../../../services/gateway/src/app/services/supabase.service';
import { DispatchEnhancementsService } from '../../../services/gateway/src/app/services/dispatch-enhancements.service';
import { AirportGeofenceService } from '../../../services/gateway/src/app/services/airport-geofence.service';

describe('EnhancedDriverService Integration', () => {
  let service: EnhancedDriverService;
  let supabaseService: SupabaseService;
  let dispatchEnhancementsService: DispatchEnhancementsService;
  let airportGeofenceService: AirportGeofenceService;
  let module: TestingModule;

  beforeAll(async () => {
    const mockSupabase = {
      getClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({ data: null, error: null });
        })
      })
    };

    const mockDispatchService = {
      markEnrouteToAirport: jest.fn(),
      enterQueueFromZone: jest.fn(),
      getEnhancedQueuePosition: jest.fn(),
      getDriverZoneHistory: jest.fn(),
      getGrabBoard: jest.fn(),
      claimFromGrabBoard: jest.fn()
    };

    const mockGeofenceService = {
      updateDriverZone: jest.fn(),
      detectCurrentZone: jest.fn()
    };

    module = await Test.createTestingModule({
      providers: [
        EnhancedDriverService,
        {
          provide: SupabaseService,
          useValue: mockSupabase
        },
        {
          provide: DispatchEnhancementsService,
          useValue: mockDispatchService
        },
        {
          provide: AirportGeofenceService,
          useValue: mockGeofenceService
        }
      ],
    }).compile();

    service = module.get<EnhancedDriverService>(EnhancedDriverService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
    dispatchEnhancementsService = module.get<DispatchEnhancementsService>(DispatchEnhancementsService);
    airportGeofenceService = module.get<AirportGeofenceService>(AirportGeofenceService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Location Updates with Zone Detection', () => {
    it('should update location and detect zone transitions', async () => {
      const tenantId = 'tenant-1';
      const driverId = 'driver-1';
      const location = {
        lat: 41.9742,
        lng: -87.9073,
        heading: 90,
        speed: 25
      };

      // Mock successful location update
      const mockSupabaseClient = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({ data: { id: 'location-1' }, error: null });
        })
      };
      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabaseClient);

      // Mock zone detection - driver enters staging zone
      const zoneUpdateResult = {
        previousZone: 'enroute',
        currentZone: 'staging',
        zoneChanged: true
      };
      jest.spyOn(airportGeofenceService, 'updateDriverZone').mockResolvedValue(zoneUpdateResult);

      // Mock automatic queue entry
      jest.spyOn(dispatchEnhancementsService, 'enterQueueFromZone').mockResolvedValue({
        id: 'queue-1',
        status: 'active'
      });

      const result = await service.updateLocationWithZoneDetection(tenantId, driverId, location);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Location and zone detection updated successfully');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: tenantId,
          driver_id: driverId,
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          speed: location.speed
        })
      );
      expect(airportGeofenceService.updateDriverZone).toHaveBeenCalledWith(
        tenantId, driverId, 'ORD', location.lat, location.lng
      );
      expect(dispatchEnhancementsService.enterQueueFromZone).toHaveBeenCalledWith(
        tenantId, driverId, 'ORD', 'active'
      );
    });

    it('should handle location update failure gracefully', async () => {
      const tenantId = 'tenant-1';
      const driverId = 'driver-1';
      const location = {
        lat: 41.9742,
        lng: -87.9073,
        heading: 90,
        speed: 25
      };

      // Mock database error
      const mockSupabaseClient = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({ data: null, error: 'Database connection failed' });
        })
      };
      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabaseClient);

      await expect(service.updateLocationWithZoneDetection(tenantId, driverId, location))
        .rejects.toThrow('Location update failed');
    });

    it('should continue location update even if zone detection fails', async () => {
      const tenantId = 'tenant-1';
      const driverId = 'driver-1';
      const location = {
        lat: 41.9742,
        lng: -87.9073,
        heading: 90,
        speed: 25
      };

      // Mock successful location update
      const mockSupabaseClient = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({ data: { id: 'location-1' }, error: null });
        })
      };
      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabaseClient);

      // Mock zone detection failure
      jest.spyOn(airportGeofenceService, 'updateDriverZone').mockRejectedValue(new Error('Zone detection failed'));

      const result = await service.updateLocationWithZoneDetection(tenantId, driverId, location);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Location and zone detection updated successfully');
    });
  });

  describe('Enroute Management', () => {
    it('should mark driver as enroute to airport', async () => {
      const tenantId = 'tenant-1';
      const driverId = 'driver-1';
      const enrouteDto = {
        tenantId: tenantId,
        driverId: driverId,
        airportCode: 'ORD',
        etaMinutes: 15
      };

      const expectedResult = {
        marked: true,
        airportCode: 'ORD',
        etaMinutes: 15
      };

      jest.spyOn(dispatchEnhancementsService, 'markEnrouteToAirport').mockResolvedValue(expectedResult);

      const result = await service.markEnrouteToAirport(tenantId, driverId, enrouteDto);

      expect(result).toEqual(expectedResult);
      expect(dispatchEnhancementsService.markEnrouteToAirport).toHaveBeenCalledWith(
        tenantId,
        driverId,
        enrouteDto.airportCode,
        enrouteDto.etaMinutes
      );
    });
  });

  describe('Multi-tenant Queue Operations', () => {
    it('should get queue positions across multiple tenants', async () => {
      const driverId = 'driver-1';

      // Mock driver tenants
      const mockSupabaseClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({
            data: [
              { tenant_id: 'tenant-1' },
              { tenant_id: 'tenant-2' }
            ],
            error: null
          });
        })
      };
      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabaseClient);

      // Mock enroute status for tenant 1
      mockSupabaseClient.from = jest.fn().mockReturnThis();
      mockSupabaseClient.select = jest.fn().mockReturnThis();
      mockSupabaseClient.eq = jest.fn().mockReturnThis();
      mockSupabaseClient.in = jest.fn().mockReturnThis();
      mockSupabaseClient.then = jest.fn().mockImplementation((callback) => {
        return callback({
          data: [
            {
              airport_code: 'ORD',
              current_zone: 'staging',
              eta_minutes: 15,
              status: 'enroute'
            }
          ],
          error: null
        });
      });

      // Mock queue data for tenant 1
      mockSupabaseClient.from = jest.fn().mockReturnThis();
      mockSupabaseClient.select = jest.fn().mockReturnThis();
      mockSupabaseClient.eq = jest.fn().mockReturnThis();
      mockSupabaseClient.in = jest.fn().mockReturnThis();
      mockSupabaseClient.then = jest.fn().mockImplementation((callback) => {
        return callback({
          data: [
            {
              airport_code: 'ORD',
              status: 'prequeue',
              zone_type: 'staging'
            }
          ],
          error: null
        });
      });

      const result = await service.getMultiTenantQueuePositions(driverId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          airportCode: 'ORD',
          tenantId: 'tenant-1',
          currentZone: 'staging',
          etaMinutes: 15,
          zoneStatus: 'enroute'
        })
      );
    });

    it('should return empty array for driver with no active tenants', async () => {
      const driverId = 'driver-1';

      // Mock no active tenants
      const mockSupabaseClient = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return callback({ data: [], error: null });
        })
      };
      jest.spyOn(supabaseService, 'getClient').mockReturnValue(mockSupabaseClient);

      const result = await service.getMultiTenantQueuePositions(driverId);

      expect(result).toHaveLength(0);
    });
  });

  describe('Enhanced Queue Position Tracking', () => {
    it('should get enhanced queue position with detailed metrics', async () => {
      const tenantId = 'tenant-1';
      const driverId = 'driver-1';
      const airportCode = 'ORD';

      const expectedPosition = {
        position: 3,
        totalInQueue: 8,
        estimatedWaitMinutes: 24,
        zoneStatus: 'active',
        currentZone: 'staging',
        enteredAt: '2024-01-15T10:00:00Z'
      };

      jest.spyOn(dispatchEnhancementsService, 'getEnhancedQueuePosition').mockResolvedValue(expectedPosition);

      const result = await service.getEnhancedAirportQueuePosition(tenantId, driverId, airportCode);

      expect(result).toEqual(expectedPosition);
      expect(dispatchEnhancementsService.getEnhancedQueuePosition).toHaveBeenCalledWith(
        tenantId, driverId, airportCode
      );
    });
  });

  describe('Zone History Tracking', () => {
    it('should get comprehensive zone history for driver', async () => {
      const tenantId = 'tenant-1';
      const driverId = 'driver-1';
      const airportCode = 'ORD';

      const expectedHistory = [
        {
          id: 'transition-1',
          from_zone: 'enroute',
          to_zone: 'staging',
          transition_time: '2024-01-15T10:00:00Z',
          duration_seconds: 900
        },
        {
          id: 'transition-2',
          from_zone: 'staging',
          to_zone: 'active',
          transition_time: '2024-01-15T10:15:00Z',
          duration_seconds: 300
        }
      ];

      jest.spyOn(dispatchEnhancementsService, 'getDriverZoneHistory').mockResolvedValue(expectedHistory);

      const result = await service.getZoneHistory(tenantId, driverId, airportCode);

      expect(result).toEqual(expectedHistory);
      expect(dispatchEnhancementsService.getDriverZoneHistory).toHaveBeenCalledWith(
        tenantId, driverId, airportCode
      );
    });
  });

  describe('Grab Board Integration', () => {
    it('should get available trips from grab board', async () => {
      const tenantId = 'tenant-1';
      const driverId = 'driver-1';
      const lat = 41.9742;
      const lng = -87.9073;
      const radius = 5;

      const expectedTrips = [
        {
          id: 'trip-1',
          pickup: '123 N Michigan Ave',
          dropoff: "O'Hare Airport",
          price: 45.50,
          distance: 3.2
        },
        {
          id: 'trip-2',
          pickup: '500 N Wells St',
          dropoff: 'Union Station',
          price: 32.25,
          distance: 2.1
        }
      ];

      jest.spyOn(dispatchEnhancementsService, 'getGrabBoard').mockResolvedValue(expectedTrips);

      const result = await service.getAvailableGrabBoard(tenantId, driverId, lat, lng, radius);

      expect(result).toEqual(expectedTrips);
      expect(dispatchEnhancementsService.getGrabBoard).toHaveBeenCalledWith(
        tenantId, lat, lng, radius
      );
    });

    it('should claim trip from grab board', async () => {
      const tenantId = 'tenant-1';
      const driverId = 'driver-1';
      const tripId = 'trip-1';

      const expectedResult = {
        success: true,
        tripId: 'trip-1',
        claimedAt: new Date().toISOString()
      };

      jest.spyOn(dispatchEnhancementsService, 'claimFromGrabBoard').mockResolvedValue(expectedResult);

      const result = await service.claimGrabBoardTrip(tenantId, driverId, tripId);

      expect(result).toEqual(expectedResult);
      expect(dispatchEnhancementsService.claimFromGrabBoard).toHaveBeenCalledWith(
        tripId, driverId, tenantId
      );
    });
  });
});
