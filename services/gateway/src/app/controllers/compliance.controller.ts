import { Controller, Post, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ComplianceService } from '../services/compliance.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

/**
 * M11.4: Document Controller — Tenant-Specific Compliance Vault
 *
 * All endpoints are tenant-scoped. Tenant A documents are invisible to Tenant B.
 */
@ApiTags('compliance')
@Controller('compliance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post(':tenantId/drivers/:driverProfileId/documents')
  @ApiOperation({ summary: 'M11.4: Upload a compliance document for a driver (tenant-siloed)' })
  @ApiResponse({ status: 201, description: 'Document uploaded' })
  async uploadDocument(
    @Param('tenantId') tenantId: string,
    @Param('driverProfileId') driverProfileId: string,
    @Body() body: {
      driver_identity_id: string;
      document_type: string;
      document_name: string;
      file_url?: string;
      file_hash?: string;
      issued_date?: string;
      expiry_date?: string;
      metadata?: Record<string, any>;
    },
  ) {
    return this.complianceService.uploadDocument({
      tenantId,
      driverIdentityId: body.driver_identity_id,
      driverProfileId,
      documentType: body.document_type,
      documentName: body.document_name,
      fileUrl: body.file_url,
      fileHash: body.file_hash,
      issuedDate: body.issued_date,
      expiryDate: body.expiry_date,
      metadata: body.metadata,
    });
  }

  @Get(':tenantId/drivers/:driverProfileId/documents')
  @ApiOperation({ summary: 'M11.4: List compliance documents for a driver (tenant-siloed)' })
  @ApiResponse({ status: 200, description: 'Document list' })
  async listDocuments(
    @Param('tenantId') tenantId: string,
    @Param('driverProfileId') driverProfileId: string,
  ) {
    return this.complianceService.listDocuments(tenantId, driverProfileId);
  }

  @Put(':tenantId/documents/:documentId/review')
  @ApiOperation({ summary: 'M11.4: Approve or reject a compliance document' })
  @ApiResponse({ status: 200, description: 'Document reviewed' })
  async reviewDocument(
    @Param('tenantId') tenantId: string,
    @Param('documentId') documentId: string,
    @Body() body: {
      decision: 'approved' | 'rejected';
      reviewed_by: string;
      rejection_reason?: string;
    },
  ) {
    return this.complianceService.reviewDocument(
      tenantId,
      documentId,
      body.decision,
      body.reviewed_by,
      body.rejection_reason,
    );
  }

  @Get(':tenantId/drivers/:driverProfileId/status')
  @ApiOperation({ summary: 'M11.4: Check if a driver is compliant for this tenant' })
  @ApiResponse({ status: 200, description: 'Compliance status' })
  async checkCompliance(
    @Param('tenantId') tenantId: string,
    @Param('driverProfileId') driverProfileId: string,
  ) {
    return this.complianceService.isDriverCompliant(tenantId, driverProfileId);
  }

  @Get(':tenantId/expiring')
  @ApiOperation({ summary: 'M11.4: List documents expiring within N days' })
  @ApiResponse({ status: 200, description: 'Expiring documents' })
  async getExpiringDocuments(
    @Param('tenantId') tenantId: string,
    @Query('days') days?: number,
  ) {
    return this.complianceService.getExpiringDocuments(tenantId, days || 30);
  }

  @Get(':tenantId/summary')
  @ApiOperation({ summary: 'M11.4: Tenant compliance summary dashboard' })
  @ApiResponse({ status: 200, description: 'Compliance summary' })
  async getTenantSummary(@Param('tenantId') tenantId: string) {
    return this.complianceService.getTenantComplianceSummary(tenantId);
  }
}
