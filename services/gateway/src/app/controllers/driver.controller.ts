import { Controller, Post, Get, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';

interface AuthenticatedRequest extends ExpressRequest {
  tenantId?: string;
  user?: { id: string };
}
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DriverService } from '../services/driver.service';
import { JwtAuthGuard, Public } from '../guards/jwt-auth.guard';
import {
  DriverAuthDto,
  DriverRegistrationDto,
  DriverProfileDto,
  DriverStatusUpdateDto,
  LocationUpdateDto,
  RideOfferDto,
  RideOfferResponseDto,
  EarningsDto,
  TripHistoryDto,
} from '../dto/driver.dto';

@ApiTags('driver')
@Controller('driver')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Public()
  @Post('auth/login')
  @ApiOperation({ summary: 'Driver login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Req() req: AuthenticatedRequest, @Body() loginDto: DriverAuthDto) {
    const tenantId = req.tenantId as string;
    return this.driverService.login(tenantId, loginDto);
  }

  @Public()
  @Post('auth/register')
  @ApiOperation({ summary: 'Driver registration' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  async register(@Req() req: AuthenticatedRequest, @Body() registrationDto: DriverRegistrationDto) {
    const tenantId = req.tenantId as string;
    return this.driverService.register(tenantId, registrationDto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get driver profile' })
  @ApiResponse({ status: 200, type: DriverProfileDto })
  async getProfile(@Req() req: AuthenticatedRequest) {
    const driverId = req.user!.id;
    const tenantId = req.tenantId as string;
    return this.driverService.getProfile(tenantId, driverId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update driver profile' })
  @ApiResponse({ status: 200, type: DriverProfileDto })
  async updateProfile(@Req() req: AuthenticatedRequest, @Body() profileData: Partial<DriverProfileDto>) {
    const driverId = req.user!.id;
    const tenantId = req.tenantId as string;
    return this.driverService.updateProfile(tenantId, driverId, profileData);
  }

  @Put('status')
  @ApiOperation({ summary: 'Update driver status (online/offline)' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateStatus(@Req() req: AuthenticatedRequest, @Body() statusUpdate: DriverStatusUpdateDto) {
    const driverId = req.user!.id;
    const tenantId = req.tenantId as string;
    return this.driverService.updateStatus(tenantId, driverId, statusUpdate);
  }

  @Post('location')
  @ApiOperation({ summary: 'Update driver location' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  async updateLocation(@Req() req: AuthenticatedRequest, @Body() location: LocationUpdateDto) {
    const driverId = req.user!.id;
    const tenantId = req.tenantId as string;
    return this.driverService.updateLocation(tenantId, driverId, location);
  }

  @Get('offers/current')
  @ApiOperation({ summary: 'Get current ride offer' })
  @ApiResponse({ status: 200, type: RideOfferDto })
  async getCurrentOffer(@Req() req: AuthenticatedRequest) {
    const driverId = req.user!.id;
    const tenantId = req.tenantId as string;
    return this.driverService.getCurrentOffer(tenantId, driverId);
  }

  @Post('offers/:offerId/respond')
  @ApiOperation({ summary: 'Respond to ride offer (accept/decline)' })
  @ApiResponse({ status: 200, description: 'Response recorded successfully' })
  async respondToOffer(
    @Req() req: AuthenticatedRequest,
    @Param('offerId') offerId: string,
    @Body() response: RideOfferResponseDto
  ) {
    const driverId = req.user!.id;
    const tenantId = req.tenantId as string;
    return this.driverService.respondToOffer(tenantId, driverId, offerId, response);
  }

  @Get('earnings')
  @ApiOperation({ summary: 'Get driver earnings' })
  @ApiResponse({ status: 200, type: EarningsDto })
  async getEarnings(
    @Req() req: AuthenticatedRequest,
    @Query('period') period: string = 'week'
  ) {
    const driverId = req.user!.id;
    const tenantId = req.tenantId as string;
    return this.driverService.getEarnings(tenantId, driverId, period);
  }

  @Get('trips/history')
  @ApiOperation({ summary: 'Get trip history' })
  @ApiResponse({ status: 200, type: [TripHistoryDto] })
  async getTripHistory(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0
  ) {
    const driverId = req.user!.id;
    const tenantId = req.tenantId as string;
    return this.driverService.getTripHistory(tenantId, driverId, limit, offset);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get driver dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(@Req() req: AuthenticatedRequest) {
    const driverId = req.user!.id;
    const tenantId = req.tenantId as string;
    return this.driverService.getDashboard(tenantId, driverId);
  }
}