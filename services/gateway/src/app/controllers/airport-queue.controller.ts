import { Injectable, Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { AirportGeofenceService } from '../services/airport-geofence.service';
import { DispatchEnhancementsService } from '../services/dispatch-enhancements.service';
import { EnhancedDriverService } from '../services/enhanced-driver.service';

// DTOs for API endpoints
export class CreateGeofenceDto {
  tenantId!: string;
  airportCode!: string;
  zoneType!: string;
  zoneName!: string;
  coordinates!: any;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  isActive?: boolean;
}

export class UpdateGeofenceDto {
  zoneName?: string;
  coordinates?: any;
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  isActive?: boolean;
}

export class MarkEnrouteDto {
  tenantId!: string;
  driverId!: string;
  airportCode!: string;
  etaMinutes!: number;
}

export class ZoneUpdateDto {
  tenantId!: string;
  driverId!: string;
  airportCode!: string;
  lat!: number;
  lng!: number;
}

export class ZoneFlowAnalyticsDto {
  tenantId!: string;
  airportCode!: string;
  startDate!: string;
  endDate!: string;
}

@Controller('airport-queue')
export class AirportQueueController {
  constructor(
    private readonly airportGeofenceService: AirportGeofenceService,
    private readonly dispatchEnhancementsService: DispatchEnhancementsService,
    private readonly enhancedDriverService: EnhancedDriverService,
  ) {}

  // ════════════════════════════════════════════════════════════════════
  // Enroute Management
  // ════════════════════════════════════════════════════════════════════

  @Post('enroute')
  async markEnroute(@Body() enrouteDto: MarkEnrouteDto) {
    return await this.enhancedDriverService.markEnrouteToAirport(
      enrouteDto.tenantId,
      enrouteDto.driverId,
      enrouteDto.airportCode,
      enrouteDto.etaMinutes
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // Zone-based Location Updates
  // ════════════════════════════════════════════════════════════════════

  @Post('update-zone')
  async updateDriverZone(@Body() zoneUpdateDto: ZoneUpdateDto) {
    return await this.enhancedDriverService.updateLocationWithZoneDetection(
      zoneUpdateDto.tenantId,
      zoneUpdateDto.driverId,
      {
        lat: zoneUpdateDto.lat,
        lng: zoneUpdateDto.lng,
        heading: 0,
        speed: 0
      }
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // Multi-tenant Queue Positions
  // ════════════════════════════════════════════════════════════════════

  @Get('multi-tenant-positions/:driverId')
  async getMultiTenantPositions(@Param('driverId') driverId: string) {
    return await this.enhancedDriverService.getMultiTenantQueuePositions(driverId);
  }

  @Get('enhanced-position/:tenantId/:driverId/:airportCode')
  async getEnhancedQueuePosition(
    @Param('tenantId') tenantId: string,
    @Param('driverId') driverId: string,
    @Param('airportCode') airportCode: string
  ) {
    return await this.enhancedDriverService.getEnhancedAirportQueuePosition(tenantId, driverId, airportCode);
  }

  // ════════════════════════════════════════════════════════════════════
  // Geofence Management (Tenant Admin)
  // ════════════════════════════════════════════════════════════════════

  @Post('geofences')
  async createGeofence(@Body() geofenceDto: CreateGeofenceDto) {
    return await this.airportGeofenceService.createGeofenceZone(
      geofenceDto.tenantId,
      geofenceDto.airportCode,
      geofenceDto.zoneType,
      geofenceDto
    );
  }

  @Get('geofences/:tenantId/:airportCode')
  async getGeofences(
    @Param('tenantId') tenantId: string,
    @Param('airportCode') airportCode: string
  ) {
    return await this.airportGeofenceService.getGeofenceZones(tenantId, airportCode);
  }

  @Get('geofences/:tenantId')
  async getAllGeofences(@Param('tenantId') tenantId: string) {
    return await this.airportGeofenceService.getGeofenceZones(tenantId);
  }

  @Put('geofences/:tenantId/:zoneId')
  async updateGeofence(
    @Param('tenantId') tenantId: string,
    @Param('zoneId') zoneId: string,
    @Body() updateDto: UpdateGeofenceDto
  ) {
    return await this.airportGeofenceService.updateGeofenceZone(tenantId, zoneId, updateDto);
  }

  @Delete('geofences/:tenantId/:zoneId')
  async deleteGeofence(
    @Param('tenantId') tenantId: string,
    @Param('zoneId') zoneId: string
  ) {
    return await this.airportGeofenceService.deleteGeofenceZone(tenantId, zoneId);
  }

  // ════════════════════════════════════════════════════════════════════
  // Zone Detection
  // ════════════════════════════════════════════════════════════════════

  @Get('detect-zone/:tenantId/:airportCode')
  async detectCurrentZone(
    @Param('tenantId') tenantId: string,
    @Param('airportCode') airportCode: string,
    @Query('lat') lat: number,
    @Query('lng') lng: number
  ) {
    return await this.airportGeofenceService.detectCurrentZone(tenantId, lat, lng, airportCode);
  }

  // ════════════════════════════════════════════════════════════════════
  // Queue Management
  // ════════════════════════════════════════════════════════════════════

  @Post('form-queue/:tenantId/:airportCode/:zoneType')
  async formQueueFromZone(
    @Param('tenantId') tenantId: string,
    @Param('airportCode') airportCode: string,
    @Param('zoneType') zoneType: string
  ) {
    return await this.airportGeofenceService.formQueueFromZone(tenantId, airportCode, zoneType);
  }

  @Get('drivers-in-zone/:tenantId/:airportCode/:zoneType')
  async getDriversInZone(
    @Param('tenantId') tenantId: string,
    @Param('airportCode') airportCode: string,
    @Param('zoneType') zoneType: string
  ) {
    return await this.airportGeofenceService.getDriversInZone(tenantId, airportCode, zoneType);
  }

  // ════════════════════════════════════════════════════════════════════
  // Zone History
  // ════════════════════════════════════════════════════════════════════

  @Get('zone-history/:tenantId/:driverId/:airportCode')
  async getZoneHistory(
    @Param('tenantId') tenantId: string,
    @Param('driverId') driverId: string,
    @Param('airportCode') airportCode: string
  ) {
    return await this.enhancedDriverService.getZoneHistory(tenantId, driverId, airportCode);
  }

  // ════════════════════════════════════════════════════════════════════
  // Analytics
  // ════════════════════════════════════════════════════════════════════

  @Post('zone-flow-analytics')
  async getZoneFlowAnalytics(@Body() analyticsDto: ZoneFlowAnalyticsDto) {
    return await this.airportGeofenceService.getZoneFlowAnalytics(
      analyticsDto.tenantId,
      analyticsDto.airportCode,
      analyticsDto.startDate,
      analyticsDto.endDate
    );
  }

  @Get('enroute-accuracy/:tenantId/:airportCode')
  async getEnrouteAccuracyMetrics(
    @Param('tenantId') tenantId: string,
    @Param('airportCode') airportCode: string
  ) {
    return await this.airportGeofenceService.getEnrouteAccuracyMetrics(tenantId, airportCode);
  }

  // ════════════════════════════════════════════════════════════════════
  // Default Geofence Setup
  // ════════════════════════════════════════════════════════════════════

  @Post('setup-default-geofences/:tenantId/:airportCode')
  async setupDefaultGeofences(
    @Param('tenantId') tenantId: string,
    @Param('airportCode') airportCode: string,
    @Query('lat') lat: number,
    @Query('lng') lng: number
  ) {
    return await this.airportGeofenceService.setupDefaultGeofences(tenantId, airportCode, lat, lng);
  }
}
