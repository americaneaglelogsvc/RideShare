import { Controller, Post, Get, Body, Query, Param, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService } from '../services/pricing.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Pricing')
@Controller('pricing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('quote')
  @ApiOperation({ summary: 'Get pricing quote for a trip' })
  @ApiResponse({ status: 200, description: 'Quote calculated successfully' })
  async getQuote(
    @Body() body: {
      pickup: { lat: number; lng: number; address?: string };
      dropoff: { lat: number; lng: number; address?: string };
      vehicleCategory?: string;
      scheduledTime?: string;
      passengerCount?: number;
      luggageCount?: number;
    },
    @Request() req: any,
  ) {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      if (!tenantId) {
        throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
      }

      const quote = await this.pricingService.calculateQuote({
        tenantId,
        pickup: body.pickup,
        dropoff: body.dropoff,
        vehicleCategory: body.vehicleCategory || 'standard',
        scheduledTime: body.scheduledTime ? new Date(body.scheduledTime) : null,
        passengerCount: body.passengerCount || 1,
        luggageCount: body.luggageCount || 0,
        userId: req.user.sub,
      });

      return {
        success: true,
        data: quote,
      };
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
