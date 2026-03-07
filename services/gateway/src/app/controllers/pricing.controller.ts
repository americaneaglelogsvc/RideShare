import { Controller, Post, Get, Body, Query, Param, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService, QuoteRequest, QuoteResponse } from '../services/pricing.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Retry } from '../decorators/retry.decorator';

@ApiTags('Pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('quote')
  @ApiOperation({ summary: 'Get pricing quote for a trip (public)' })
  @ApiResponse({ status: 200, description: 'Quote calculated successfully' })
  @Retry({ maxAttempts: 3, delay: 100 })
  async getPublicQuote(
    @Body() body: {
      pickupLat: number;
      pickupLng: number;
      dropoffLat: number;
      dropoffLng: number;
      vehicleCategory?: string;
    },
  ) {
    try {
      // Mock public quote calculation
      const distance = Math.sqrt(
        Math.pow(body.dropoffLat - body.pickupLat, 2) + 
        Math.pow(body.dropoffLng - body.pickupLng, 2)
      ) * 111; // Rough distance in km
      
      const baseFare = 15;
      const perKm = 2.5;
      const categoryMultiplier = body.vehicleCategory === 'black_sedan' ? 2 : 1;
      
      const estimatedFare = Math.round((baseFare + distance * perKm) * categoryMultiplier * 100);
      
      return {
        estimated_fare_cents: estimatedFare,
        estimated_duration_minutes: Math.round(distance * 3),
        line_items: [
          { name: 'Base Fare', amount_cents: Math.round(baseFare * 100) },
          { name: 'Distance', amount_cents: Math.round(distance * perKm * 100) }
        ]
      };
    } catch (error: any) {
      throw new HttpException(error.message || 'Quote calculation failed', HttpStatus.BAD_REQUEST);
    }
  }

  @Post('quote/auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pricing quote for a trip (authenticated)' })
  @ApiResponse({ status: 200, description: 'Quote calculated successfully' })
  async getQuote(
    @Body() body: {
      pickup: { lat: number; lng: number; address?: string };
      dropoff: { lat: number; lng: number; address?: string };
      vehicleCategory?: string;
      passengerCount?: number;
      luggageCount?: number;
    },
    @Request() req: any,
  ): Promise<QuoteResponse> {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
      }

      const quote = await this.pricingService.calculateQuote({
        tenantId,
        pickup: body.pickup,
        dropoff: body.dropoff,
        category: body.vehicleCategory || 'standard'
      });

      return quote;
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
          code: 'QUOTE_CALCULATION_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get available vehicle categories with pricing' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getVehicleCategories(@Request() req: any) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
      }

      const categories = await this.pricingService.getVehicleCategories(tenantId);

      return {
        success: true,
        data: categories,
      };
    } catch (error: any) {
      throw new HttpException(
        {
          success: false,
          error: error.message,
          code: 'CATEGORIES_RETRIEVAL_FAILED',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
