import { Controller, Post, Headers, Body, RawBodyRequest, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { DisputeService } from '../services/dispute.service';
import { DistributionService } from '../services/distribution.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UseGuards } from '@nestjs/common';
import { WebhookRateLimitGuard } from '../guards/rate-limit.guard';

@ApiTags('webhooks')
@Controller('webhooks')
@UseGuards(WebhookRateLimitGuard)
export class PaysurityWebhookController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly disputeService: DisputeService,
    private readonly distributionService: DistributionService,
    private readonly configService: ConfigService,
  ) {}

  @Post('paysurity')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle PaySurity/Fluidpay settlement webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handlePaysurityWebhook(
    @Body() body: any,
    @Headers('x-webhook-signature') signature: string,
  ) {
    const secret = this.configService.get<string>('PAYSURITY_WEBHOOK_SECRET');

    if (secret && signature) {
      const payload = JSON.stringify(body);
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature || ''),
        Buffer.from(expectedSignature),
      );

      if (!isValid) {
        return { success: false, error: 'Invalid webhook signature' };
      }
    }

    const eventType = body?.event_type || body?.type;
    const transactionId = body?.transaction_id || body?.data?.id;
    const status = body?.status || body?.data?.status;

    switch (eventType) {
      case 'settlement.completed':
        await this.paymentService.handleSettlementCompleted(transactionId);
        break;

      case 'settlement.failed':
        await this.paymentService.handleSettlementFailed(transactionId);
        break;

      case 'payout.completed':
        await this.paymentService.handlePayoutCompleted(transactionId);
        break;

      case 'transaction.settled':
        await this.distributionService.handleSettlementEvent({
          transaction_id: transactionId,
          metadata: body?.metadata || body?.data?.metadata,
        });
        break;

      case 'chargeback.initiated':
        await this.disputeService.handleChargebackInitiated({
          transaction_id: transactionId,
          disputed_amount_cents: body?.data?.disputed_amount_cents || body?.disputed_amount_cents || 0,
          reason: body?.data?.reason || body?.reason,
          paysurity_dispute_id: body?.data?.dispute_id || body?.dispute_id,
          metadata: body?.metadata || body?.data?.metadata,
        });
        break;

      default:
        console.log(`Unhandled PaySurity webhook event: ${eventType}`);
    }

    return { success: true, event: eventType };
  }
}
