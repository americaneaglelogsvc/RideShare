import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { PassengerNeedsService, PassengerRequirements, BookingFlowRequest, BookingFlowResponse } from '../services/passenger-needs.service';
import { TenantContext } from '../decorators/tenant-context.decorator';

@Controller('booking-flow')
export class PassengerNeedsController {
  constructor(private readonly passengerNeedsService: PassengerNeedsService) {}

  @Post('process-requirements')
  async processPassengerRequirements(
    @TenantContext() tenantId: string,
    @Body() request: Omit<BookingFlowRequest, 'tenant_id'>,
  ): Promise<BookingFlowResponse> {
    return this.passengerNeedsService.processPassengerRequirements({
      ...request,
      tenant_id: tenantId,
    });
  }

  @Get('vehicle-recommendations')
  async getVehicleRecommendationsByCategory(
    @TenantContext() tenantId: string,
    @Query('category') category: string,
  ) {
    return this.passengerNeedsService.getVehicleRecommendationsByCategory(tenantId, category);
  }

  @Post('validate-requirements')
  async validateRequirements(@Body() requirements: PassengerRequirements): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      // This would call a validation method in the service
      // For now, we'll do basic validation here
      const errors: string[] = [];

      if (requirements.passenger_count < 1 || requirements.passenger_count > 8) {
        errors.push('Passenger count must be between 1 and 8');
      }

      if (requirements.unaccompanied_minors && (!requirements.minors_ages || requirements.minors_ages.length === 0)) {
        errors.push('Minors ages are required when unaccompanied minors are present');
      }

      if (requirements.special_assistance && !requirements.assistance_type) {
        errors.push('Assistance type is required when special assistance is needed');
      }

      if (requirements.immediacy === 'scheduled' && !requirements.scheduled_time) {
        errors.push('Scheduled time is required for scheduled rides');
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Validation failed'],
      };
    }
  }
}
