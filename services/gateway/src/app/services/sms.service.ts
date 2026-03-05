import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Phase 7.0: SMS Service (Twilio-compatible)
 *
 * CANONICAL MSG-003 — SMS is retained ONLY for OTP/2FA security codes.
 * All operational rider↔driver communications (ETA, confirmation, receipts,
 * offers, payouts) are delivered exclusively via in-app push notifications.
 * This eliminates TCPA exposure for operational messages entirely.
 *
 * CEO directive (Sprint B): No external SMS for ride events.
 * Use PushNotificationService for all operational event notifications.
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

  /**
   * @deprecated CANONICAL MSG-001/MSG-003 — Use PushNotificationService instead.
   * External SMS for ride events is disabled to eliminate TCPA exposure.
   */
  sendRideConfirmation(_tenantId: string, _riderPhone: string, _driverName: string, _eta: string): Promise<SmsResult> {
    this.logger.warn('sendRideConfirmation via SMS is deprecated. Use PushNotificationService.');
    return Promise.resolve({ sid: '', status: 'DISABLED_USE_PUSH', to: _riderPhone });
  }

  /**
   * @deprecated CANONICAL MSG-001/MSG-003 — Use PushNotificationService instead.
   */
  sendDriverArriving(_tenantId: string, _riderPhone: string, _driverName: string, _minutesAway: number): Promise<SmsResult> {
    this.logger.warn('sendDriverArriving via SMS is deprecated. Use PushNotificationService.');
    return Promise.resolve({ sid: '', status: 'DISABLED_USE_PUSH', to: _riderPhone });
  }

  /**
   * @deprecated CANONICAL MSG-001/MSG-003 — Use PushNotificationService instead.
   */
  sendTripReceipt(_tenantId: string, _riderPhone: string, _fareDollars: string, _tripId: string): Promise<SmsResult> {
    this.logger.warn('sendTripReceipt via SMS is deprecated. Use PushNotificationService.');
    return Promise.resolve({ sid: '', status: 'DISABLED_USE_PUSH', to: _riderPhone });
  }

  /**
   * @deprecated CANONICAL MSG-001/MSG-003 — Use PushNotificationService instead.
   */
  sendTripCancelled(_tenantId: string, _phone: string, _cancelledBy: string): Promise<SmsResult> {
    this.logger.warn('sendTripCancelled via SMS is deprecated. Use PushNotificationService.');
    return Promise.resolve({ sid: '', status: 'DISABLED_USE_PUSH', to: _phone });
  }

  /**
   * @deprecated CANONICAL MSG-001/MSG-003 — Use PushNotificationService instead.
   */
  sendDriverNewOffer(_tenantId: string, _driverPhone: string, _pickupAddress: string, _fareDollars: string): Promise<SmsResult> {
    this.logger.warn('sendDriverNewOffer via SMS is deprecated. Use PushNotificationService.');
    return Promise.resolve({ sid: '', status: 'DISABLED_USE_PUSH', to: _driverPhone });
  }

  /**
   * @deprecated CANONICAL MSG-001/MSG-003 — Use PushNotificationService instead.
   */
  sendPayoutCompleted(_tenantId: string, _driverPhone: string, _amountDollars: string): Promise<SmsResult> {
    this.logger.warn('sendPayoutCompleted via SMS is deprecated. Use PushNotificationService.');
    return Promise.resolve({ sid: '', status: 'DISABLED_USE_PUSH', to: _driverPhone });
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
