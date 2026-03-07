import { Injectable, BadRequestException } from '@nestjs/common';
import { VehicleConfigService, VehicleCategory } from './vehicle-config.service';

export interface PassengerRequirements {
  passenger_count: number;
  immediacy: 'immediate' | 'scheduled';
  scheduled_time?: string;
  luggage_size: 'none' | 'small' | 'medium' | 'large' | 'extra_large';
  unaccompanied_minors: boolean;
  minors_ages?: number[];
  special_assistance: boolean;
  assistance_type?: 'wheelchair' | 'mobility' | 'visual' | 'hearing' | 'medical' | 'other';
  assistance_details?: string;
  ride_preference: 'economy' | 'standard' | 'premium' | 'luxury';
  budget_range?: {
    min_cents: number;
    max_cents: number;
  };
}

export interface VehicleRecommendation {
  vehicle_type: string;
  display_name: string;
  match_score: number;
  match_reasons: string[];
  estimated_fare_cents: number;
  capacity: number;
  luggage_capacity: string;
  features: string[];
  accessibility_features?: string[];
}

export interface BookingFlowRequest {
  requirements: PassengerRequirements;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  tenant_id: string;
}

export interface BookingFlowResponse {
  passenger_requirements: PassengerRequirements;
  vehicle_recommendations: VehicleRecommendation[];
  estimated_duration_minutes: number;
  estimated_distance_miles: number;
  nextSteps: string[];
}

@Injectable()
export class PassengerNeedsService {
  constructor(private readonly vehicleConfigService: VehicleConfigService) {}

  // Process passenger requirements and provide vehicle recommendations
  async processPassengerRequirements(request: BookingFlowRequest): Promise<BookingFlowResponse> {
    // Validate requirements
    this.validateRequirements(request.requirements);

    // Get available vehicles for tenant
    const availableVehicles = await this.vehicleConfigService.getVehicleCategories(request.tenant_id);

    // Filter and score vehicles based on requirements
    const recommendations = this.scoreAndRecommendVehicles(
      availableVehicles, 
      request.requirements
    );

    // Calculate estimated duration and distance
    const { duration, distance } = this.calculateTripEstimate(request.pickup, request.dropoff);

    // Generate next steps for the booking flow
    const nextSteps = this.generateNextSteps(request.requirements, recommendations);

    return {
      passenger_requirements: request.requirements,
      vehicle_recommendations: recommendations,
      estimated_duration_minutes: duration,
      estimated_distance_miles: distance,
      nextSteps,
    };
  }

  // Validate passenger requirements
  private validateRequirements(requirements: PassengerRequirements): void {
    if (requirements.passenger_count < 1 || requirements.passenger_count > 8) {
      throw new BadRequestException('Passenger count must be between 1 and 8');
    }

    if (requirements.unaccompanied_minors && (!requirements.minors_ages || requirements.minors_ages.length === 0)) {
      throw new BadRequestException('Minors ages are required when unaccompanied minors are present');
    }

    if (requirements.unaccompanied_minors && requirements.minors_ages) {
      const hasMinorUnder12 = requirements.minors_ages.some(age => age < 12);
      if (hasMinorUnder12) {
        throw new BadRequestException('Unaccompanied minors under 12 are not allowed');
      }
    }

    if (requirements.special_assistance && !requirements.assistance_type) {
      throw new BadRequestException('Assistance type is required when special assistance is needed');
    }

    if (requirements.immediacy === 'scheduled' && !requirements.scheduled_time) {
      throw new BadRequestException('Scheduled time is required for scheduled rides');
    }
  }

  // Score and recommend vehicles based on passenger requirements
  private scoreAndRecommendVehicles(
    vehicles: VehicleCategory[], 
    requirements: PassengerRequirements
  ): VehicleRecommendation[] {
    const recommendations: VehicleRecommendation[] = [];

    for (const vehicle of vehicles) {
      const score = this.calculateVehicleScore(vehicle, requirements);
      const reasons = this.getMatchReasons(vehicle, requirements, score);

      if (score > 0) { // Only include vehicles that meet minimum requirements
        recommendations.push({
          vehicle_type: vehicle.type,
          display_name: vehicle.displayName,
          match_score: score,
          match_reasons: reasons,
          estimated_fare_cents: this.estimateFare(vehicle, requirements),
          capacity: vehicle.capacity,
          luggage_capacity: vehicle.luggage,
          features: vehicle.features,
        });
      }
    }

    // Sort by score (highest first)
    return recommendations.sort((a, b) => b.match_score - a.match_score);
  }

