import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OutboundWebhookService } from '../services/outbound-webhook.service';
import { TenantApiKeyService } from '../services/tenant-api-key.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('developer')
@Controller('developer')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeveloperController {
  constructor(
    private readonly webhookService: OutboundWebhookService,
    private readonly apiKeyService: TenantApiKeyService,
  ) {}

  // ── Webhooks ───────────────────────────────────────────────────────

  @Post(':tenantId/webhooks')
  @ApiOperation({ summary: 'Register an outbound webhook URL' })
  @ApiResponse({ status: 201, description: 'Webhook registered (secret returned once)' })
  async registerWebhook(
    @Param('tenantId') tenantId: string,
    @Body() body: { url: string; events?: string[] },
  ) {
    return this.webhookService.registerWebhook(tenantId, body.url, body.events);
  }

  @Get(':tenantId/webhooks')
  @ApiOperation({ summary: 'List registered webhooks for a tenant' })
  @ApiResponse({ status: 200, description: 'Webhook list' })
  async listWebhooks(@Param('tenantId') tenantId: string) {
    return this.webhookService.listWebhooks(tenantId);
  }

  @Delete(':tenantId/webhooks/:webhookId')
  @ApiOperation({ summary: 'Deactivate a webhook' })
  @ApiResponse({ status: 200, description: 'Webhook deactivated' })
  async deactivateWebhook(
    @Param('tenantId') tenantId: string,
    @Param('webhookId') webhookId: string,
  ) {
    return this.webhookService.deactivateWebhook(tenantId, webhookId);
  }

  @Get(':tenantId/webhooks/deliveries')
  @ApiOperation({ summary: 'View webhook delivery log' })
  @ApiResponse({ status: 200, description: 'Delivery log' })
  async getDeliveryLog(
    @Param('tenantId') tenantId: string,
    @Query('webhook_id') webhookId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.webhookService.getDeliveryLog(tenantId, webhookId, limit || 50);
  }

  // ── API Keys ───────────────────────────────────────────────────────

  @Post(':tenantId/api-keys')
  @ApiOperation({ summary: 'Generate a new uwd_live_ API key (raw key returned once)' })
  @ApiResponse({ status: 201, description: 'API key generated' })
  async generateApiKey(
    @Param('tenantId') tenantId: string,
    @Body() body: { label?: string },
  ) {
    return this.apiKeyService.generateKey(tenantId, body.label);
  }

  @Get(':tenantId/api-keys')
  @ApiOperation({ summary: 'List API keys for a tenant (secrets never exposed)' })
  @ApiResponse({ status: 200, description: 'API key list' })
  async listApiKeys(@Param('tenantId') tenantId: string) {
    return this.apiKeyService.listKeys(tenantId);
  }

  @Delete(':tenantId/api-keys/:keyId')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  async revokeApiKey(
    @Param('tenantId') tenantId: string,
    @Param('keyId') keyId: string,
  ) {
    return this.apiKeyService.revokeKey(tenantId, keyId);
  }
}
