import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { 
  DriverAuthDto, 
  DriverRegistrationDto, 
  DriverStatusUpdateDto, 
  LocationUpdateDto, 
  RideOfferResponseDto, 
  DriverStatus 
} from '../dto/driver.dto';
import { SupabaseService } from './supabase.service';
import { DispatchEnhancementsService } from './dispatch-enhancements.service';
import { AirportGeofenceService } from './airport-geofence.service';

// DTOs for enhanced functionality
export class EnrouteDto {
  tenantId!: string;
  driverId!: string;
  airportCode!: string;
  etaMinutes!: number;
}

export class MultiTenantQueuePositionDto {
  airportCode!: string;
  tenantId!: string;
  tenantName!: string;
  currentZone!: string;
  etaMinutes!: number;
  zoneStatus!: string;
  queuePosition!: string;
  totalInQueue!: number;
  estimatedWaitMinutes!: number;
}

@Injectable()
export class EnhancedDriverService {
  private readonly logger = new Logger(EnhancedDriverService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly dispatchEnhancementsService: DispatchEnhancementsService,
    private readonly airportGeofenceService: AirportGeofenceService,
  ) {}

  async updateLocationWithZoneDetection(tenantId: string, driverId: string, location: LocationUpdateDto) {
    // Update basic location first
    const supabase = this.supabaseService.getClient();
    
    try {
      // Insert new location record
      const { error } = await supabase
        .from('driver_locations')
        .insert({
          tenant_id: tenantId,
          driver_id: driverId,
          lat: location.lat,
          lng: location.lng,
          heading: location.heading,
          speed: location.speed,
        });

      if (error) {
        throw new BadRequestException('Failed to update location');
      }
    } catch (error: any) {
      this.logger.error('Location update failed:', error);
      throw new BadRequestException('Location update failed');
    }

    // Check for airport zone transitions
    const airports = ['ORD', 'MDW']; // Could be made configurable per tenant
    
    for (const airportCode of airports) {
      try {
        const zoneUpdate = await this.airportGeofenceService.updateDriverZone(
          tenantId, 
          driverId, 
          airportCode, 
          location.lat, 
          location.lng
        );

        if (zoneUpdate.zoneChanged) {
          this.logger.log(`Driver ${driverId} zone changed at ${airportCode}: ${zoneUpdate.previousZone} → ${zoneUpdate.currentZone}`);
          
          // Handle zone transition logic
          if (zoneUpdate.currentZone === 'active' && zoneUpdate.previousZone !== 'active') {
            await this.dispatchEnhancementsService.enterQueueFromZone(tenantId, driverId, airportCode, 'active');
          }
        }
      } catch (error: any) {
        // Log but don't fail the location update if zone detection fails
        this.logger.warn(`Zone detection failed for ${airportCode}: ${error.message}`);
      }
    }

    return {
      success: true,
      message: 'Location and zone detection updated successfully',
    };
  }

  async markEnrouteToAirport(tenantId: string, driverId: string, enrouteDto: EnrouteDto) {
    return await this.dispatchEnhancementsService.markEnrouteToAirport(tenantId, driverId, enrouteDto.airportCode, enrouteDto.etaMinutes);
  }

  async getMultiTenantQueuePositions(driverId: string): Promise<MultiTenantQueuePositionDto[]> {
    const supabase = this.supabaseService.getClient();

    // Get all tenants this driver works for
    const { data: driverTenants, error: tenantError } = await supabase
      .from('driver_profiles')
      .select('tenant_id')
      .eq('id', driverId)
      .eq('is_active', true);

    if (tenantError || !driverTenants) {
      return [];
    }

    const queuePositions = [];

    for (const driverTenant of driverTenants) {
      const tenantId = driverTenant.tenant_id;

      // Get enroute status for each airport
      const { data: enrouteStatus } = await supabase
        .from('driver_enroute_status')
        .select('airport_code, current_zone, eta_minutes, status')
        .eq('tenant_id', tenantId)
        .eq('driver_id', driverId)
        .in('status', ['enroute', 'approaching', 'staging', 'active', 'pickup']);

      // Get queue positions
      const { data: queueData } = await supabase
        .from('airport_queue')
        .select('airport_code, status, entered_at, zone_type')
        .eq('tenant_id', tenantId)
        .eq('driver_id', driverId)
        .in('status', ['prequeue', 'active']);

      // Combine enroute and queue information
      const airportPositions = new Map();

      // Add enroute status
      enrouteStatus?.forEach(status => {
        airportPositions.set(status.airport_code, {
          airportCode: status.airport_code,
          tenantId,
          tenantName: `Tenant ${tenantId}`,
          currentZone: status.current_zone,
          etaMinutes: status.eta_minutes,
          zoneStatus: status.status,
          queuePosition: null,
          totalInQueue: 0,
          estimatedWaitMinutes: null,
        });
      });

      // Add queue positions
      queueData?.forEach(queue => {
        const existing = airportPositions.get(queue.airport_code);
        if (existing) {
          existing.queuePosition = 'prequeue';
        } else {
          airportPositions.set(queue.airport_code, {
            airportCode: queue.airport_code,
            tenantId,
            tenantName: `Tenant ${tenantId}`,
            currentZone: queue.zone_type,
            etaMinutes: null,
            zoneStatus: queue.status,
            queuePosition: queue.status === 'active' ? 'In Queue' : 'Prequeue',
            totalInQueue: 0,
            estimatedWaitMinutes: null,
          });
        }
      });

      queuePositions.push(...Array.from(airportPositions.values()));
    }

    return queuePositions.sort((a, b) => {
      // Sort by status priority: active > staging > enroute > prequeue
      const priority = { 'active': 1, 'staging': 2, 'enroute': 3, 'pickup': 4, 'approaching': 5 };
      const aPriority = priority[a.zoneStatus as keyof typeof priority] || 999;
      const bPriority = priority[b.zoneStatus as keyof typeof priority] || 999;
      return aPriority - bPriority;
    });
  }

  async getEnhancedAirportQueuePosition(tenantId: string, driverId: string, airportCode: string) {
    return await this.dispatchEnhancementsService.getEnhancedQueuePosition(tenantId, driverId, airportCode);
  }

  async getZoneHistory(tenantId: string, driverId: string, airportCode: string) {
    return await this.dispatchEnhancementsService.getDriverZoneHistory(tenantId, driverId, airportCode);
  }

  async getAvailableGrabBoard(tenantId: string, driverId: string, lat: number, lng: number, radius: number = 10) {
    return await this.dispatchEnhancementsService.getGrabBoard(tenantId, lat, lng, radius);
  }

  async claimGrabBoardTrip(tenantId: string, driverId: string, tripId: string) {
    return await this.dispatchEnhancementsService.claimFromGrabBoard(tripId, driverId, tenantId);
  }
}
