import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { VehicleConfigService, VehicleConfigRequest, VehicleConfigResponse } from '../services/vehicle-config.service';
import { TenantContext } from '../decorators/tenant-context.decorator';

@Controller('vehicles')
export class VehicleConfigController {
  constructor(private readonly vehicleConfigService: VehicleConfigService) {}

  @Post()
  async createVehicleConfig(
    @TenantContext() tenantId: string,
    @Body() request: VehicleConfigRequest,
  ): Promise<VehicleConfigResponse> {
    return this.vehicleConfigService.createVehicleConfig(tenantId, request);
  }

  @Get()
  async getVehicleConfigs(
    @TenantContext() tenantId: string,
    @Query('activeOnly') activeOnly: boolean = true,
  ): Promise<VehicleConfigResponse[]> {
    return this.vehicleConfigService.getVehicleConfigs(tenantId, activeOnly);
  }

  @Get('categories')
  async getVehicleCategories(@TenantContext() tenantId: string) {
    return this.vehicleConfigService.getVehicleCategories(tenantId);
  }

  @Get(':vehicleType')
  async getVehicleConfigByType(
    @TenantContext() tenantId: string,
    @Param('vehicleType') vehicleType: string,
  ): Promise<VehicleConfigResponse | null> {
    return this.vehicleConfigService.getVehicleConfigByType(tenantId, vehicleType);
  }

  @Put(':vehicleType')
  async updateVehicleConfig(
    @TenantContext() tenantId: string,
    @Param('vehicleType') vehicleType: string,
    @Body() request: Partial<VehicleConfigRequest>,
  ): Promise<VehicleConfigResponse> {
    return this.vehicleConfigService.updateVehicleConfig(tenantId, vehicleType, request);
  }

  @Delete(':vehicleType')
  async deleteVehicleConfig(
    @TenantContext() tenantId: string,
    @Param('vehicleType') vehicleType: string,
  ): Promise<void> {
    return this.vehicleConfigService.deleteVehicleConfig(tenantId, vehicleType);
  }

  @Post('initialize-defaults')
  async initializeDefaultConfigs(@TenantContext() tenantId: string): Promise<VehicleConfigResponse[]> {
    return this.vehicleConfigService.initializeDefaultConfigs(tenantId);
  }
}
