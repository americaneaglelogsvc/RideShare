import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { GlobalMonitorService } from '../services/global-monitor.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.guard';
import { Public } from '../guards/jwt-auth.guard';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly monitor: GlobalMonitorService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    return { ok: true };
  }

  @Get('detailed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'M9.10: Detailed system health pulse (internal only)' })
  @ApiResponse({ status: 200, description: 'DB pool, socket latency, AI response time, alerts' })
  async detailedHealth() {
    return this.monitor.getDetailedHealth();
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PLATFORM_SUPER_ADMIN', 'PLATFORM_OPS')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'M9.10: Health snapshot history' })
  @ApiResponse({ status: 200, description: 'Health snapshots for the last N minutes' })
  async healthHistory(@Query('minutes') minutes?: number) {
    return this.monitor.getHealthHistory(minutes || 60);
  }
}
