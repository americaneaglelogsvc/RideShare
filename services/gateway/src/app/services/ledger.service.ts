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
}
