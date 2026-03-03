import { Injectable, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable()
export class RealtimeService implements OnModuleInit {
  private channels: Map<string, RealtimeChannel> = new Map();

  constructor(private readonly supabaseService: SupabaseService) {}

  onModuleInit() {
    try {
      this.setupRealtimeChannels();
    } catch (e: any) {
      console.warn('RealtimeService disabled (Supabase not configured):', e?.message || e);
    }
  }

  private setupRealtimeChannels() {
    const supabase = this.supabaseService.getClient();

    if (!supabase) {
      console.warn('Supabase client is not available, skipping realtime channel setup');
      return;
    }

    // Driver location updates channel
    const locationChannel = supabase
      .channel('driver-locations')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'driver_locations' },
        (payload) => {
          console.log('Driver location updated:', payload);
          // Broadcast to relevant clients
          this.broadcastLocationUpdate(payload);
        }
      )
      .subscribe();

    this.channels.set('driver-locations', locationChannel);

    // Ride offers channel
    const offersChannel = supabase
      .channel('ride-offers')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ride_offers' },
        (payload) => {
          console.log('Ride offer updated:', payload);
          this.broadcastRideOfferUpdate(payload);
        }
      )
      .subscribe();

    this.channels.set('ride-offers', offersChannel);

    // Trip status updates channel
    const tripsChannel = supabase
      .channel('trips')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        (payload) => {
          console.log('Trip updated:', payload);
          this.broadcastTripUpdate(payload);
        }
      )
      .subscribe();

    this.channels.set('trips', tripsChannel);
  }

  private broadcastLocationUpdate(payload: any) {
    // In a production app, you'd broadcast to WebSocket clients
    // For now, we'll log the update
    console.log('Broadcasting location update to clients:', payload);
  }

  private broadcastRideOfferUpdate(payload: any) {
    console.log('Broadcasting ride offer update to clients:', payload);
  }

  private broadcastTripUpdate(payload: any) {
    console.log('Broadcasting trip update to clients:', payload);
  }

  async emitTripStateChanged(event: {
    tripId: string;
    status: string;
    driverId?: string;
    tenantId?: string;
  }) {
    const supabase = this.supabaseService.getClient();

    if (!supabase) {
      console.log('Trip state changed (no realtime client):', event);
      return;
    }

    try {
      // G11: Tenant-scoped channel name prevents cross-tenant event leakage
      const tenantPrefix = event.tenantId ? `t-${event.tenantId}-` : '';
      const channelName = `${tenantPrefix}trip-${event.tripId}`;
      let channel = this.channels.get(channelName);

      if (!channel) {
        channel = supabase.channel(channelName).subscribe();
        this.channels.set(channelName, channel);
      }

      await channel.send({
        type: 'broadcast',
        event: 'trip_state_changed',
        payload: event,
      });
    } catch (e: any) {
      console.warn('Failed to emit trip_state_changed event:', e?.message || e);
    }
  }

  async subscribeToDriverUpdates(tenantId: string, driverId: string, callback: (data: any) => void) {
    const supabase = this.supabaseService.getClient();
    
    // G11: Tenant-scoped channel name
    const channel = supabase
      .channel(`t-${tenantId}-driver-${driverId}`)
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'ride_offers',
          filter: `driver_id=eq.${driverId}`
        },
        callback
      )
      .subscribe();

    return channel;
  }

  async unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      await channel.unsubscribe();
      this.channels.delete(channelName);
    }
  }
}