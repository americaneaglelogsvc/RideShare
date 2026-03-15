import { useEffect, useState } from 'react';
import { apiService } from '../services/api.service';
import { RealtimeChannel } from '@supabase/supabase-js';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:9000';

export interface RideOffer {
  id: string;
  trip_id: string;
  rider_name: string;
  rider_phone: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  estimated_fare_cents: number;
  net_payout_cents: number;
  estimated_distance_miles: number;
  estimated_duration_minutes: number;
  pickup_eta_minutes: number;
  category: string;
  special_instructions?: string;
  expires_at: string;
  status: string;
}

export const useRealtime = (driverId: string | null) => {
  const [rideOffers, setRideOffers] = useState<RideOffer[]>([]);
  const [currentOffer, setCurrentOffer] = useState<RideOffer | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!driverId) return;

    const supabase = apiService.getSupabaseClient();

    // Subscribe to ride offers for this driver
    const rideOffersChannel = supabase
      .channel(`driver-offers-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ride_offers',
          filter: `driver_id=eq.${driverId}`
        },
        (payload) => {
          // Structured update — no console.log in production
          
          if (payload.eventType === 'INSERT') {
            const newOffer = payload.new as RideOffer;
            setRideOffers(prev => [...prev, newOffer]);
            
            // Set as current offer if it's pending
            if (newOffer.status === 'pending') {
              setCurrentOffer(newOffer);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOffer = payload.new as RideOffer;
            setRideOffers(prev => 
              prev.map(offer => 
                offer.id === updatedOffer.id ? updatedOffer : offer
              )
            );
            
            // Update current offer if it matches
            if (currentOffer?.id === updatedOffer.id) {
              if (updatedOffer.status === 'pending') {
                setCurrentOffer(updatedOffer);
              } else {
                setCurrentOffer(null);
              }
            }
          }
        }
      )
      .subscribe();

    setChannel(rideOffersChannel);

    // Cleanup function
    return () => {
      if (rideOffersChannel) {
        rideOffersChannel.unsubscribe();
      }
    };
  }, [driverId]);

  const acceptOffer = async (offerId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/driver/offers/${offerId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`,
          'x-tenant-id': localStorage.getItem('tenant_id') || '',
        },
        body: JSON.stringify({
          offerId,
          accepted: true
        })
      });

      if (response.ok) {
        setCurrentOffer(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error accepting offer:', error);
      return false;
    }
  };

  const declineOffer = async (offerId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/driver/offers/${offerId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('driver_token')}`,
          'x-tenant-id': localStorage.getItem('tenant_id') || '',
        },
        body: JSON.stringify({
          offerId,
          accepted: false
        })
      });

      if (response.ok) {
        setCurrentOffer(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error declining offer:', error);
      return false;
    }
  };

  return {
    rideOffers,
    currentOffer,
    acceptOffer,
    declineOffer,
    isConnected: !!channel
  };
};