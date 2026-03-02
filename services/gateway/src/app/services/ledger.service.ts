import { Injectable } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Injectable()
export class LedgerService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async recordTripFare(event: {
    tripId: string;
    driverId: string | null;
    fareCents: number;
  }) {
    const supabase = this.supabaseService.getClient();

    const { error } = await supabase.from('ledger_entries').insert({
      event_type: 'trip_completed',
      trip_id: event.tripId,
      driver_id: event.driverId,
      fare_cents: event.fareCents,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Ledger insert failed: ${error.message || JSON.stringify(error)}`);
    }

    return { success: true };
  }
}
