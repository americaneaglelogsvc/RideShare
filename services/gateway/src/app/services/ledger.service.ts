import { Injectable } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class LedgerService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async recordTripFare(event: {
    tripId: string;
    tenantId: string;
    driverId: string | null;
    fareCents: number;
    platformFeeCents: number;
    tenantNetCents: number;
    driverPayoutCents: number;
  }) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.from('ledger_entries').insert({
      event_type: 'TRIP_FARE',
      trip_id: event.tripId,
      tenant_id: event.tenantId,
      driver_id: event.driverId,
      fare_cents: event.fareCents,
      platform_fee_cents: event.platformFeeCents,
      tenant_net_cents: event.tenantNetCents,
      driver_payout_cents: event.driverPayoutCents,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Ledger insert failed: ${error.message || JSON.stringify(error)}`);
    }

    return { success: true };
  }

  /**
   * Phase 7.0: Generic ledger event recorder for trip lifecycle events.
   * Supports: TRIP_ASSIGNED, TRIP_STARTED, TRIP_CANCELLED, and any future event types.
   */
  async recordLedgerEvent(event: {
    eventType: string;
    tripId: string;
    tenantId: string;
    driverId: string | null;
    fareCents: number;
    metadata?: Record<string, any>;
  }) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.from('ledger_entries').insert({
      event_type: event.eventType,
      trip_id: event.tripId,
      tenant_id: event.tenantId,
      driver_id: event.driverId,
      fare_cents: event.fareCents,
      platform_fee_cents: 0,
      tenant_net_cents: 0,
      driver_payout_cents: 0,
      created_at: new Date().toISOString(),
      metadata: event.metadata || null,
    });

    if (error) {
      // Non-blocking: log but don't throw for lifecycle events
      console.error(`Ledger event [${event.eventType}] insert failed: ${error.message || JSON.stringify(error)}`);
    }

    return { success: !error };
  }

  /**
   * Generic double-entry ledger record for bonuses, adjustments, QR attribution, etc.
   * Returns the ledger entry ID for cross-referencing.
   */
  async record(entry: {
    tenant_id: string;
    type: string;
    debit_account: string;
    credit_account: string;
    amount_cents: number;
    reference_id?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.from('ledger_entries').insert({
      event_type: entry.type,
      tenant_id: entry.tenant_id,
      debit_account: entry.debit_account,
      credit_account: entry.credit_account,
      fare_cents: entry.amount_cents,
      platform_fee_cents: 0,
      tenant_net_cents: 0,
      driver_payout_cents: 0,
      trip_id: entry.reference_id || null,
      metadata: { ...entry.metadata, debit: entry.debit_account, credit: entry.credit_account },
      created_at: new Date().toISOString(),
    }).select('id').single();

    if (error) {
      throw new Error(`Ledger record failed: ${error.message}`);
    }

    return data.id;
  }
}