  // Calculate vehicle match score based on requirements
  private calculateVehicleScore(vehicle: VehicleCategory, requirements: PassengerRequirements): number {
    let score = 0;

    // Passenger capacity check (critical requirement)
    if (vehicle.capacity >= requirements.passenger_count) {
      score += 40;
      // Bonus for perfect fit
      if (vehicle.capacity === requirements.passenger_count) {
        score += 10;
      }
    } else {
      return 0; // Eliminate vehicles that can't accommodate passengers
    }

    // Luggage capacity check
    const luggageScore = this.getLuggageCapacityScore(vehicle.luggage, requirements.luggage_size);
    score += luggageScore;

    // Accessibility features check
    if (requirements.special_assistance) {
      const accessibilityScore = this.getAccessibilityScore(vehicle, requirements);
      score += accessibilityScore;
    }

    // Preference match
    const preferenceScore = this.getPreferenceScore(vehicle.type, requirements.ride_preference);
    score += preferenceScore;

    // Budget consideration (if specified)
    if (requirements.budget_range) {
      const budgetScore = this.getBudgetScore(vehicle, requirements.budget_range);
      score += budgetScore;
    }

    return Math.min(score, 100); // Cap at 100
  }

  // Get luggage capacity score
  private getLuggageCapacityScore(vehicleLuggage: string, requiredLuggage: string): number {
    const luggageHierarchy = {
      'none': 0,
      'small': 1,
      'medium': 2,
      'large': 3,
      'extra_large': 4,
    };

    const vehicleCapacity = luggageHierarchy[vehicleLuggage as keyof typeof luggageHierarchy] || 0;
    const requiredCapacity = luggageHierarchy[requiredLuggage as keyof typeof luggageHierarchy] || 0;

    if (vehicleCapacity >= requiredCapacity) {
      return 20; // Full points for adequate luggage space
    } else if (vehicleCapacity === requiredCapacity - 1) {
      return 10; // Partial points for slightly less space
    } else {
      return 0; // No points for insufficient luggage space
    }
  }

  // Get accessibility score
  private getAccessibilityScore(vehicle: VehicleCategory, requirements: PassengerRequirements): number {
    // For now, give bonus points if vehicle has any features that might help
    // In a real implementation, this would check specific accessibility features
    const hasHelpfulFeatures = vehicle.features.some(feature => 
      feature.toLowerCase().includes('climate') || 
      feature.toLowerCase().includes('comfort') ||
      feature.toLowerCase().includes('space')
    );

    return hasHelpfulFeatures ? 15 : 5;
  }

  // Get preference score
  private getPreferenceScore(vehicleType: string, preference: string): number {
    const vehicleCategories = {
      'economy': ['economy_sedan'],
      'standard': ['standard_suv', 'economy_sedan'],
      'premium': ['premium_sedan', 'standard_suv'],
      'luxury': ['luxury_sedan', 'luxury_suv', 'premium_sedan'],
    };

    const preferredVehicles = vehicleCategories[preference as keyof typeof vehicleCategories] || [];
    
    if (preferredVehicles.includes(vehicleType)) {
      return 20; // Full points for preference match
    } else {
      return 5; // Minimal points for non-preferred vehicles
    }
  }

  // Get budget score
  private getBudgetScore(vehicle: VehicleCategory, budget: { min_cents: number; max_cents: number }): number {
    const estimatedFare = this.estimateFare(vehicle, { passenger_count: 1, immediacy: 'immediate', luggage_size: 'medium', unaccompanied_minors: false, special_assistance: false, ride_preference: 'standard' });

    if (estimatedFare <= budget.max_cents && estimatedFare >= budget.min_cents) {
      return 15; // Full points for budget fit
    } else if (estimatedFare <= budget.max_cents) {
      return 10; // Partial points for under budget
    } else {
      return 0; // No points for over budget
    }
  }

