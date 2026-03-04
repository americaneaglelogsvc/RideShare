import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Phone, MessageCircle, Clock, DollarSign, User, ExternalLink, Timer, Star } from 'lucide-react';

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
  const [tripStatus, setTripStatus] = useState('no_trip'); // no_trip, offer_received, en_route_pickup, arrived_pickup, en_route_dropoff, completed
  const [currentTrip, setCurrentTrip] = useState<TripData | null>(null);
  const [offerTimer, setOfferTimer] = useState(0);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [ratingScore, setRatingScore] = useState(0);
  const waitRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const formatWait = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Mock trip data
  useEffect(() => {
    // Simulate receiving a ride offer
    const mockOffer = {
      tripId: 'trip_123456',
      riderId: 'rider_789',
      riderName: 'Sarah Johnson',
      riderPhone: '+1-312-555-0123',
      pickup: {
        address: '123 N Michigan Ave, Chicago, IL',
        lat: 41.8781,
        lng: -87.6298,
      },
      dropoff: {
        address: "O'Hare International Airport, Terminal 1",
        lat: 41.9786,
        lng: -87.9048,
      },
      estimatedFare: 4500, // $45.00
      netPayout: 3600, // $36.00 (80% after commission)
      estimatedDistance: 18.5,
      estimatedDuration: 35,
      pickupEta: 8,
      category: 'black_sedan',
      specialInstructions: 'Flight departure at 3:30 PM - AA123',
    };

    // Simulate offer timer
    if (tripStatus === 'offer_received') {
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
    }
  }, [tripStatus]);

  const handleAcceptOffer = () => {
    setTripStatus('en_route_pickup');
    setOfferTimer(0);
  };

  const handleDeclineOffer = () => {
    setTripStatus('no_trip');
    setCurrentTrip(null);
    setOfferTimer(0);
  };

  const handleArrivedPickup = () => {
    setTripStatus('arrived_pickup');
  };

  const handleStartTrip = () => {
    setTripStatus('en_route_dropoff');
  };

  const handleCompleteTrip = () => {
    setTripStatus('completed');
  };

  const simulateOffer = () => {
    const mockOffer = {
      tripId: 'trip_123456',
      riderId: 'rider_789',
      riderName: 'Sarah Johnson',
      riderPhone: '+1-312-555-0123',
      pickup: {
        address: '123 N Michigan Ave, Chicago, IL',
        lat: 41.8781,
        lng: -87.6298,
      },
      dropoff: {
        address: "O'Hare International Airport, Terminal 1",
        lat: 41.9786,
        lng: -87.9048,
      },
      estimatedFare: 4500,
      netPayout: 3600,
      estimatedDistance: 18.5,
      estimatedDuration: 35,
      pickupEta: 8,
      category: 'black_sedan',
      specialInstructions: 'Flight departure at 3:30 PM - AA123',
    };

    setCurrentTrip(mockOffer);
    setTripStatus('offer_received');
    setOfferTimer(5); // 5 second timer
  };

  const renderContent = () => {
    switch (tripStatus) {
      case 'no_trip':
        return (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Active Trip</h2>
            <p className="text-gray-600 mb-8">You're online and ready to receive ride requests</p>
            <button
              onClick={simulateOffer}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Simulate Ride Offer (Demo)
            </button>
          </div>
        );

      case 'offer_received':
        return (
          <div className="space-y-6">
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
                        ${(currentTrip?.netPayout / 100).toFixed(2)}
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
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                >
                  Decline
                </button>
                <button
                  onClick={handleAcceptOffer}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        );

      case 'en_route_pickup':
        return (
          <div className="space-y-6">
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
                  <span>ETA: 6 minutes</span>
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
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                Start Trip
              </button>
            </div>
          </div>
        );

      case 'en_route_dropoff':
        return (
          <div className="space-y-6">
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
                    ${(currentTrip?.netPayout / 100).toFixed(2)}
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
                  <span>ETA: 22 minutes</span>
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
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Complete Trip
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
                      <span>38 minutes</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Earnings</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Trip Fare:</span>
                      <span>${(currentTrip?.estimatedFare / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Commission (20%):</span>
                      <span>-${((currentTrip?.estimatedFare - currentTrip?.netPayout) / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-green-600">
                      <span>Your Earnings:</span>
                      <span>${(currentTrip?.netPayout / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setTripStatus('no_trip');
                    setCurrentTrip(null);
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
                Trip ID: {currentTrip?.tripId}
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