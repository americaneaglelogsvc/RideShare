import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface FluidpayPaymentRequest {
  amount: number; // Amount in cents
  currency: string;
  tenant_id?: string;          // Phase 7.0: Multi-tenant routing
  sub_merchant_id?: string;    // Phase 7.0: Per-tenant sub-merchant
  customer: {
    name: string;
    email?: string;
    phone: string;
  };
  payment_method: {
    type: 'card' | 'bank_account';
    card?: {
      number: string;
      exp_month: string;
      exp_year: string;
      cvc: string;
    };
    bank_account?: {
      account_number: string;
      routing_number: string;
      account_type: 'checking' | 'savings';
    };
  };
  description?: string;
  metadata?: Record<string, any>;
}

export interface FluidpayPaymentResponse {
  id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  amount: number;
  currency: string;
  created_at: string;
  failure_reason?: string;
  receipt_url?: string;
}

export interface FluidpayPayoutRequest {
  amount: number; // Amount in cents
  currency: string;
  destination: {
    type: 'bank_account';
    bank_account: {
      account_number: string;
      routing_number: string;
      account_holder_name: string;
      account_type: 'checking' | 'savings';
    };
  };
  description?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class FluidpayService {
  private readonly logger = new Logger(FluidpayService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.baseUrl = this.configService.get<string>('FLUIDPAY_BASE_URL') || 'https://api.fluidpay.com/v1';
    this.apiKey = this.configService.get<string>('FLUIDPAY_API_KEY') || '';
    
    if (!this.apiKey) {
      this.logger.warn('Fluidpay API key not configured. Payment processing will be simulated.');
    }
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async createPayment(request: FluidpayPaymentRequest): Promise<FluidpayPaymentResponse> {
    // Phase 7.0: Enrich metadata with tenant routing info
    const enrichedRequest = this.enrichWithTenantMetadata(request);

    if (!this.apiKey) {
      return this.createMockPaymentResponse(enrichedRequest);
    }

    try {
      const response: any = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/payments`, enrichedRequest, {
          headers: this.getHeaders()
        })
      );

      return response.data as FluidpayPaymentResponse;
    } catch (error: any) {
      this.logger.error(`Fluidpay payment error: ${error.response?.data || error.message}`);
      throw new BadRequestException('Payment processing failed');
    }
  }

  async getPayment(paymentId: string): Promise<FluidpayPaymentResponse> {
    if (!this.apiKey) {
      // Return mock response for development
      return this.createMockPaymentResponse({ amount: 4500 } as any, paymentId);
    }

    try {
      const response: any = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/payments/${paymentId}`, {
          headers: this.getHeaders()
        })
      );

      return response.data as FluidpayPaymentResponse;
    } catch (error: any) {
      this.logger.error(`Fluidpay get payment error: ${error.response?.data || error.message}`);
      throw new BadRequestException('Failed to retrieve payment');
    }
  }

  async createPayout(request: FluidpayPayoutRequest): Promise<any> {
    // Phase 7.0: Enrich metadata with tenant routing info
    const enrichedRequest = this.enrichPayoutWithTenantMetadata(request);

    if (!this.apiKey) {
      return {
        id: `payout_${Date.now()}`,
        status: 'pending',
        amount: enrichedRequest.amount,
        currency: enrichedRequest.currency,
        created_at: new Date().toISOString(),
        estimated_arrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days
      };
    }

    try {
      const response: any = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/payouts`, enrichedRequest, {
          headers: this.getHeaders()
        })
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(`Fluidpay payout error: ${error.response?.data || error.message}`);
      throw new BadRequestException('Payout processing failed');
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    if (!this.apiKey) {
      // Return mock response for development
      return {
        id: `refund_${Date.now()}`,
        payment_id: paymentId,
        status: 'succeeded',
        amount: amount || 0,
        created_at: new Date().toISOString()
      };
    }

    try {
      const refundData = amount ? { amount } : {};
      const response: any = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/payments/${paymentId}/refunds`, refundData, {
          headers: this.getHeaders()
        })
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(`Fluidpay refund error: ${error.response?.data || error.message}`);
      throw new BadRequestException('Refund processing failed');
    }
  }

  private createMockPaymentResponse(request: FluidpayPaymentRequest, id?: string): FluidpayPaymentResponse {
    return {
      id: id || `payment_${Date.now()}`,
      status: 'succeeded',
      amount: request.amount,
      currency: request.currency || 'USD',
      created_at: new Date().toISOString(),
      receipt_url: `https://receipts.fluidpay.com/mock_${Date.now()}`
    };
  }

  // Phase 7.0: Multi-tenant metadata enrichment
  private enrichWithTenantMetadata(request: FluidpayPaymentRequest): FluidpayPaymentRequest {
    return {
      ...request,
      metadata: {
        ...request.metadata,
        tenant_id: request.tenant_id || request.metadata?.tenant_id || 'unknown',
        sub_merchant_id: request.sub_merchant_id || request.metadata?.sub_merchant_id,
        platform: 'urway_dispatch',
        api_version: '7.0',
      },
    };
  }

  private enrichPayoutWithTenantMetadata(request: FluidpayPayoutRequest): FluidpayPayoutRequest {
    return {
      ...request,
      metadata: {
        ...request.metadata,
        platform: 'urway_dispatch',
        api_version: '7.0',
      },
    };
  }

  // Webhook signature verification
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    if (!this.apiKey) {
      return true; // Skip verification in development
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}