  // Get match reasons for vehicle recommendation
  private getMatchReasons(vehicle: VehicleCategory, requirements: PassengerRequirements, score: number): string[] {
    const reasons: string[] = [];

    if (vehicle.capacity >= requirements.passenger_count) {
      reasons.push(`Accommodates ${requirements.passenger_count} passengers`);
    }

    const luggageScore = this.getLuggageCapacityScore(vehicle.luggage, requirements.luggage_size);
    if (luggageScore >= 20) {
      reasons.push(`Adequate ${requirements.luggage_size} luggage space`);
    }

    const preferenceScore = this.getPreferenceScore(vehicle.type, requirements.ride_preference);
    if (preferenceScore >= 20) {
      reasons.push(`Matches your ${requirements.ride_preference} preference`);
    }

    if (requirements.special_assistance) {
      reasons.push('Suitable for special assistance needs');
    }

    if (score >= 80) {
      reasons.push('Excellent match for your requirements');
    } else if (score >= 60) {
      reasons.push('Good match for your requirements');
    }

    return reasons;
  }

  // Estimate fare for a vehicle
  private estimateFare(vehicle: VehicleCategory, requirements: PassengerRequirements): number {
    // Base fare calculation (simplified)
    let baseFare = vehicle.pricing.base * 100; // Convert to cents
    
    // Add passenger-based adjustments
    if (requirements.passenger_count > 4) {
      baseFare *= 1.2; // 20% surcharge for larger groups
    }

    // Add luggage-based adjustments
    if (requirements.luggage_size === 'large' || requirements.luggage_size === 'extra_large') {
      baseFare *= 1.1; // 10% surcharge for large luggage
    }

    // Add preference-based adjustments
    if (requirements.ride_preference === 'luxury') {
      baseFare *= 1.3; // 30% surcharge for luxury preference
    } else if (requirements.ride_preference === 'premium') {
      baseFare *= 1.15; // 15% surcharge for premium preference
    }

    return Math.round(baseFare);
  }

  // Calculate trip estimate (simplified)
  private calculateTripEstimate(
    pickup: { lat: number; lng: number; address: string },
    dropoff: { lat: number; lng: number; address: string }
  ): { duration: number; distance: number } {
    // Simplified calculation - in reality, this would use a mapping API
    const distance = this.calculateDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    const duration = Math.ceil(distance * 2.5); // 2.5 minutes per mile average

    return { duration, distance };
  }

  // Calculate distance between two points
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Generate next steps for booking flow
  private generateNextSteps(requirements: PassengerRequirements, recommendations: VehicleRecommendation[]): string[] {
    const steps: string[] = [];

    if (recommendations.length === 0) {
      steps.push('No vehicles available for your requirements. Please adjust your preferences.');
      return steps;
    }

    steps.push('Select a vehicle from the recommended options');
    steps.push('Confirm pickup and dropoff locations');
    steps.push('Review fare estimate and trip details');

    if (requirements.immediacy === 'scheduled') {
      steps.push('Confirm scheduled pickup time');
    }

    if (requirements.unaccompanied_minors) {
      steps.push('Provide guardian contact information');
    }

    if (requirements.special_assistance) {
      steps.push('Specify assistance details for driver');
    }

    steps.push('Enter payment information');
    steps.push('Confirm booking');

    return steps;
  }

  // Get vehicle recommendations by category
  async getVehicleRecommendationsByCategory(
    tenantId: string, 
    category: string
  ): Promise<VehicleRecommendation[]> {
    const vehicles = await this.vehicleConfigService.getVehicleCategories(tenantId);
    
    // Filter by category
    const categoryVehicles = vehicles.filter(v => {
      if (category === 'economy') return v.type.includes('economy');
      if (category === 'standard') return v.type.includes('standard') || v.type.includes('suv');
      if (category === 'premium') return v.type.includes('premium');
      if (category === 'luxury') return v.type.includes('luxury');
      return false;
    });

    return categoryVehicles.map(vehicle => ({
      vehicle_type: vehicle.type,
      display_name: vehicle.displayName,
      match_score: 75, // Default score for category-based recommendations
      match_reasons: [`Matches ${category} category`],
      estimated_fare_cents: Math.round(vehicle.pricing.base * 100),
      capacity: vehicle.capacity,
      luggage_capacity: vehicle.luggage,
      features: vehicle.features,
    }));
  }
}
