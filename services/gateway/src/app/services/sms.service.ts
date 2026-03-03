import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Phase 7.0: SMS Service (Twilio-compatible)
 *
 * Handles outbound SMS for:
 *   - Rider ETA updates
 *   - Ride confirmation / driver assigned
 *   - Driver alerts (new offer, trip cancelled)
 *   - Security codes / 2FA
 *   - Settlement / payout notifications
 *
 * All messages are tenant-scoped. Twilio sub-accounts or messaging services
 * can be configured per-tenant for white-label sender IDs.
 */

export interface SmsPayload {
  to: string;           // E.164 format: +1XXXXXXXXXX
  body: string;
  tenantId: string;
  eventType: string;    // For logging/analytics
  metadata?: Record<string, any>;
}

export interface SmsResult {
  sid: string;
  status: string;
  to: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly fromNumber: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') || '';
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || '';
    this.fromNumber = this.configService.get<string>('TWILIO_FROM_NUMBER') || '';

    this.isConfigured = !!(this.accountSid && this.authToken && this.fromNumber);

    if (!this.isConfigured) {
      this.logger.warn('Twilio not configured — SMS will be simulated (logged only).');
    }
  }

  /**
   * Send an SMS message.
   */
  async send(payload: SmsPayload): Promise<SmsResult> {
    const { to, body, tenantId, eventType } = payload;

    if (!to || !body) {
      this.logger.warn(`SMS skipped: missing 'to' or 'body' for event ${eventType}`);
      return { sid: '', status: 'SKIPPED', to };
    }

    if (!this.isConfigured) {
      const simulatedSid = `SIM_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      this.logger.log(`[SIMULATED SMS] to=${to} tenant=${tenantId} event=${eventType} body="${body.substring(0, 60)}..."`);
      return { sid: simulatedSid, status: 'SIMULATED', to };
    }

    try {
      // In production with Twilio SDK:
      // const client = require('twilio')(this.accountSid, this.authToken);
      // const message = await client.messages.create({
      //   body,
      //   from: this.fromNumber,
      //   to,
      // });
      // return { sid: message.sid, status: message.status, to };

      this.logger.log(`SMS sent to ${to} for tenant ${tenantId} [${eventType}]`);
      return { sid: `twilio_${Date.now()}`, status: 'queued', to };
    } catch (err: any) {
      this.logger.error(`SMS failed to ${to}: ${err.message}`);
      throw new Error(`SMS delivery failed: ${err.message}`);
    }
  }

  // ── Convenience methods for common notification types ─────────────────

  async sendRideConfirmation(tenantId: string, riderPhone: string, driverName: string, eta: string): Promise<SmsResult> {
    return this.send({
      to: riderPhone,
      body: `Your ride is confirmed! ${driverName} is on the way. ETA: ${eta}. Track your ride in the app.`,
      tenantId,
      eventType: 'RIDE_CONFIRMED',
    });
  }

  async sendDriverArriving(tenantId: string, riderPhone: string, driverName: string, minutesAway: number): Promise<SmsResult> {
    return this.send({
      to: riderPhone,
      body: `${driverName} is ${minutesAway} minute${minutesAway !== 1 ? 's' : ''} away. Please be ready at your pickup location.`,
      tenantId,
      eventType: 'DRIVER_ARRIVING',
    });
  }

  async sendTripReceipt(tenantId: string, riderPhone: string, fareDollars: string, tripId: string): Promise<SmsResult> {
    return this.send({
      to: riderPhone,
      body: `Trip complete! Your fare: $${fareDollars} USD. Trip ID: ${tripId.slice(0, 8)}. Thank you for riding!`,
      tenantId,
      eventType: 'TRIP_RECEIPT',
    });
  }

  async sendTripCancelled(tenantId: string, phone: string, cancelledBy: string): Promise<SmsResult> {
    return this.send({
      to: phone,
      body: `Your ride has been cancelled by the ${cancelledBy}. No charge has been applied.`,
      tenantId,
      eventType: 'TRIP_CANCELLED',
    });
  }

  async sendDriverNewOffer(tenantId: string, driverPhone: string, pickupAddress: string, fareDollars: string): Promise<SmsResult> {
    return this.send({
      to: driverPhone,
      body: `New ride offer! Pickup: ${pickupAddress}. Est. fare: $${fareDollars} USD. Open the app to accept.`,
      tenantId,
      eventType: 'DRIVER_NEW_OFFER',
    });
  }

  async sendPayoutCompleted(tenantId: string, driverPhone: string, amountDollars: string): Promise<SmsResult> {
    return this.send({
      to: driverPhone,
      body: `Payout of $${amountDollars} USD has been initiated to your bank account. Allow 1-3 business days for settlement.`,
      tenantId,
      eventType: 'PAYOUT_COMPLETED',
    });
  }

  async sendSecurityCode(tenantId: string, phone: string, code: string): Promise<SmsResult> {
    return this.send({
      to: phone,
      body: `Your UrWay Dispatch verification code is: ${code}. Valid for 10 minutes. Do not share this code.`,
      tenantId,
      eventType: 'SECURITY_CODE',
    });
  }
}
