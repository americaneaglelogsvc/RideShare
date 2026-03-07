import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

export interface VehicleConfigRequest {
  vehicle_type: string;
  display_name: string;
  description?: string;
  passenger_capacity: number;
  luggage_capacity: string;
  accessibility_features?: string[];
  base_rate_cents: number;
  per_mile_rate_cents: number;
  per_minute_rate_cents: number;
  features?: string[];
  is_active?: boolean;
}

export interface VehicleConfigResponse {
  id: string;
  tenant_id: string;
  vehicle_type: string;
  display_name: string;
  description?: string;
  passenger_capacity: number;
  luggage_capacity: string;
  accessibility_features?: string[];
  base_rate_cents: number;
  per_mile_rate_cents: number;
  per_minute_rate_cents: number;
  features?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VehicleCategory {
  type: string;
  displayName: string;
  description?: string;
  capacity: number;
  luggage: string;
  features: string[];
  pricing: {
    base: number;
    perMile: number;
    perMinute: number;
  };
}

@Injectable()
export class VehicleConfigService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // Create vehicle configuration for a tenant
  async createVehicleConfig(tenantId: string, request: VehicleConfigRequest): Promise<VehicleConfigResponse> {
    const supabase = this.supabaseService.getClient();

    // Validate required fields
    if (!request.vehicle_type || !request.display_name || request.passenger_capacity <= 0) {
      throw new BadRequestException('Vehicle type, display name, and passenger capacity are required');
    }

    // Check if vehicle type already exists for this tenant
    const { data: existing } = await supabase
      .from('tenant_vehicle_configs')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('vehicle_type', request.vehicle_type)
      .maybeSingle();

    if (existing) {
      throw new BadRequestException(`Vehicle type '${request.vehicle_type}' already exists for this tenant`);
    }

    const { data, error } = await supabase
      .from('tenant_vehicle_configs')
      .insert({
        tenant_id: tenantId,
        vehicle_type: request.vehicle_type,
        display_name: request.display_name,
        description: request.description,
        passenger_capacity: request.passenger_capacity,
        luggage_capacity: request.luggage_capacity,
        accessibility_features: request.accessibility_features || [],
        base_rate_cents: request.base_rate_cents,
        per_mile_rate_cents: request.per_mile_rate_cents,
        per_minute_rate_cents: request.per_minute_rate_cents,
        features: request.features || [],
        is_active: request.is_active ?? true,
      })
      .select()
      .single();

    if (error || !data) {
      throw new BadRequestException(`Failed to create vehicle config: ${error?.message}`);
    }

    return data;
  }

