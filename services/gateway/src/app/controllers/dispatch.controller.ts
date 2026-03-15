import { Controller, Post, Body, Get, Param, Put, Req } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DispatchService } from '../services/dispatch.service';
import {
  FindDriversDto, DispatchRideDto, AcceptOfferDto, AcceptTripDto,
  TripIdDto, CancelTripDto, AdjustTripDto, CloseTripDto,
} from '../dto/dispatch.dto';

@ApiTags('dispatch')
@Controller('dispatch')
@ApiBearerAuth()
export class DispatchController {
  constructor(private readonly dispatchService: DispatchService) {}

  @Post('find-drivers')
  @ApiOperation({ summary: 'Find available drivers for a pickup location' })
  @ApiResponse({ status: 200, description: 'List of available drivers' })
  async findDrivers(
    @Req() req: ExpressRequest & { tenantId?: string },
    @Body() dto: FindDriversDto,
  ): Promise<any> {
    const tenantId = req.tenantId as string;
    const drivers = await this.dispatchService.findAvailableDrivers(
      tenantId, dto.pickup_lat, dto.pickup_lng, dto.category, dto.max_distance,
    );
    return { success: true, drivers, count: drivers.length };
  }

  @Post('dispatch-ride')
  @ApiOperation({ summary: 'Dispatch a ride to available drivers' })
  @ApiResponse({ status: 200, description: 'Ride dispatched successfully' })
  async dispatchRide(
    @Req() req: ExpressRequest & { tenantId?: string },
    @Body() dto: DispatchRideDto,
  ) {
    const tenantId = req.tenantId as string;
    const tripId = await this.dispatchService.dispatchRide({
      tenantId,
      riderId: dto.rider_id,
      riderName: dto.rider_name,
      riderPhone: dto.rider_phone,
      pickup: dto.pickup,
      dropoff: dto.dropoff,
      category: dto.category,
      estimatedFare: dto.estimated_fare,
      specialInstructions: dto.special_instructions,
    });

    if (!tripId) {
      return { success: false, message: 'No available drivers found' };
    }
    return { success: true, trip_id: tripId, message: 'Ride dispatched to available drivers' };
  }

  @Put('accept-offer/:offerId')
  @ApiOperation({ summary: 'Accept a ride offer' })
  @ApiResponse({ status: 200, description: 'Offer accepted successfully' })
  async acceptOffer(
    @Param('offerId') offerId: string,
    @Req() req: ExpressRequest & { tenantId?: string },
    @Body() dto: AcceptOfferDto,
  ) {
    const tenantId = req.tenantId as string;
    const success = await this.dispatchService.acceptRideOffer(tenantId, dto.driver_id, offerId);
    return { success, message: success ? 'Offer accepted successfully' : 'Failed to accept offer' };
  }

  @Put('accept-trip')
  @ApiOperation({ summary: 'Accept a trip (tripId + driverId) with concurrency lock' })
  @ApiResponse({ status: 200, description: 'Trip accepted successfully' })
  async acceptTrip(
    @Req() req: ExpressRequest & { tenantId?: string },
    @Body() dto: AcceptTripDto,
  ) {
    const tenantId = req.tenantId as string;
    return this.dispatchService.acceptOffer(tenantId, dto.trip_id, dto.driver_id);
  }

  @Put('start-trip')
  @ApiOperation({ summary: 'Start a trip (ASSIGNED -> ACTIVE)' })
  @ApiResponse({ status: 200, description: 'Trip started successfully' })
  async startTrip(
    @Req() req: ExpressRequest & { tenantId?: string },
    @Body() dto: TripIdDto,
  ) {
    const tenantId = req.tenantId as string;
    return this.dispatchService.startTrip(tenantId, dto.trip_id);
  }

  @Put('complete-trip')
  @ApiOperation({ summary: 'Complete a trip (ACTIVE -> COMPLETED) and record ledger entry' })
  @ApiResponse({ status: 200, description: 'Trip completed successfully' })
  async completeTrip(
    @Req() req: ExpressRequest & { tenantId?: string },
    @Body() dto: TripIdDto,
  ) {
    const tenantId = req.tenantId as string;
    return this.dispatchService.completeTrip(tenantId, dto.trip_id);
  }

  @Put('cancel-trip')
  @ApiOperation({ summary: 'Cancel a trip (REQUESTED/ASSIGNED/ACTIVE -> CANCELLED) with optional fee' })
  @ApiResponse({ status: 200, description: 'Trip cancelled' })
  async cancelTrip(
    @Req() req: ExpressRequest & { tenantId?: string },
    @Body() dto: CancelTripDto,
  ) {
    const tenantId = req.tenantId as string;
    return this.dispatchService.cancelTrip(tenantId, dto.trip_id, dto.cancelled_by, dto.reason);
  }

  @Post('adjust-trip')
  @ApiOperation({ summary: 'Apply mid-trip or post-trip adjustments' })
  @ApiResponse({ status: 200, description: 'Adjustments applied and fare updated' })
  async adjustTrip(
    @Req() req: ExpressRequest & { tenantId?: string },
    @Body() dto: AdjustTripDto,
  ) {
    const tenantId = req.tenantId as string;
    return this.dispatchService.adjustTrip(tenantId, dto.trip_id, dto.adjustments);
  }

  @Put('close-trip')
  @ApiOperation({ summary: 'Close a trip (COMPLETED -> CLOSED): final reconciliation' })
  @ApiResponse({ status: 200, description: 'Trip closed with full reconciliation summary' })
  async closeTrip(
    @Req() req: ExpressRequest & { tenantId?: string },
    @Body() dto: CloseTripDto,
  ) {
    const tenantId = req.tenantId as string;
    return this.dispatchService.closeTrip(tenantId, dto.trip_id, dto.closed_by || 'system');
  }
}