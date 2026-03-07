import { Controller, Post, Get, Put, Body, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReservationsService, BookingRequest, BookingResponse } from '../services/reservations.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Reservations')
@Controller('reservations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post('book')
  @ApiOperation({ summary: 'Create a new reservation/booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  async createBooking(
    @Body() body: {
      quote_id: string;
      rider_name: string;
      rider_phone: string;
      pickup_time: string;
      special_instructions?: string;
    },
    @Request() req: any
  ): Promise<BookingResponse> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
      }

      const booking = await this.reservationsService.createBooking({
        tenantId,
        quote_id: body.quote_id,
        rider_name: body.rider_name,
        rider_phone: body.rider_phone,
        pickup_time: body.pickup_time,
        special_instructions: body.special_instructions,
      });

      return booking;
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
          code: 'BOOKING_CREATION_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('rider/:riderId')
  @ApiOperation({ summary: 'Get rider\'s booking history' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async getRiderBookings(
    @Request() req: any,
  ) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
      }

      // For now, return a placeholder since the service doesn't have this method yet
      const bookings = await this.getBookingsFromDatabase(tenantId, req.user.sub);

      return {
        success: true,
        data: bookings,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
          code: 'BOOKINGS_RETRIEVAL_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Helper method to get bookings from database
  private async getBookingsFromDatabase(tenantId: string, riderId: string) {
    // This would be implemented in the service layer
    // For now, return placeholder data
    return {
      bookings: [],
      total: 0,
      page: 1,
      limit: 20,
    };
  }
}
