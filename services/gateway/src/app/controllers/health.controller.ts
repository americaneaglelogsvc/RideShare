import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GlobalMonitorService } from '../services/global-monitor.service';

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
  @ApiOperation({ summary: 'M9.10: Detailed system health pulse (internal only)' })
  @ApiResponse({ status: 200, description: 'DB pool, socket latency, AI response time, alerts' })
  async detailedHealth() {
    return this.monitor.getDetailedHealth();
  }

  @Get('history')
  @ApiOperation({ summary: 'M9.10: Health snapshot history' })
  @ApiResponse({ status: 200, description: 'Health snapshots for the last N minutes' })
  async healthHistory(@Query('minutes') minutes?: number) {
    return this.monitor.getHealthHistory(minutes || 60);
  }
}
