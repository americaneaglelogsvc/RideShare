/**
 * @file payment.service.ts
 * @req RIDE-PAY-010  — Tenant direct settlement (default)
 * @req RIDE-PAY-020  — PaySurity settlement (optional)
 * @req PAY-SETL-0001 — Settlement gating (bank_settled) — see processDriverPayout()
 * @req RIDE-PAYOUT-101 — Completely Settled truth — see BANK_SETTLED check
 * @req PAY-ADJ-0001  — Refunds/adjustments — see refundPayment()
 */
import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { FluidpayService, FluidpayPaymentRequest } from './fluidpay.service';

export interface PaymentRequest {
  trip_id: string;
  rider_id: string;
  tenant_id?: string;
  amount_cents: number;
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
  save_payment_method?: boolean;
}

export interface PayoutRequest {
  driver_id: string;
  tenant_id?: string;
  amount_cents: number;
  bank_account: {
    account_number: string;
    routing_number: string;
    account_holder_name: string;
    account_type: 'checking' | 'savings';
  };
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly fluidpayService: FluidpayService
  ) {}

  async processPayment(request: PaymentRequest): Promise<any> {
    const supabase = this.supabaseService.getClient();

    try {
      // Get trip and rider information
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select(`
          *,
          riders (name, phone, email),
          drivers (id, first_name, last_name)
        `)
        .eq('id', request.trip_id)
        .single();

      if (tripError || !trip) {
        throw new NotFoundException('Trip not found');
      }

      // Create payment record in database
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          trip_id: request.trip_id,
          rider_id: request.rider_id,
          driver_id: trip.driver_id,
          tenant_id: request.tenant_id,
          amount_cents: request.amount_cents,
          payment_method: request.payment_method.type,
          status: 'pending'
        })
        .select()
        .single();

      if (paymentError || !payment) {
        throw new BadRequestException('Failed to create payment record');
      }

      // Process payment with Fluidpay
      const fluidpayRequest: FluidpayPaymentRequest = {
        amount: request.amount_cents,
        currency: 'USD',
        customer: {
          name: trip.riders.name,
          email: trip.riders.email,
          phone: trip.riders.phone
        },
        tenant_id: request.tenant_id,
        payment_method: request.payment_method,
        description: `urwaydispatch.com trip payment - ${trip.pickup_address} to ${trip.dropoff_address}`,
        metadata: {
          trip_id: request.trip_id,
          rider_id: request.rider_id,
          driver_id: trip.driver_id,
          payment_id: payment.id
        }
      };

      const fluidpayResponse = await this.fluidpayService.createPayment(fluidpayRequest);

      // Update payment record with Fluidpay response
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          payment_intent_id: fluidpayResponse.id,
          status: fluidpayResponse.status,
          processed_at: fluidpayResponse.status === 'succeeded' ? new Date().toISOString() : null
        })
        .eq('id', payment.id);

      if (updateError) {
        this.logger.error('Failed to update payment record', updateError);
      }

      // If payment succeeded, update trip status
      if (fluidpayResponse.status === 'succeeded') {
        await supabase
          .from('trips')
          .update({ status: 'paid' })
          .eq('id', request.trip_id);
      }

      return {
        success: fluidpayResponse.status === 'succeeded',
        payment_id: payment.id,
        fluidpay_payment_id: fluidpayResponse.id,
        status: fluidpayResponse.status,
        receipt_url: fluidpayResponse.receipt_url,
        message: fluidpayResponse.status === 'succeeded' 
          ? 'Payment processed successfully' 
          : 'Payment is being processed'
      };

    } catch (error: any) {
      this.logger.error(`Payment processing error: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Payment processing failed');
    }
  }

  async processDriverPayout(request: PayoutRequest): Promise<any> {
    const supabase = this.supabaseService.getClient();

    try {
      // Get driver information (tenant-scoped via driver_profiles)
      const { data: driver, error: driverError } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('id', request.driver_id)
        .single();

      if (driverError || !driver) {
        throw new NotFoundException('Driver not found');
      }

      // PAY-SETTLE-002: BANK_SETTLED hard-gate
      // Check if there are eligible (BANK_SETTLED) funds
      const { data: settled } = await supabase
        .from('driver_payouts')
        .select('id, amount_cents')
        .eq('driver_id', request.driver_id)
        .eq('settlement_status', 'BANK_SETTLED');

      const settledTotal = (settled || []).reduce(
        (sum: number, p: { amount_cents: number }) => sum + p.amount_cents, 0
      );

      if (settledTotal < request.amount_cents) {
        throw new BadRequestException(
          `Payout rejected: requested ${request.amount_cents} cents but only ${settledTotal} cents are in BANK_SETTLED state. ` +
          'Funds must be fully settled before payout initiation (PAY-SETTLE-002).'
        );
      }

      // Create payout record with PAYOUT_INITIATED settlement status
      const { data: payout, error: payoutError } = await supabase
        .from('driver_payouts')
        .insert({
          driver_id: request.driver_id,
          amount_cents: request.amount_cents,
          tenant_id: request.tenant_id,
          status: 'pending',
          settlement_status: 'PENDING_BANK_SETTLEMENT',
          bank_account: request.bank_account
        })
        .select()
        .single();

      if (payoutError || !payout) {
        throw new BadRequestException('Failed to create payout record');
      }

      // Process payout with Fluidpay
      const fluidpayPayout = await this.fluidpayService.createPayout({
        amount: request.amount_cents,
        currency: 'USD',
        destination: {
          type: 'bank_account',
          bank_account: request.bank_account
        },
        description: `Driver payout - ${driver.first_name} ${driver.last_name}`,
        metadata: {
          driver_id: request.driver_id,
          payout_id: payout.id
        }
      });

      // Update payout record
      await supabase
        .from('driver_payouts')
        .update({
          fluidpay_payout_id: fluidpayPayout.id,
          status: fluidpayPayout.status,
          estimated_arrival: fluidpayPayout.estimated_arrival
        })
        .eq('id', payout.id);

      return {
        success: true,
        payout_id: payout.id,
        fluidpay_payout_id: fluidpayPayout.id,
        status: fluidpayPayout.status,
        settlement_status: 'PENDING_BANK_SETTLEMENT',
        estimated_arrival: fluidpayPayout.estimated_arrival,
        message: 'Payout initiated successfully'
      };

    } catch (error: any) {
      this.logger.error(`Payout processing error: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Payout processing failed');
    }
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select(`
          *,
          trips (pickup_address, dropoff_address),
          riders (name),
          drivers (first_name, last_name)
        `)
        .eq('id', paymentId)
        .single();

      if (error || !payment) {
        throw new NotFoundException('Payment not found');
      }

      // Get latest status from Fluidpay if we have a payment intent ID
      if (payment.payment_intent_id) {
        try {
          const fluidpayPayment = await this.fluidpayService.getPayment(payment.payment_intent_id);
          
          // Update local status if it changed
          if (fluidpayPayment.status !== payment.status) {
            await supabase
              .from('payments')
              .update({ 
                status: fluidpayPayment.status,
                processed_at: fluidpayPayment.status === 'succeeded' ? new Date().toISOString() : null
              })
              .eq('id', paymentId);
            
            payment.status = fluidpayPayment.status;
          }
        } catch (error: any) {
          this.logger.warn(`Error fetching Fluidpay payment status: ${(error as any).message}`);
        }
      }

      return {
        payment_id: payment.id,
        trip_id: payment.trip_id,
        amount_cents: payment.amount_cents,
        status: payment.status,
        payment_method: payment.payment_method,
        processed_at: payment.processed_at,
        trip_details: {
          pickup: payment.trips.pickup_address,
          dropoff: payment.trips.dropoff_address
        },
        rider_name: payment.riders.name,
        driver_name: `${payment.drivers.first_name} ${payment.drivers.last_name}`
      };

    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error getting payment status: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to get payment status');
    }
  }

  async refundPayment(paymentId: string, amount?: number): Promise<any> {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error || !payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status !== 'succeeded') {
        throw new BadRequestException('Can only refund successful payments');
      }

      // Process refund with Fluidpay
      const refund = await this.fluidpayService.refundPayment(
        payment.payment_intent_id,
        amount
      );

      // Create refund record
      await supabase
        .from('payment_refunds')
        .insert({
          payment_id: paymentId,
          amount_cents: amount || payment.amount_cents,
          fluidpay_refund_id: refund.id,
          status: refund.status,
          reason: 'requested_by_customer'
        });

      return {
        success: true,
        refund_id: refund.id,
        amount_refunded: amount || payment.amount_cents,
        status: refund.status,
        message: 'Refund processed successfully'
      };

    } catch (error: any) {
      this.logger.error(`Refund processing error: ${error.message}`, error.stack);
      throw new BadRequestException(error.message || 'Refund processing failed');
    }
  }

  // Handle Fluidpay webhooks
  async handleWebhook(payload: any, signature: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    try {
      // Verify webhook signature
      const webhookSecret = process.env.FLUIDPAY_WEBHOOK_SECRET || '';
      const isValid = this.fluidpayService.verifyWebhookSignature(
        JSON.stringify(payload),
        signature,
        webhookSecret
      );

      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }

      const { type, data } = payload;

      switch (type) {
        case 'payment.succeeded':
        case 'payment.failed':
          await this.updatePaymentStatus(data.id, data.status);
          break;
        
        case 'payout.paid':
        case 'payout.failed':
          await this.updatePayoutStatus(data.id, data.status);
          break;
        
        default:
          this.logger.warn(`Unhandled webhook type: ${type}`);
      }

    } catch (error: any) {
      this.logger.error(`Webhook processing error: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  private async updatePaymentStatus(fluidpayPaymentId: string, status: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    await supabase
      .from('payments')
      .update({ 
        status,
        processed_at: status === 'succeeded' ? new Date().toISOString() : null
      })
      .eq('payment_intent_id', fluidpayPaymentId);
  }

  private async updatePayoutStatus(fluidpayPayoutId: string, status: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    
    await supabase
      .from('driver_payouts')
      .update({ status })
      .eq('fluidpay_payout_id', fluidpayPayoutId);
  }

  async handleSettlementCompleted(transactionId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    await supabase
      .from('driver_payouts')
      .update({ settlement_status: 'BANK_SETTLED' })
      .eq('fluidpay_payout_id', transactionId);
  }

  async handleSettlementFailed(transactionId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    await supabase
      .from('driver_payouts')
      .update({ settlement_status: 'FAILED' })
      .eq('fluidpay_payout_id', transactionId);
  }

  async handlePayoutCompleted(transactionId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    await supabase
      .from('driver_payouts')
      .update({ settlement_status: 'PAID' })
      .eq('fluidpay_payout_id', transactionId);
  }
}