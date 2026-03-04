import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, DollarSign, Star, Download, MessageCircle } from 'lucide-react';

interface Trip {
  id: string;
  date: string;
  pickup: string;
  dropoff: string;
  fare: number;
  driverName: string;
  driverRating: number;
  myRating: number | null;
  status: 'completed' | 'cancelled';
  distance: number;
  duration: number;
  category: string;
}

const mockTrips: Trip[] = [
  { id: 'trip_901', date: '2026-03-02T18:30:00Z', pickup: '333 N Michigan Ave', dropoff: "O'Hare Airport T1", fare: 5200, driverName: 'Marcus J.', driverRating: 4.9, myRating: 5, status: 'completed', distance: 19.2, duration: 38, category: 'black_sedan' },
  { id: 'trip_902', date: '2026-03-01T09:15:00Z', pickup: '1 E Wacker Dr', dropoff: '550 W Monroe St', fare: 1800, driverName: 'Sandra L.', driverRating: 4.8, myRating: null, status: 'completed', distance: 2.1, duration: 12, category: 'black_ev' },
  { id: 'trip_903', date: '2026-02-28T14:00:00Z', pickup: '401 N Wabash Ave', dropoff: 'Midway Airport', fare: 3600, driverName: 'David K.', driverRating: 4.7, myRating: 4, status: 'completed', distance: 14.8, duration: 32, category: 'black_suv' },
  { id: 'trip_904', date: '2026-02-27T20:45:00Z', pickup: '875 N Michigan Ave', dropoff: '233 S Wacker Dr', fare: 0, driverName: 'N/A', driverRating: 0, myRating: null, status: 'cancelled', distance: 0, duration: 0, category: 'black_sedan' },
];

export function RideHistoryPage() {
  const [trips] = useState<Trip[]>(mockTrips);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  const filtered = trips.filter(t => filter === 'all' || t.status === filter);

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center">
          <Link to="/" className="text-gray-600 hover:text-gray-900 mr-4"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-xl font-bold text-gray-900">Ride History</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-6">
        <div className="flex space-x-2 mb-6">
          {(['all', 'completed', 'cancelled'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No rides found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(trip => (
              <div key={trip.id} className="bg-white rounded-lg shadow-md p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">{fmt(trip.date)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${trip.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {trip.status}
                  </span>
                </div>

                <div className="space-y-1 text-sm mb-3">
                  <div className="flex items-start"><MapPin className="w-4 h-4 text-green-600 mr-2 mt-0.5 shrink-0" /><span className="text-gray-700">{trip.pickup}</span></div>
                  <div className="flex items-start"><MapPin className="w-4 h-4 text-red-600 mr-2 mt-0.5 shrink-0" /><span className="text-gray-700">{trip.dropoff}</span></div>
                </div>

                {trip.status === 'completed' && (
                  <>
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-gray-500">{trip.distance} mi · {trip.duration} min · {trip.category.replace('_', ' ')}</span>
                      <span className="font-semibold text-gray-900"><DollarSign className="w-4 h-4 inline" />${(trip.fare / 100).toFixed(2)}</span>
                    </div>

                    <div className="flex items-center justify-between border-t pt-3">
                      <div className="flex items-center text-sm">
                        <span className="text-gray-600 mr-2">{trip.driverName}</span>
                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                        <span className="text-gray-700">{trip.driverRating}</span>
                      </div>
                      <div className="flex space-x-2">
                        {!trip.myRating && (
                          <Link to={`/rate/${trip.id}`} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Rate Trip</Link>
                        )}
                        <button aria-label="Download receipt" className="text-xs text-gray-500 hover:text-gray-700">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
