import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, User, CheckCircle, XCircle, ArrowLeft, Navigation } from 'lucide-react';

interface ScheduledRide {
  id: string;
  riderId: string;
  riderName: string;
  pickup: { address: string; lat: number; lng: number };
  dropoff: { address: string; lat: number; lng: number };
  scheduledAt: string;
  category: string;
  estimatedFare: number;
  netPayout: number;
  estimatedDistance: number;
  status: 'pending' | 'confirmed' | 'declined';
  specialInstructions?: string;
}

const mockScheduledRides: ScheduledRide[] = [
  {
    id: 'sched_001',
    riderId: 'rider_100',
    riderName: 'Michael Chen',
    pickup: { address: '333 N Michigan Ave, Chicago, IL', lat: 41.8875, lng: -87.6246 },
    dropoff: { address: "O'Hare International Airport, Terminal 2", lat: 41.9786, lng: -87.9048 },
    scheduledAt: new Date(Date.now() + 3600000 * 2).toISOString(),
    category: 'black_sedan',
    estimatedFare: 5200,
    netPayout: 4160,
    estimatedDistance: 19.2,
    status: 'pending',
    specialInstructions: 'Flight UA456 at 6:30 PM — please arrive 5 min early',
  },
  {
    id: 'sched_002',
    riderId: 'rider_201',
    riderName: 'Lisa Park',
    pickup: { address: '1 E Wacker Dr, Chicago, IL', lat: 41.8868, lng: -87.6254 },
    dropoff: { address: '550 W Monroe St, Chicago, IL', lat: 41.8803, lng: -87.6413 },
    scheduledAt: new Date(Date.now() + 3600000 * 5).toISOString(),
    category: 'black_suv',
    estimatedFare: 2800,
    netPayout: 2240,
    estimatedDistance: 3.1,
    status: 'confirmed',
  },
  {
    id: 'sched_003',
    riderId: 'rider_302',
    riderName: 'James Wright',
    pickup: { address: 'Midway Airport, Chicago, IL', lat: 41.7868, lng: -87.7522 },
    dropoff: { address: '401 N Wabash Ave, Chicago, IL', lat: 41.8893, lng: -87.6268 },
    scheduledAt: new Date(Date.now() + 3600000 * 24).toISOString(),
    category: 'black_sedan',
    estimatedFare: 3800,
    netPayout: 3040,
    estimatedDistance: 12.5,
    status: 'pending',
    specialInstructions: 'Will have 2 large suitcases',
  },
];

export function ScheduledRidesPage() {
  const [rides, setRides] = useState<ScheduledRide[]>(mockScheduledRides);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

  const filteredRides = rides.filter(r => filter === 'all' || r.status === filter);

  const handleConfirm = (id: string) => {
    setRides(prev => prev.map(r => r.id === id ? { ...r, status: 'confirmed' as const } : r));
  };

  const handleDecline = (id: string) => {
    setRides(prev => prev.map(r => r.id === id ? { ...r, status: 'declined' as const } : r));
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const timeUntil = (iso: string) => {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms < 0) return 'Past due';
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Calendar className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Scheduled Rides</h1>
          </div>
          <span className="text-sm text-gray-500">{filteredRides.length} ride{filteredRides.length !== 1 ? 's' : ''}</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex space-x-2 mb-6">
          {(['all', 'pending', 'confirmed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {filteredRides.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No scheduled rides</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRides.map(ride => (
              <div key={ride.id} className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-gray-900">{formatDateTime(ride.scheduledAt)}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ride.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    ride.status === 'declined' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {ride.status}
                  </span>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{ride.riderName}</span>
                  </div>
                  <span className="text-sm text-blue-600 font-medium">In {timeUntil(ride.scheduledAt)}</span>
                </div>

                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 text-green-600 mt-0.5 mr-2 shrink-0" />
                    <span className="text-gray-600">{ride.pickup.address}</span>
                  </div>
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 text-red-600 mt-0.5 mr-2 shrink-0" />
                    <span className="text-gray-600">{ride.dropoff.address}</span>
                  </div>
                </div>

                {ride.specialInstructions && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                    <p className="text-xs text-yellow-800">{ride.specialInstructions}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-gray-500">{ride.estimatedDistance} mi · {ride.category.replace('_', ' ')}</span>
                  <span className="font-semibold text-green-600">${(ride.netPayout / 100).toFixed(2)} net</span>
                </div>

                {ride.status === 'pending' && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleDecline(ride.id)}
                      className="flex-1 flex items-center justify-center px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium text-sm"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Decline
                    </button>
                    <button
                      onClick={() => handleConfirm(ride.id)}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Confirm
                    </button>
                  </div>
                )}

                {ride.status === 'confirmed' && (
                  <button
                    onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ride.pickup.address)}&travelmode=driving`, '_blank')}
                    className="w-full flex items-center justify-center px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium text-sm"
                  >
                    <Navigation className="w-4 h-4 mr-1" /> Navigate to Pickup
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