  // Get all vehicle configurations for a tenant
  async getVehicleConfigs(tenantId: string, activeOnly: boolean = true): Promise<VehicleConfigResponse[]> {
    const supabase = this.supabaseService.getClient();

    let query = supabase
      .from('tenant_vehicle_configs')
      .select('*')
      .eq('tenant_id', tenantId);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    query = query.order('display_name');

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch vehicle configs: ${error?.message}`);
    }

    return data || [];
  }

  // Get vehicle configuration by type for a tenant
  async getVehicleConfigByType(tenantId: string, vehicleType: string): Promise<VehicleConfigResponse | null> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_vehicle_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('vehicle_type', vehicleType)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new BadRequestException(`Failed to fetch vehicle config: ${error?.message}`);
    }

    return data;
  }

  // Update vehicle configuration
  async updateVehicleConfig(
    tenantId: string, 
    vehicleType: string, 
    request: Partial<VehicleConfigRequest>
  ): Promise<VehicleConfigResponse> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('tenant_vehicle_configs')
      .update({
        ...request,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('vehicle_type', vehicleType)
      .select()
      .single();

    if (error || !data) {
      throw new BadRequestException(`Failed to update vehicle config: ${error?.message}`);
    }

    return data;
  }

  // Delete vehicle configuration (soft delete by setting is_active to false)
  async deleteVehicleConfig(tenantId: string, vehicleType: string): Promise<void> {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase
      .from('tenant_vehicle_configs')
      .update({ is_active: false })
      .eq('tenant_id', tenantId)
      .eq('vehicle_type', vehicleType);

    if (error) {
      throw new BadRequestException(`Failed to delete vehicle config: ${error?.message}`);
    }
  }

  // Get available vehicle categories for pricing
  async getVehicleCategories(tenantId: string): Promise<VehicleCategory[]> {
    const configs = await this.getVehicleConfigs(tenantId, true);

    return configs.map(config => ({
      type: config.vehicle_type,
      displayName: config.display_name,
      description: config.description,
      capacity: config.passenger_capacity,
      luggage: config.luggage_capacity,
      features: config.features || [],
      pricing: {
        base: config.base_rate_cents / 100,
        perMile: config.per_mile_rate_cents / 100,
        perMinute: config.per_minute_rate_cents / 100,
      },
    }));
  }

  // Initialize default vehicle configurations for a new tenant
  async initializeDefaultConfigs(tenantId: string): Promise<VehicleConfigResponse[]> {
    const defaultConfigs: VehicleConfigRequest[] = [
      {
        vehicle_type: 'economy_sedan',
        display_name: 'Economy Sedan',
        description: 'Affordable and reliable transportation',
        passenger_capacity: 4,
        luggage_capacity: 'medium',
        base_rate_cents: 250, // $2.50
        per_mile_rate_cents: 125, // $1.25 per mile
        per_minute_rate_cents: 25, // $0.25 per minute
        features: ['Air Conditioning', 'Music System'],
      },
      {
        vehicle_type: 'standard_suv',
        display_name: 'Standard SUV',
        description: 'More space for passengers and luggage',
        passenger_capacity: 6,
        luggage_capacity: 'large',
        base_rate_cents: 400, // $4.00
        per_mile_rate_cents: 175, // $1.75 per mile
        per_minute_rate_cents: 35, // $0.35 per minute
        features: ['Air Conditioning', 'Music System', 'Extra Storage'],
      },
      {
        vehicle_type: 'premium_sedan',
        display_name: 'Premium Sedan',
        description: 'Comfortable and stylish ride',
        passenger_capacity: 4,
        luggage_capacity: 'medium',
        base_rate_cents: 600, // $6.00
        per_mile_rate_cents: 250, // $2.50 per mile
        per_minute_rate_cents: 50, // $0.50 per minute
        features: ['Leather Seats', 'Premium Sound', 'Climate Control'],
      },
      {
        vehicle_type: 'luxury_sedan',
        display_name: 'Luxury Sedan',
        description: 'High-end luxury transportation',
        passenger_capacity: 4,
        luggage_capacity: 'medium',
        base_rate_cents: 800, // $8.00
        per_mile_rate_cents: 300, // $3.00 per mile
        per_minute_rate_cents: 75, // $0.75 per minute
        features: ['Leather Seats', 'Premium Sound', 'Climate Control', 'Wi-Fi'],
      },
      {
        vehicle_type: 'luxury_suv',
        display_name: 'Luxury SUV',
        description: 'Spacious luxury vehicle',
        passenger_capacity: 6,
        luggage_capacity: 'large',
        base_rate_cents: 1000, // $10.00
        per_mile_rate_cents: 350, // $3.50 per mile
        per_minute_rate_cents: 100, // $1.00 per minute
        features: ['Leather Seats', 'Premium Sound', 'Climate Control', 'Wi-Fi', 'Extra Storage'],
      },
    ];

    const results: VehicleConfigResponse[] = [];

    for (const config of defaultConfigs) {
      try {
        const result = await this.createVehicleConfig(tenantId, config);
        results.push(result);
      } catch (error) {
        console.warn(`Failed to create default config ${config.vehicle_type}:`, error);
      }
    }

    return results;
  }

  // Validate vehicle configuration
  private validateVehicleConfig(request: VehicleConfigRequest): void {
    if (request.passenger_capacity < 1 || request.passenger_capacity > 8) {
      throw new BadRequestException('Passenger capacity must be between 1 and 8');
    }

    if (request.base_rate_cents < 0 || request.per_mile_rate_cents < 0 || request.per_minute_rate_cents < 0) {
      throw new BadRequestException('Rates must be non-negative');
    }

    const validLuggageCapacities = ['small', 'medium', 'large', 'extra_large'];
    if (request.luggage_capacity && !validLuggageCapacities.includes(request.luggage_capacity)) {
      throw new BadRequestException(`Luggage capacity must be one of: ${validLuggageCapacities.join(', ')}`);
    }
  }
}
