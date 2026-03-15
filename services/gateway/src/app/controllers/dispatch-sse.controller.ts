import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { SupabaseService } from '../services/supabase.service';

/**
 * Phase 8: SSE + poll fallback for dispatch real-time (DIS-REAL-0001).
 * Clients that cannot hold a WebSocket use these endpoints instead.
 */
@ApiTags('dispatch-realtime')
@Controller('dispatch/realtime')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DispatchSseController {
  private readonly logger = new Logger(DispatchSseController.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * SSE stream: emits trip state changes for a specific driver in a tenant.
   * Client connects with EventSource and receives { tripId, status, ... } events.
   */
  @Get('sse/driver/:driverId')
  @Roles('DRIVER', 'PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS')
  @ApiOperation({ summary: 'SSE stream of trip events for a driver (fallback for WebSocket)' })
  @ApiResponse({ status: 200, description: 'SSE event stream' })
  async driverSse(
    @Param('driverId') driverId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const tenantId = req.headers['x-tenant-id'] || req.tenantId;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.flushHeaders();

    // Retry directive: client reconnects in 1s on disconnect
    res.write('retry: 1000\n\n');

    res.write(`data: ${JSON.stringify({ type: 'connected', driverId, tenantId })}\n\n`);

    const supabase = this.supabaseService.getClient();
    const channel = supabase
      .channel(`sse-driver-${tenantId}-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload: any) => {
          const event = {
            type: 'trip_update',
            tripId: payload.new?.id,
            status: payload.new?.status,
            driverId: payload.new?.driver_id,
            riderId: payload.new?.rider_id,
            pickupAddress: payload.new?.pickup_address,
            dropoffAddress: payload.new?.dropoff_address,
            updatedAt: payload.new?.updated_at,
          };
          res.write(`event: trip-update\ndata: ${JSON.stringify(event)}\n\n`);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_offers',
          filter: `driver_id=eq.${driverId}`,
        },
        (payload: any) => {
          const event = {
            type: 'new_offer',
            offerId: payload.new?.id,
            tripId: payload.new?.trip_id,
            riderId: payload.new?.rider_id,
            riderName: payload.new?.rider_name || 'Rider',
            pickup: {
              address: payload.new?.pickup_address,
              lat: payload.new?.pickup_lat,
              lng: payload.new?.pickup_lng,
            },
            dropoff: {
              address: payload.new?.dropoff_address,
              lat: payload.new?.dropoff_lat,
              lng: payload.new?.dropoff_lng,
            },
            estimatedFare: payload.new?.estimated_fare_cents || 0,
            netPayout: payload.new?.net_payout_cents || 0,
            estimatedDistance: payload.new?.estimated_distance_miles || 0,
            estimatedDuration: payload.new?.estimated_duration_minutes || 0,
            pickupEta: payload.new?.pickup_eta_minutes || 5,
            category: payload.new?.category || 'sedan',
            specialInstructions: payload.new?.special_instructions,
            expiresAt: payload.new?.expires_at,
          };
          res.write(`event: ride-offer\ndata: ${JSON.stringify(event)}\n\n`);
        },
      )
      .subscribe();

    const heartbeat = setInterval(() => {
      res.write(`: heartbeat\n\n`);
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
      this.logger.log(`SSE closed: driver ${driverId} tenant ${tenantId}`);
    });
  }

  /**
   * SSE stream: emits trip state changes for a specific rider in a tenant.
   */
  @Get('sse/rider/:riderId')
  @Roles('RIDER', 'PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS')
  @ApiOperation({ summary: 'SSE stream of trip events for a rider (fallback for WebSocket)' })
  @ApiResponse({ status: 200, description: 'SSE event stream' })
  async riderSse(
    @Param('riderId') riderId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const tenantId = req.headers['x-tenant-id'] || req.tenantId;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.flushHeaders();

    res.write('retry: 1000\n\n');

    res.write(`data: ${JSON.stringify({ type: 'connected', riderId, tenantId })}\n\n`);

    const supabase = this.supabaseService.getClient();
    const channel = supabase
      .channel(`sse-rider-${tenantId}-${riderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `rider_id=eq.${riderId}`,
        },
        (payload: any) => {
          const event = {
            type: 'trip_update',
            tripId: payload.new?.id,
            status: payload.new?.status,
            driverId: payload.new?.driver_id,
            pickupAddress: payload.new?.pickup_address,
            dropoffAddress: payload.new?.dropoff_address,
            fareCents: payload.new?.fare_cents,
            updatedAt: payload.new?.updated_at,
          };
          res.write(`event: trip-update\ndata: ${JSON.stringify(event)}\n\n`);
        },
      )
      .subscribe();

    const heartbeat = setInterval(() => {
      res.write(`: heartbeat\n\n`);
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      supabase.removeChannel(channel);
      this.logger.log(`SSE closed: rider ${riderId} tenant ${tenantId}`);
    });
  }

  /**
   * Poll endpoint: get current trip state (for clients that cannot use SSE or WS).
   */
  @Get('poll/trip/:tripId')
  @Roles('DRIVER', 'RIDER', 'TENANT_OWNER', 'TENANT_OPS_ADMIN', 'TENANT_DISPATCHER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Poll current trip state (fallback for SSE and WebSocket)' })
  @ApiResponse({ status: 200, description: 'Current trip state' })
  async pollTrip(
    @Param('tripId') tripId: string,
    @Req() req: any,
  ) {
    const tenantId = req.headers['x-tenant-id'] || req.tenantId;
    const supabase = this.supabaseService.getClient();

    const { data: trip, error } = await supabase
      .from('trips')
      .select('id, status, driver_id, rider_id, pickup_address, dropoff_address, fare_cents, updated_at')
      .eq('id', tripId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !trip) {
      return { success: false, message: 'Trip not found' };
    }

    return { success: true, trip };
  }

  /**
   * Poll endpoint: get pending offers for a driver.
   */
  @Get('poll/offers/:driverId')
  @Roles('DRIVER', 'PLATFORM_SUPER_ADMIN')
  @ApiOperation({ summary: 'Poll pending ride offers for a driver' })
  @ApiResponse({ status: 200, description: 'Pending offers' })
  async pollOffers(
    @Param('driverId') driverId: string,
    @Req() req: any,
  ) {
    const tenantId = req.headers['x-tenant-id'] || req.tenantId;
    const supabase = this.supabaseService.getClient();

    const { data: offers, error } = await supabase
      .from('ride_offers')
      .select('id, trip_id, status, expires_at, created_at')
      .eq('driver_id', driverId)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, message: 'Failed to fetch offers' };
    }

    return { success: true, offers: offers || [], count: (offers || []).length };
  }
}
