import { Test, TestingModule } from '@nestjs/testing';
import { AirportQueueController } from '../../../services/gateway/src/app/controllers/airport-queue.controller';
import { AirportGeofenceService } from '../../../services/gateway/src/app/services/airport-geofence.service';
import { DispatchEnhancementsService } from '../../../services/gateway/src/app/services/dispatch-enhancements.service';
import { EnhancedDriverService } from '../../../services/gateway/src/app/services/enhanced-driver.service';

describe('AirportQueueController', () => {
  let controller: AirportQueueController;
  let airportGeofenceService: AirportGeofenceService;
  let dispatchEnhancementsService: DispatchEnhancementsService;
  let enhancedDriverService: EnhancedDriverService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AirportQueueController],
      providers: [
        {
          provide: AirportGeofenceService,
          useValue: {
            createGeofenceZone: jest.fn(),
            updateGeofenceZone: jest.fn(),
            getGeofenceZones: jest.fn(),
            deleteGeofenceZone: jest.fn(),
            detectCurrentZone: jest.fn(),
            formQueueFromZone: jest.fn(),
            getDriversInZone: jest.fn(),
            updateDriverZone: jest.fn(),
            markDriverEnroute: jest.fn(),
            getDriverZoneHistory: jest.fn(),
            getZoneFlowAnalytics: jest.fn(),
            getEnrouteAccuracyMetrics: jest.fn(),
            setupDefaultGeofences: jest.fn(),
          },
        },
        {
          provide: DispatchEnhancementsService,
          useValue: {
            markEnrouteToAirport: jest.fn(),
            getEnhancedQueuePosition: jest.fn(),
            getDriverZoneHistory: jest.fn(),
          },
        },
        {
          provide: EnhancedDriverService,
          useValue: {
            markEnrouteToAirport: jest.fn(),
            updateLocationWithZoneDetection: jest.fn(),
            getMultiTenantQueuePositions: jest.fn(),
            getEnhancedAirportQueuePosition: jest.fn(),
            getZoneHistory: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AirportQueueController>(AirportQueueController);
    airportGeofenceService = module.get<AirportGeofenceService>(AirportGeofenceService);
    dispatchEnhancementsService = module.get<DispatchEnhancementsService>(DispatchEnhancementsService);
    enhancedDriverService = module.get<EnhancedDriverService>(EnhancedDriverService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Enroute Management', () => {
    it('should mark driver as enroute to airport', async () => {
      const enrouteDto = {
        tenantId: 'tenant-1',
        driverId: 'driver-1',
        airportCode: 'ORD',
        etaMinutes: 15
      };

      const expectedResult = {
        marked: true,
        airportCode: 'ORD',
        etaMinutes: 15
      };

      jest.spyOn(enhancedDriverService, 'markEnrouteToAirport').mockResolvedValue(expectedResult);

      const result = await controller.markEnroute(enrouteDto);

      expect(enhancedDriverService.markEnrouteToAirport).toHaveBeenCalledWith(
        enrouteDto.tenantId,
        enrouteDto.driverId,
        enrouteDto
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('Zone-based Location Updates', () => {
    it('should update driver zone based on location', async () => {
      const zoneUpdateDto = {
        tenantId: 'tenant-1',
        driverId: 'driver-1',
        airportCode: 'ORD',
        lat: 41.9742,
        lng: -87.9073
      };

      const expectedResult = {
        success: true,
        message: 'Location and zone detection updated successfully'
      };

      jest.spyOn(enhancedDriverService, 'updateLocationWithZoneDetection').mockResolvedValue(expectedResult);

      const result = await controller.updateDriverZone(zoneUpdateDto);

      expect(enhancedDriverService.updateLocationWithZoneDetection).toHaveBeenCalledWith(
        zoneUpdateDto.tenantId,
        zoneUpdateDto.driverId,
        {
          lat: zoneUpdateDto.lat,
          lng: zoneUpdateDto.lng,
          heading: 0,
          speed: 0
        }
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('Multi-tenant Queue Positions', () => {
    it('should get multi-tenant queue positions for driver', async () => {
      const driverId = 'driver-1';
      const expectedPositions = [
        {
          airportCode: 'ORD',
          tenantId: 'tenant-1',
          tenantName: 'Tenant 1',
          currentZone: 'staging',
          etaMinutes: 15,
          zoneStatus: 'enroute',
          queuePosition: null,
          totalInQueue: 0,
          estimatedWaitMinutes: null
        }
      ];

      jest.spyOn(enhancedDriverService, 'getMultiTenantQueuePositions').mockResolvedValue(expectedPositions);

      const result = await controller.getMultiTenantPositions(driverId);

      expect(enhancedDriverService.getMultiTenantQueuePositions).toHaveBeenCalledWith(driverId);
      expect(result).toEqual(expectedPositions);
    });

    it('should get enhanced queue position for specific tenant', async () => {
      const tenantId = 'tenant-1';
      const driverId = 'driver-1';
      const airportCode = 'ORD';

      const expectedPosition = {
        position: 1,
        totalInQueue: 5,
        estimatedWaitMinutes: 8,
        zoneStatus: 'active',
        currentZone: 'staging'
      };

      jest.spyOn(enhancedDriverService, 'getEnhancedAirportQueuePosition').mockResolvedValue(expectedPosition);

      const result = await controller.getEnhancedQueuePosition(tenantId, driverId, airportCode);

      expect(enhancedDriverService.getEnhancedAirportQueuePosition).toHaveBeenCalledWith(
        tenantId,
        driverId,
        airportCode
      );
      expect(result).toEqual(expectedPosition);
    });
  });

  describe('Geofence Management', () => {
    it('should create geofence zone', async () => {
      const geofenceDto = {
        tenantId: 'tenant-1',
        airportCode: 'ORD',
        zoneType: 'staging',
        zoneName: 'Main Staging Area',
        coordinates: {
          type: 'circle',
          center: [ -87.9073, 41.9742 ],
          radius: 500
        },
        centerLat: 41.9742,
        centerLng: -87.9073,
        radiusMeters: 500,
        isActive: true
      };

      const expectedResult = {
        id: 'geofence-1',
        tenant_id: 'tenant-1',
        airport_code: 'ORD',
        zone_type: 'staging',
        zone_name: 'Main Staging Area',
        is_active: true
      };

      jest.spyOn(airportGeofenceService, 'createGeofenceZone').mockResolvedValue(expectedResult);

      const result = await controller.createGeofence(geofenceDto);

      expect(airportGeofenceService.createGeofenceZone).toHaveBeenCalledWith(
        geofenceDto.tenantId,
        geofenceDto.airportCode,
        geofenceDto.zoneType,
        geofenceDto
      );
      expect(result).toEqual(expectedResult);
    });

    it('should get geofences for tenant and airport', async () => {
      const tenantId = 'tenant-1';
      const airportCode = 'ORD';

      const expectedGeofences = [
        {
          id: 'geofence-1',
          tenant_id: 'tenant-1',
          airport_code: 'ORD',
          zone_type: 'staging',
          zone_name: 'Main Staging Area',
          is_active: true
        }
      ];

      jest.spyOn(airportGeofenceService, 'getGeofenceZones').mockResolvedValue(expectedGeofences);

      const result = await controller.getGeofences(tenantId, airportCode);

      expect(airportGeofenceService.getGeofenceZones).toHaveBeenCalledWith(tenantId, airportCode);
      expect(result).toEqual(expectedGeofences);
    });

    it('should get all geofences for tenant', async () => {
      const tenantId = 'tenant-1';

      const expectedGeofences = [
        {
          id: 'geofence-1',
          tenant_id: 'tenant-1',
          airport_code: 'ORD',
          zone_type: 'staging',
          is_active: true
        },
        {
          id: 'geofence-2',
          tenant_id: 'tenant-1',
          airport_code: 'MDW',
          zone_type: 'staging',
          is_active: true
        }
      ];

      jest.spyOn(airportGeofenceService, 'getGeofenceZones').mockResolvedValue(expectedGeofences);

      const result = await controller.getAllGeofences(tenantId);

      expect(airportGeofenceService.getGeofenceZones).toHaveBeenCalledWith(tenantId);
      expect(result).toEqual(expectedGeofences);
    });

    it('should update geofence zone', async () => {
      const tenantId = 'tenant-1';
      const zoneId = 'geofence-1';
      const updateDto = {
        zoneName: 'Updated Staging Area',
        radiusMeters: 600,
        isActive: true
      };

      const expectedResult = {
        id: 'geofence-1',
        tenant_id: 'tenant-1',
        zone_name: 'Updated Staging Area',
        radius_meters: 600,
        is_active: true,
        updated_at: new Date().toISOString()
      };

      jest.spyOn(airportGeofenceService, 'updateGeofenceZone').mockResolvedValue(expectedResult);

      const result = await controller.updateGeofence(tenantId, zoneId, updateDto);

      expect(airportGeofenceService.updateGeofenceZone).toHaveBeenCalledWith(tenantId, zoneId, updateDto);
      expect(result).toEqual(expectedResult);
    });

    it('should delete geofence zone', async () => {
      const tenantId = 'tenant-1';
      const zoneId = 'geofence-1';

      const expectedResult = { deleted: true };

      jest.spyOn(airportGeofenceService, 'deleteGeofenceZone').mockResolvedValue(expectedResult);

      const result = await controller.deleteGeofence(tenantId, zoneId);

      expect(airportGeofenceService.deleteGeofenceZone).toHaveBeenCalledWith(tenantId, zoneId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('Zone Detection', () => {
    it('should detect current zone for driver location', async () => {
      const tenantId = 'tenant-1';
      const airportCode = 'ORD';
      const lat = 41.9742;
      const lng = -87.9073;

      const expectedZone = {
        zone_type: 'staging',
        zone_name: 'Main Staging Area',
        airport_code: 'ORD'
      };

      jest.spyOn(airportGeofenceService, 'detectCurrentZone').mockResolvedValue(expectedZone);

      const result = await controller.detectCurrentZone(tenantId, airportCode, lat, lng);

      expect(airportGeofenceService.detectCurrentZone).toHaveBeenCalledWith(tenantId, lat, lng, airportCode);
      expect(result).toEqual(expectedZone);
    });
  });

  describe('Queue Management', () => {
    it('should form queue from zone', async () => {
      const tenantId = 'tenant-1';
      const airportCode = 'ORD';
      const zoneType = 'staging';

      const expectedResult = 5; // Number of drivers added to queue

      jest.spyOn(airportGeofenceService, 'formQueueFromZone').mockResolvedValue(expectedResult);

      const result = await controller.formQueueFromZone(tenantId, airportCode, zoneType);

      expect(airportGeofenceService.formQueueFromZone).toHaveBeenCalledWith(tenantId, airportCode, zoneType);
      expect(result).toEqual(expectedResult);
    });

    it('should get drivers in zone', async () => {
      const tenantId = 'tenant-1';
      const airportCode = 'ORD';
      const zoneType = 'staging';

      const expectedDrivers = [
        {
          driver_id: 'driver-1',
          driver_name: 'John Driver',
          vehicle_type: 'sedan',
          entered_at: new Date().toISOString()
        },
        {
          driver_id: 'driver-2',
          driver_name: 'Jane Driver',
          vehicle_type: 'suv',
          entered_at: new Date().toISOString()
        }
      ];

      jest.spyOn(airportGeofenceService, 'getDriversInZone').mockResolvedValue(expectedDrivers);

      const result = await controller.getDriversInZone(tenantId, airportCode, zoneType);

      expect(airportGeofenceService.getDriversInZone).toHaveBeenCalledWith(tenantId, airportCode, zoneType);
      expect(result).toEqual(expectedDrivers);
    });
  });

  describe('Zone History', () => {
    it('should get zone history for driver', async () => {
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

      jest.spyOn(enhancedDriverService, 'getZoneHistory').mockResolvedValue(expectedHistory);

      const result = await controller.getZoneHistory(tenantId, driverId, airportCode);

      expect(enhancedDriverService.getZoneHistory).toHaveBeenCalledWith(tenantId, driverId, airportCode);
      expect(result).toEqual(expectedHistory);
    });
  });

  describe('Analytics', () => {
    it('should get zone flow analytics', async () => {
      const analyticsDto = {
        tenantId: 'tenant-1',
        airportCode: 'ORD',
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const expectedAnalytics = [
        {
          zone_type: 'staging',
          total_transitions: 150,
          average_duration_seconds: 450,
          efficiency_rate: 85.5
        },
        {
          zone_type: 'active',
          total_transitions: 120,
          average_duration_seconds: 300,
          efficiency_rate: 92.1
        }
      ];

      jest.spyOn(airportGeofenceService, 'getZoneFlowAnalytics').mockResolvedValue(expectedAnalytics);

      const result = await controller.getZoneFlowAnalytics(analyticsDto);

      expect(airportGeofenceService.getZoneFlowAnalytics).toHaveBeenCalledWith(
        analyticsDto.tenantId,
        analyticsDto.airportCode,
        analyticsDto.startDate,
        analyticsDto.endDate
      );
      expect(result).toEqual(expectedAnalytics);
    });

    it('should get enroute accuracy metrics', async () => {
      const tenantId = 'tenant-1';
      const airportCode = 'ORD';

      const expectedMetrics = {
        averageEtaVariance: 2.5,
        enrouteCompletionRate: 94.2,
        zoneTransitionEfficiency: 87.8
      };

      jest.spyOn(airportGeofenceService, 'getEnrouteAccuracyMetrics').mockResolvedValue(expectedMetrics);

      const result = await controller.getEnrouteAccuracyMetrics(tenantId, airportCode);

      expect(airportGeofenceService.getEnrouteAccuracyMetrics).toHaveBeenCalledWith(tenantId, airportCode);
      expect(result).toEqual(expectedMetrics);
    });
  });

  describe('Default Geofence Setup', () => {
    it('should setup default geofences for airport', async () => {
      const tenantId = 'tenant-1';
      const airportCode = 'ORD';
      const lat = 41.9742;
      const lng = -87.9073;

      const expectedGeofences = [
        {
          id: 'geofence-1',
          zone_type: 'approach',
          zone_name: 'ORD Approach Zone',
          is_active: true
        },
        {
          id: 'geofence-2',
          zone_type: 'staging',
          zone_name: 'ORD Staging Zone',
          is_active: true
        },
        {
          id: 'geofence-3',
          zone_type: 'active',
          zone_name: 'ORD Active Queue Zone',
          is_active: true
        },
        {
          id: 'geofence-4',
          zone_type: 'pickup',
          zone_name: 'ORD Pickup Zone',
          is_active: true
        }
      ];

      jest.spyOn(airportGeofenceService, 'setupDefaultGeofences').mockResolvedValue(expectedGeofences);

      const result = await controller.setupDefaultGeofences(tenantId, airportCode, lat, lng);

      expect(airportGeofenceService.setupDefaultGeofences).toHaveBeenCalledWith(tenantId, airportCode, lat, lng);
      expect(result).toEqual(expectedGeofences);
    });
  });
});
