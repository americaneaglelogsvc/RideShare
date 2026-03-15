import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Navigation, Phone, MessageCircle, Clock, DollarSign, User, ExternalLink, Timer, Star } from 'lucide-react';
import { apiService, RideOffer } from '../services/api.service';

function openGoogleMapsNav(lat: number, lng: number, address?: string) {
  const dest = address ? encodeURIComponent(address) : `${lat},${lng}`;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  window.open(url, '_blank');
}

function maskPii(value: string | undefined, isActive: boolean): string {
  if (!value) return '';
  if (!isActive) return value;
  if (value.includes('@')) {
    const [local, domain] = value.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  }
  if (/^\+?\d/.test(value.replace(/[\s()-]/g, ''))) {
    return value.slice(0, 6) + '••••' + value.slice(-2);
  }
  const parts = value.trim().split(/\s+/);
  if (parts.length > 1) {
    return parts[0] + ' ' + parts.slice(1).map(p => p[0] + '***').join(' ');
  }
  return value;
}

interface TripData {
  tripId: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string; lat: number; lng: number };
  estimatedFare: number;
  netPayout: number;
  estimatedDistance: number;
  estimatedDuration: number;
  pickupEta: number;
  category: string;
  specialInstructions?: string;
}

export function TripPage() {
  const [tripStatus, setTripStatus] = useState('no_trip');
  const [currentTrip, setCurrentTrip] = useState<TripData | null>(null);
  const [offerTimer, setOfferTimer] = useState(0);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [ratingScore, setRatingScore] = useState(0);
  const [driverProfileId, setDriverProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const waitRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  // Load driver profile on mount
  useEffect(() => {
    (async () => {
      try {
        const profile = await apiService.getProfile();
        setDriverProfileId(profile.id);
      } catch (e: any) {
        console.warn('Could not load driver profile:', e.message);
      }
    })();
  }, []);

  // SSE: Listen for real-time ride offers
  useEffect(() => {
    const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:9000';
    const tenantId = apiService.getTenantId();
    if (!driverProfileId || !tenantId) return;

    const url = `${API_BASE}/dispatch-sse/offers?driverId=${driverProfileId}&tenantId=${tenantId}`;

    try {
      const sse = new EventSource(url);
      sseRef.current = sse;

      sse.addEventListener('ride-offer', (event) => {
        try {
          const offer: RideOffer = JSON.parse(event.data);
          const trip: TripData = {
            tripId: offer.tripId,
            riderId: offer.riderId,
            riderName: offer.riderName,
            riderPhone: offer.riderPhone || '',
            pickup: offer.pickup,
            dropoff: offer.dropoff,
            estimatedFare: offer.estimatedFare,
            netPayout: offer.netPayout,
            estimatedDistance: offer.estimatedDistance,
            estimatedDuration: offer.estimatedDuration,
            pickupEta: offer.pickupEta,
            category: offer.category,
            specialInstructions: offer.specialInstructions,
          };
          setCurrentTrip(trip);
          setTripStatus('offer_received');
          // Calculate time until expiry
          const expiresMs = new Date(offer.expiresAt).getTime() - Date.now();
          setOfferTimer(Math.max(0, Math.ceil(expiresMs / 1000)));
        } catch (err) {
          console.error('Failed to parse ride offer:', err);
        }
      });

      sse.onerror = () => {
        console.warn('SSE connection lost, will reconnect...');
      };

      return () => {
        sse.close();
        sseRef.current = null;
      };
    } catch {
      console.warn('SSE not available, polling mode');
    }
  }, [driverProfileId]);

  // Wait timer for arrived_pickup
  useEffect(() => {
    if (tripStatus === 'arrived_pickup') {
      setWaitSeconds(0);
      waitRef.current = setInterval(() => setWaitSeconds(s => s + 1), 1000);
    } else if (waitRef.current) {
      clearInterval(waitRef.current);
      waitRef.current = null;
    }
    return () => { if (waitRef.current) clearInterval(waitRef.current); };
  }, [tripStatus]);

  // Offer countdown
  useEffect(() => {
    if (tripStatus !== 'offer_received' || offerTimer <= 0) return;
    const timer = setInterval(() => {
      setOfferTimer((prev) => {
        if (prev <= 1) {
          setTripStatus('no_trip');
          setCurrentTrip(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [tripStatus, offerTimer]);

  const formatWait = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Real API Actions ──

  const handleAcceptOffer = useCallback(async () => {
    if (!currentTrip || !driverProfileId) return;
    setActionLoading(true);
    setError(null);
    try {
      const result = await apiService.acceptTrip(currentTrip.tripId, driverProfileId);
      if (result.success) {
        setTripStatus('en_route_pickup');
        setOfferTimer(0);
      } else {
        setError(result.message || 'Failed to accept trip');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  }, [currentTrip, driverProfileId]);

  const handleDeclineOffer = useCallback(() => {
    setTripStatus('no_trip');
    setCurrentTrip(null);
    setOfferTimer(0);
    setError(null);
  }, []);

  const handleArrivedPickup = useCallback(() => {
    setTripStatus('arrived_pickup');
  }, []);

  const handleStartTrip = useCallback(async () => {
    if (!currentTrip) return;
    setActionLoading(true);
    setError(null);
    try {
      const result = await apiService.startTrip(currentTrip.tripId);
      if (result.success) {
        setTripStatus('en_route_dropoff');
      } else {
        setError(result.message || 'Failed to start trip');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  }, [currentTrip]);

  const handleCompleteTrip = useCallback(async () => {
    if (!currentTrip) return;
    setActionLoading(true);
    setError(null);
    try {
      const result = await apiService.completeTrip(currentTrip.tripId);
      if (result.success) {
        setTripStatus('completed');
      } else {
        setError(result.message || 'Failed to complete trip');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  }, [currentTrip]);

  const renderError = () => error && (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-sm text-red-700">{error}</p>
      <button onClick={() => setError(null)} className="text-xs text-red-500 underline mt-1">Dismiss</button>
    </div>
  );

  const renderContent = () => {
    switch (tripStatus) {
      case 'no_trip':
        return (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Active Trip</h2>
            <p className="text-gray-600 mb-2">You're online and ready to receive ride requests</p>
            <p className="text-sm text-gray-400">
              {driverProfileId
                ? 'Listening for ride offers via live stream...'
                : 'Loading driver profile...'
              }
            </p>
            {!driverProfileId && (
              <div className="mt-4">
                <div className="animate-pulse flex justify-center">
                  <div className="h-2 w-24 bg-gray-200 rounded"></div>
                </div>
              </div>
            )}
          </div>
        );

      case 'offer_received':
        return (
          <div className="space-y-6">
            {renderError()}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-blue-900">New Ride Request</h2>
                <div className="text-2xl font-bold text-blue-600">
                  {offerTimer}s
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Trip Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-green-600 mt-0.5 mr-2" />
                      <div>
                        <p className="font-medium">Pickup</p>
                        <p className="text-gray-600">{currentTrip?.pickup.address}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-red-600 mt-0.5 mr-2" />
                      <div>
                        <p className="font-medium">Dropoff</p>
                        <p className="text-gray-600">{currentTrip?.dropoff.address}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Earnings & Time</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Net Payout:</span>
                      <span className="font-semibold text-green-600">
                        ${((currentTrip?.netPayout || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Distance:</span>
                      <span>{currentTrip?.estimatedDistance} miles</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{currentTrip?.estimatedDuration} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pickup ETA:</span>
                      <span>{currentTrip?.pickupEta} min</span>
                    </div>
                  </div>
                </div>
              </div>

              {currentTrip?.specialInstructions && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Special Instructions:</strong> {currentTrip.specialInstructions}
                  </p>
                </div>
              )}

              <div className="flex space-x-4 mt-6">
                <button
                  onClick={handleDeclineOffer}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  onClick={handleAcceptOffer}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                >
                  {actionLoading ? 'Accepting...' : 'Accept'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'en_route_pickup':
        return (
          <div className="space-y-6">
            {renderError()}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">En Route to Pickup</h2>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <User className="w-8 h-8 text-gray-600 mr-3" />
                  <div>
                    <p className="font-medium">{maskPii(currentTrip?.riderName, true)}</p>
                    <p className="text-sm text-gray-600">{maskPii(currentTrip?.riderPhone, true)}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button aria-label="Call rider" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button aria-label="Message rider" className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center mb-2">
                  <MapPin className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium">Pickup Location</span>
                </div>
                <p className="text-gray-700">{currentTrip?.pickup.address}</p>
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>ETA: {currentTrip?.pickupEta || 6} minutes</span>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => currentTrip && openGoogleMapsNav(currentTrip.pickup.lat, currentTrip.pickup.lng, currentTrip.pickup.address)}
                  className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-semibold flex items-center justify-center"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Navigate
                </button>
                <button
                  onClick={handleArrivedPickup}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  I've Arrived at Pickup
                </button>
              </div>
            </div>
          </div>
        );

      case 'arrived_pickup':
        return (
          <div className="space-y-6">
            {renderError()}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Arrived at Pickup</h2>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 font-medium">You've arrived at the pickup location</p>
                <p className="text-green-700 text-sm mt-1">Wait for the passenger to get in the vehicle</p>
                <div className="flex items-center mt-2">
                  <Timer className={`w-5 h-5 mr-2 ${waitSeconds >= 300 ? 'text-red-600' : 'text-green-600'}`} />
                  <span className={`text-lg font-bold ${waitSeconds >= 300 ? 'text-red-600' : 'text-green-900'}`}>{formatWait(waitSeconds)}</span>
                  {waitSeconds >= 300 && <span className="ml-2 text-xs text-red-600 font-medium">No-show eligible</span>}
                </div>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <User className="w-8 h-8 text-gray-600 mr-3" />
                  <div>
                    <p className="font-medium">{maskPii(currentTrip?.riderName, true)}</p>
                    <p className="text-sm text-gray-600">{maskPii(currentTrip?.riderPhone, true)}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button aria-label="Call rider" className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Phone className="w-5 h-5" />
                  </button>
                  <button aria-label="Message rider" className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <MessageCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center mb-2">
                  <MapPin className="w-5 h-5 text-red-600 mr-2" />
                  <span className="font-medium">Destination</span>
                </div>
                <p className="text-gray-700">{currentTrip?.dropoff.address}</p>
              </div>

              <button
                onClick={handleStartTrip}
                disabled={actionLoading}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
              >
                {actionLoading ? 'Starting Trip...' : 'Start Trip'}
              </button>
            </div>
          </div>
        );

      case 'en_route_dropoff':
        return (
          <div className="space-y-6">
            {renderError()}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">En Route to Destination</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 font-medium">Trip in progress</p>
                <p className="text-blue-700 text-sm mt-1">Following GPS to destination</p>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <User className="w-8 h-8 text-gray-600 mr-3" />
                  <div>
                    <p className="font-medium">{maskPii(currentTrip?.riderName, true)}</p>
                    <p className="text-sm text-gray-600">In vehicle</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    ${((currentTrip?.netPayout || 0) / 100).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Net payout</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center mb-2">
                  <MapPin className="w-5 h-5 text-red-600 mr-2" />
                  <span className="font-medium">Destination</span>
                </div>
                <p className="text-gray-700">{currentTrip?.dropoff.address}</p>
                <div className="flex items-center mt-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>ETA: {currentTrip?.estimatedDuration || 22} minutes</span>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => currentTrip && openGoogleMapsNav(currentTrip.dropoff.lat, currentTrip.dropoff.lng, currentTrip.dropoff.address)}
                  className="flex-1 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-semibold flex items-center justify-center"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Navigate
                </button>
                <button
                  onClick={handleCompleteTrip}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50"
                >
                  {actionLoading ? 'Completing...' : 'Complete Trip'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'completed':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Trip Completed</h2>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-800 font-medium">Trip completed successfully!</p>
                <p className="text-green-700 text-sm mt-1">Thank you for providing excellent service</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Trip Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Passenger:</span>
                      <span>{currentTrip?.riderName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Distance:</span>
                      <span>{currentTrip?.estimatedDistance} miles</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{currentTrip?.estimatedDuration} minutes</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Earnings</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Trip Fare:</span>
                      <span>${((currentTrip?.estimatedFare || 0) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Commission (20%):</span>
                      <span>-${(((currentTrip?.estimatedFare || 0) - (currentTrip?.netPayout || 0)) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-green-600">
                      <span>Your Earnings:</span>
                      <span>${((currentTrip?.netPayout || 0) / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setTripStatus('no_trip');
                    setCurrentTrip(null);
                    setError(null);
                  }}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Continue Driving
                </button>
                <button className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold">
                  View Receipt
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Navigation className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Current Trip</h1>
          </div>
          <div className="flex items-center space-x-4">
            {tripStatus !== 'no_trip' && (
              <div className="text-sm text-gray-600">
                Trip ID: {currentTrip?.tripId?.slice(0, 8)}...
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {renderContent()}
      </div>
    </div>
  );
}