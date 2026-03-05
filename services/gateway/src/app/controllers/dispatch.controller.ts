import { Controller, Post, Body, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DispatchService } from '../services/dispatch.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('dispatch')
@Controller('dispatch')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post('find-drivers')
  @ApiOperation({ summary: 'Find available drivers for a pickup location' })
  @ApiResponse({ status: 200, description: 'List of available drivers' })
  async findDrivers(@Req() req: ExpressRequest & { tenantId?: string }, @Body() request: {
    pickup_lat: number;
    pickup_lng: number;
    category: string;
    max_distance?: number;
  }): Promise<any> {
    const tenantId = req.tenantId as string;
    const drivers = await this.dispatchService.findAvailableDrivers(
      tenantId,
      request.pickup_lat,
      request.pickup_lng,
      request.category,
      request.max_distance
    );

    return {
      success: true,
      drivers,
      count: drivers.length
    };
  }

  @Post('dispatch-ride')
  @ApiOperation({ summary: 'Dispatch a ride to available drivers' })
  @ApiResponse({ status: 200, description: 'Ride dispatched successfully' })
  async dispatchRide(@Req() req: ExpressRequest & { tenantId?: string }, @Body() request: {
    rider_id: string;
    rider_name: string;
    rider_phone: string;
    pickup: {
      address: string;
      lat: number;
      lng: number;
    };
    dropoff: {
      address: string;
      lat: number;
      lng: number;
    };
    category: string;
    estimated_fare: number;
    special_instructions?: string;
  }) {
    const tenantId = req.tenantId as string;
    const tripId = await this.dispatchService.dispatchRide({
      tenantId,
      riderId: request.rider_id,
      riderName: request.rider_name,
      riderPhone: request.rider_phone,
      pickup: request.pickup,
      dropoff: request.dropoff,
      category: request.category,
      estimatedFare: request.estimated_fare,
      specialInstructions: request.special_instructions
    });

    if (!tripId) {
      return {
        success: false,
        message: 'No available drivers found'
      };
    }

    return {
      success: true,
      trip_id: tripId,
      message: 'Ride dispatched to available drivers'
    };
  }

  @Put('accept-offer/:offerId')
  @ApiOperation({ summary: 'Accept a ride offer' })
  @ApiResponse({ status: 200, description: 'Offer accepted successfully' })
  async acceptOffer(
    @Param('offerId') offerId: string,
    @Req() req: ExpressRequest & { tenantId?: string },
    @Body() request: { driver_id: string }
  ) {
    const tenantId = req.tenantId as string;
    const success = await this.dispatchService.acceptRideOffer(
      tenantId,
      request.driver_id,
      offerId
    );

    return {
      success,
      message: success ? 'Offer accepted successfully' : 'Failed to accept offer'
    };
  }

  @Put('accept-trip')
  @ApiOperation({ summary: 'Accept a trip (tripId + driverId) with concurrency lock' })
  @ApiResponse({ status: 200, description: 'Trip accepted successfully' })
  async acceptTrip(@Req() req: ExpressRequest & { tenantId?: string }, @Body() request: { trip_id: string; driver_id: string }) {
    const tenantId = req.tenantId as string;
    return this.dispatchService.acceptOffer(tenantId, request.trip_id, request.driver_id);
  }

  @Put('start-trip')
  @ApiOperation({ summary: 'Start a trip (ASSIGNED -> ACTIVE)' })
  @ApiResponse({ status: 200, description: 'Trip started successfully' })
  async startTrip(@Req() req: ExpressRequest & { tenantId?: string }, @Body() request: { trip_id: string }) {
    const tenantId = req.tenantId as string;
    return this.dispatchService.startTrip(tenantId, request.trip_id);
  }

  @Put('complete-trip')
  @ApiOperation({ summary: 'Complete a trip (ACTIVE -> COMPLETED) and record ledger entry' })
  @ApiResponse({ status: 200, description: 'Trip completed successfully' })
  async completeTrip(@Req() req: ExpressRequest & { tenantId?: string }, @Body() request: { trip_id: string }) {
    const tenantId = req.tenantId as string;
    return this.dispatchService.completeTrip(tenantId, request.trip_id);
  }

  @Put('cancel-trip')
  @ApiOperation({ summary: 'Cancel a trip (REQUESTED/ASSIGNED/ACTIVE -> CANCELLED) with optional fee' })
  @ApiResponse({ status: 200, description: 'Trip cancelled' })
  async cancelTrip(
    @Req() req: ExpressRequest & { tenantId?: string },
    @Body() request: { trip_id: string; cancelled_by: 'rider' | 'driver' | 'system'; reason?: string },
  ) {
    const tenantId = req.tenantId as string;
    return this.dispatchService.cancelTrip(tenantId, request.trip_id, request.cancelled_by, request.reason);
  }

  @Post('adjust-trip')
  @ApiOperation({ summary: 'Apply mid-trip or post-trip adjustments: extra_stop, mess_fee, damage_fee, route_deviation, min_wage_supplement, wait_time, toll, gratuity, discount' })
  @ApiResponse({ status: 200, description: 'Adjustments applied and fare updated' })
  async adjustTrip(
    @Req() req: ExpressRequest & { tenantId?: string },
    @Body() request: {
      trip_id: string;
      adjustments: Array<{
        type: 'extra_stop' | 'mess_fee' | 'damage_fee' | 'route_deviation' | 'min_wage_supplement' | 'wait_time' | 'toll' | 'gratuity' | 'discount';
        description: string;
        amount_cents?: number;
        applied_by?: string;
        metadata?: Record<string, any>;
      }>;
    },
  ) {
    const tenantId = req.tenantId as string;
    return this.dispatchService.adjustTrip(tenantId, request.trip_id, request.adjustments);
  }

  @Put('close-trip')
  @ApiOperation({ summary: 'Close a trip (COMPLETED -> CLOSED): final reconciliation, lock all adjustments, record TRIP_CLOSED ledger event' })
  @ApiResponse({ status: 200, description: 'Trip closed with full reconciliation summary' })
  async closeTrip(
    @Req() req: ExpressRequest & { tenantId?: string },
    @Body() request: { trip_id: string; closed_by?: string },
  ) {
    const tenantId = req.tenantId as string;
    return this.dispatchService.closeTrip(tenantId, request.trip_id, request.closed_by || 'system');
  }
}