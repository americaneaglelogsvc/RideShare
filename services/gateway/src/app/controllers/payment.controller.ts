import { Controller, Post, Get, Body, Param, Headers, RawBodyRequest, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService, PaymentRequest, PayoutRequest } from '../services/payment.service';
import { IdempotencyGuard, IdempotencyInterceptor } from '../guards/idempotency.guard';
import { JwtAuthGuard, Public } from '../guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('process')
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Process payment for a trip' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  async processPayment(@Body() request: PaymentRequest) {
    return this.paymentService.processPayment(request);
  }

  @Post('payout')
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Process payout to driver' })
  @ApiResponse({ status: 200, description: 'Payout processed successfully' })
  async processDriverPayout(@Body() request: PayoutRequest) {
    return this.paymentService.processDriverPayout(request);
  }

  @Get(':paymentId/status')
  @ApiOperation({ summary: 'Get payment status' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  async getPaymentStatus(@Param('paymentId') paymentId: string) {
    return this.paymentService.getPaymentStatus(paymentId);
  }

  @Post(':paymentId/refund')
  @UseGuards(IdempotencyGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Refund a payment' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() body: { amount?: number }
  ) {
    return this.paymentService.refundPayment(paymentId, body.amount);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Handle Fluidpay webhooks' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('fluidpay-signature') signature: string
  ) {
    await this.paymentService.handleWebhook(req.body, signature);
    return { success: true };
  }
}