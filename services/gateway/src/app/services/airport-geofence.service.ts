import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class AirportGeofenceService {
  private readonly logger = new Logger(AirportGeofenceService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ════════════════════════════════════════════════════════════════════
  // Geofence Zone Management
  // ════════════════════════════════════════════════════════════════════

  async createGeofenceZone(tenantId: string, airportCode: string, zoneType: string, zoneData: any) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_airport_geofences')
      .insert({
        tenant_id: tenantId,
        airport_code: airportCode.toUpperCase(),
        zone_type: zoneType,
        zone_name: zoneData.zoneName || `${airportCode} ${zoneType} Zone`,
        coordinates: zoneData.coordinates,
        center_lat: zoneData.centerLat,
        center_lng: zoneData.centerLng,
        radius_meters: zoneData.radiusMeters,
        is_active: zoneData.isActive !== false,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to create geofence zone: ${error.message}`);
    
    this.logger.log(`Created geofence zone: ${zoneType} for ${airportCode} (tenant: ${tenantId})`);
    return data;
  }

  async updateGeofenceZone(tenantId: string, zoneId: string, zoneData: any) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_airport_geofences')
      .update({
        zone_name: zoneData.zoneName,
        coordinates: zoneData.coordinates,
        center_lat: zoneData.centerLat,
        center_lng: zoneData.centerLng,
        radius_meters: zoneData.radiusMeters,
        is_active: zoneData.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', zoneId)
      .select()
      .single();

    if (error) throw new BadRequestException(`Failed to update geofence zone: ${error.message}`);
    
    this.logger.log(`Updated geofence zone: ${zoneId} (tenant: ${tenantId})`);
    return data;
  }

  async getGeofenceZones(tenantId: string, airportCode?: string) {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('tenant_airport_geofences')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (airportCode) {
      query = query.eq('airport_code', airportCode.toUpperCase());
    }

    const { data, error } = await query.order('airport_code, zone_type');

    if (error) throw new BadRequestException(`Failed to fetch geofence zones: ${error.message}`);
    
    return data || [];
  }

  async deleteGeofenceZone(tenantId: string, zoneId: string) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('tenant_airport_geofences')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('id', zoneId);

    if (error) throw new BadRequestException(`Failed to delete geofence zone: ${error.message}`);
    
    this.logger.log(`Deactivated geofence zone: ${zoneId} (tenant: ${tenantId})`);
    return { deleted: true };
  }

  // ════════════════════════════════════════════════════════════════════
  // Zone Detection Logic
  // ════════════════════════════════════════════════════════════════════

  async detectCurrentZone(tenantId: string, lat: number, lng: number, airportCode: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('detect_driver_zone', {
      p_tenant_id: tenantId,
      p_lat: lat,
      p_lng: lng,
      p_airport_code: airportCode.toUpperCase(),
    });

    if (error) {
      this.logger.warn(`Zone detection RPC failed: ${error.message}`);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  }

  async isPointInZone(lat: number, lng: number, zoneCoordinates: any): boolean {
    if (!zoneCoordinates) return false;

    try {
      // Circle detection
      if (zoneCoordinates.type === 'circle') {
        return this.isPointInCircle(lat, lng, zoneCoordinates.center, zoneCoordinates.radius);
      }
      // Polygon detection
      else if (zoneCoordinates.type === 'polygon') {
        return this.isPointInPolygon(lat, lng, zoneCoordinates.coordinates);
      }
    } catch (error) {
      this.logger.error(`Error in zone detection: ${error.message}`);
      return false;
    }

    return false;
  }

  async getZoneSequence(tenantId: string, airportCode: string) {
    const zones = await this.getGeofenceZones(tenantId, airportCode);
    
    // Return zones in priority order: approach -> staging -> active -> pickup
    const zonePriority = ['approach', 'staging', 'active', 'pickup'];
    const orderedZones = [];

    for (const zoneType of zonePriority) {
      const zone = zones.find(z => z.zone_type === zoneType);
      if (zone) {
        orderedZones.push(zone);
      }
    }

    return orderedZones;
  }

  // ════════════════════════════════════════════════════════════════════
  // Automatic Queue Formation
  // ════════════════════════════════════════════════════════════════════

  async formQueueFromZone(tenantId: string, airportCode: string, zoneType: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('form_queue_from_zone', {
      p_tenant_id: tenantId,
      p_airport_code: airportCode.toUpperCase(),
      p_zone_type: zoneType,
    });

    if (error) {
      this.logger.error(`Failed to form queue from zone: ${error.message}`);
      return 0;
    }

    const driversAdded = Array.isArray(data) ? data[0] : (data || 0);
    this.logger.log(`Formed queue from ${zoneType} zone: ${driversAdded} drivers added`);
    return driversAdded;
  }

  async getDriversInZone(tenantId: string, airportCode: string, zoneType: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('get_drivers_in_zone', {
      p_tenant_id: tenantId,
      p_airport_code: airportCode.toUpperCase(),
      p_zone_type: zoneType,
    });

    if (error) {
      this.logger.error(`Failed to get drivers in zone: ${error.message}`);
      return [];
    }

    return data || [];
  }

  // ════════════════════════════════════════════════════════════════════
  // Zone Management Utilities
  // ════════════════════════════════════════════════════════════════════

  async updateDriverZone(tenantId: string, driverId: string, airportCode: string, lat: number, lng: number) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('update_driver_zone', {
      p_tenant_id: tenantId,
      p_driver_id: driverId,
      p_airport_code: airportCode.toUpperCase(),
      p_lat: lat,
      p_lng: lng,
    });

    if (error) {
      this.logger.error(`Failed to update driver zone: ${error.message}`);
      return { previousZone: null, currentZone: null, zoneChanged: false };
    }

    const result = Array.isArray(data) ? data[0] : (data || {});
    
    if (result.zone_changed) {
      this.logger.log(`Driver ${driverId} zone changed: ${result.previous_zone} → ${result.current_zone} at ${airportCode}`);
    }

    return result;
  }

  async markDriverEnroute(tenantId: string, driverId: string, airportCode: string, etaMinutes: number) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('mark_driver_enroute', {
      p_tenant_id: tenantId,
      p_driver_id: driverId,
      p_airport_code: airportCode.toUpperCase(),
      p_eta_minutes: etaMinutes,
    });

    if (error) {
      throw new BadRequestException(`Failed to mark driver enroute: ${error.message}`);
    }

    this.logger.log(`Driver ${driverId} marked enroute to ${airportCode}, ETA: ${etaMinutes} minutes`);
    return { marked: true };
  }

  async getDriverZoneHistory(tenantId: string, driverId: string, airportCode: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('driver_zone_transitions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('driver_id', driverId)
      .eq('airport_code', airportCode.toUpperCase())
      .order('transition_time', { ascending: false })
      .limit(50);

    if (error) {
      this.logger.error(`Failed to get driver zone history: ${error.message}`);
      return [];
    }

    return data || [];
  }

  // ════════════════════════════════════════════════════════════════════
  // Analytics
  // ════════════════════════════════════════════════════════════════════

  async getZoneFlowAnalytics(tenantId: string, airportCode: string, startDate: string, endDate: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.rpc('get_zone_flow_analytics', {
      p_tenant_id: tenantId,
      p_airport_code: airportCode.toUpperCase(),
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      this.logger.error(`Failed to get zone flow analytics: ${error.message}`);
      return [];
    }

    return data || [];
  }

  async getEnrouteAccuracyMetrics(tenantId: string, airportCode: string) {
    const supabase = this.supabaseService.getClient();

    // Calculate ETA accuracy
    const { data: enrouteData, error: enrouteError } = await supabase
      .from('driver_enroute_status')
      .select('eta_minutes, actual_eta_minutes, updated_at')
      .eq('tenant_id', tenantId)
      .eq('airport_code', airportCode.toUpperCase())
      .not('eta_minutes', 'is', null)
      .not('actual_eta_minutes', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(100);

    if (enrouteError) {
      this.logger.error(`Failed to get enroute accuracy data: ${enrouteError.message}`);
      return { averageEtaVariance: 0, enrouteCompletionRate: 0, zoneTransitionEfficiency: 0 };
    }

    const enrouteRecords = enrouteData || [];
    
    // Calculate ETA variance
    const etaVariances = enrouteRecords
      .filter(record => record.actual_eta_minutes !== null)
      .map(record => Math.abs(record.eta_minutes - record.actual_eta_minutes));

    const averageEtaVariance = etaVariances.length > 0 
      ? etaVariances.reduce((sum, variance) => sum + variance, 0) / etaVariances.length 
      : 0;

    // Calculate completion rate (drivers who reached pickup zone)
    const { data: completionData, error: completionError } = await supabase
      .from('driver_enroute_status')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('airport_code', airportCode.toUpperCase())
      .in('status', ['pickup', 'arrived']);

    const totalEnroute = enrouteRecords.length;
    const completedTrips = (completionData || []).length;
    const enrouteCompletionRate = totalEnroute > 0 ? (completedTrips / totalEnroute) * 100 : 0;

    // Calculate zone transition efficiency
    const { data: transitionData, error: transitionError } = await supabase
      .from('driver_zone_transitions')
      .select('from_zone, to_zone')
      .eq('tenant_id', tenantId)
      .eq('airport_code', airportCode.toUpperCase())
      .gte('transition_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const transitions = transitionData || [];
    const efficientTransitions = transitions.filter(t => {
      // Consider transitions that move forward in the sequence as efficient
      const zoneOrder = { 'approach': 1, 'staging': 2, 'active': 3, 'pickup': 4 };
      const fromOrder = zoneOrder[t.from_zone as keyof typeof zoneOrder] || 0;
      const toOrder = zoneOrder[t.to_zone as keyof typeof zoneOrder] || 0;
      return toOrder > fromOrder;
    });

    const zoneTransitionEfficiency = transitions.length > 0 ? (efficientTransitions.length / transitions.length) * 100 : 0;

    return {
      averageEtaVariance: Math.round(averageEtaVariance * 100) / 100,
      enrouteCompletionRate: Math.round(enrouteCompletionRate * 100) / 100,
      zoneTransitionEfficiency: Math.round(zoneTransitionEfficiency * 100) / 100,
    };
  }

  // ════════════════════════════════════════════════════════════════════
  // Utility Functions
  // ════════════════════════════════════════════════════════════════════

  private isPointInCircle(lat: number, lng: number, center: number[], radius: number): boolean {
    const [centerLng, centerLat] = center;
    const distance = this.haversine(lat, lng, centerLat, centerLng);
    return distance <= radius;
  }

  private isPointInPolygon(lat: number, lng: number, coordinates: number[][][]): boolean {
    // Simple ray casting algorithm for point in polygon
    const points = coordinates[0]; // Exterior ring
    let inside = false;

    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];

      if (((yi > lng) !== (yj > lng)) &&
          (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  // ════════════════════════════════════════════════════════════════════
  // Default Geofence Setup
  // ════════════════════════════════════════════════════════════════════

  async setupDefaultGeofences(tenantId: string, airportCode: string, airportLat: number, airportLng: number) {
    const defaultZones = [
      {
        zoneType: 'approach',
        zoneName: `${airportCode} Approach Zone`,
        coordinates: {
          type: 'circle',
          center: [airportLng, airportLat],
          radius: 16093 // 10 miles
        },
        centerLat: airportLat,
        centerLng: airportLng,
        radiusMeters: 16093
      },
      {
        zoneType: 'staging',
        zoneName: `${airportCode} Staging Zone`,
        coordinates: {
          type: 'circle',
          center: [airportLng, airportLat],
          radius: 4828 // 3 miles
        },
        centerLat: airportLat,
        centerLng: airportLng,
        radiusMeters: 4828
      },
      {
        zoneType: 'active',
        zoneName: `${airportCode} Active Queue Zone`,
        coordinates: {
          type: 'circle',
          center: [airportLng, airportLat],
          radius: 804 // 0.5 miles
        },
        centerLat: airportLat,
        centerLng: airportLng,
        radiusMeters: 804
      },
      {
        zoneType: 'pickup',
        zoneName: `${airportCode} Pickup Zone`,
        coordinates: {
          type: 'polygon',
          coordinates: [[
            [airportLng - 0.003, airportLat + 0.003], // ~300m square
            [airportLng + 0.003, airportLat + 0.003],
            [airportLng + 0.003, airportLat - 0.003],
            [airportLng - 0.003, airportLat - 0.003],
            [airportLng - 0.003, airportLat + 0.003]
          ]]
        },
        centerLat: airportLat,
        centerLng: airportLng,
        radiusMeters: 300
      }
    ];

    const results = [];
    for (const zone of defaultZones) {
      try {
        const result = await this.createGeofenceZone(tenantId, airportCode, zone.zoneType, zone);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to create default zone ${zone.zoneType}: ${error.message}`);
      }
    }

    this.logger.log(`Setup default geofences for ${airportCode}: ${results.length} zones created`);
    return results;
  }
}
