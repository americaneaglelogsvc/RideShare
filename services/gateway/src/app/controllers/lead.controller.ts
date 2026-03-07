import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LeadService } from '../services/lead.service';

@ApiTags('leads')
@Controller('leads')
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createLead(@Body() body: { name: string; email: string; source: string }) {
    try {
      const lead = await this.leadService.createLead(body);
      return lead;
    } catch (error) {
      // Return 400 for validation errors (as expected by load test)
      throw error;
    }
  }
}
