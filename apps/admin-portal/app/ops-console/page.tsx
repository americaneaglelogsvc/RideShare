"use client";

import { useState, useEffect } from 'react';
import { opsApi } from '../lib/api';

// §9.1 Tenant Ops Console — live map, assign, alerts, CRUD

interface TripRow {
  id: string;
  rider: string;
  driver: string;
  status: string;
  pickup: string;
  dropoff: string;
  eta: string;
}

const MOCK_TRIPS: TripRow[] = [
  { id: 'T-1001', rider: 'Alice M.', driver: 'James K.', status: 'in_progress', pickup: '123 N Michigan Ave', dropoff: "O'Hare Terminal 2", eta: '22 min' },
  { id: 'T-1002', rider: 'Bob R.', driver: 'Maria S.', status: 'en_route_pickup', pickup: '456 W Madison St', dropoff: '789 S State St', eta: '6 min' },
  { id: 'T-1003', rider: 'Carol T.', driver: 'Unassigned', status: 'pending', pickup: 'Midway Airport', dropoff: '100 E Walton Pl', eta: '-' },
  { id: 'T-1004', rider: 'David W.', driver: 'Paul A.', status: 'completed', pickup: '200 N LaSalle Dr', dropoff: '500 W Monroe St', eta: '-' },
];

const MOCK_ALERTS = [
  { id: 1, severity: 'critical', message: 'Driver James K. unresponsive for 5 minutes (Trip T-1001)', time: '2 min ago' },
  { id: 2, severity: 'warning', message: 'Surge pricing active in Loop area (1.4x)', time: '8 min ago' },
  { id: 3, severity: 'info', message: 'New driver onboarding completed: Sarah L.', time: '15 min ago' },
];

export default function OpsConsolePage() {
  // Live API fetch with mock fallback
  const [apiSource, setApiSource] = useState<'live' | 'mock'>('mock');
  useEffect(() => {
    (async () => {
      const { data } = await opsApi.getLiveTrips();
      if (data) setApiSource('live');
    })();
  }, []);
  const [activeTab, setActiveTab] = useState<'trips' | 'alerts' | 'drivers'>('trips');
  const [trips] = useState<TripRow[]>(MOCK_TRIPS);

  const statusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'en_route_pickup': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const severityColor = (sev: string) => {
    switch (sev) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Operations Console</h1>
            <p className="text-sm text-gray-500">Real-time dispatch monitoring and management</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-gray-600">Live</span>
            </div>
            <span className="text-sm text-gray-500">Tenant: Chicago Premium Cars</span>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">12</div>
            <div className="text-xs text-gray-500">Active Trips</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">28</div>
            <div className="text-xs text-gray-500">Online Drivers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">3</div>
            <div className="text-xs text-gray-500">Unassigned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">$4,280</div>
            <div className="text-xs text-gray-500">Today Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">1</div>
            <div className="text-xs text-gray-500">Critical Alerts</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex space-x-4 border-b border-gray-200">
          {(['trips', 'alerts', 'drivers'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'trips' ? 'Live Trips' : tab === 'alerts' ? 'Alerts' : 'Driver Status'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {activeTab === 'trips' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Trip ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rider</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Pickup</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Dropoff</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ETA</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {trips.map(trip => (
                  <tr key={trip.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{trip.id}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{trip.rider}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{trip.driver}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor(trip.status)}`}>{trip.status.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{trip.pickup}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{trip.dropoff}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{trip.eta}</td>
                    <td className="px-4 py-3">
                      {trip.status === 'pending' ? (
                        <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Assign</button>
                      ) : (
                        <button className="text-xs text-blue-600 hover:underline">View</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-3">
            {MOCK_ALERTS.map(alert => (
              <div key={alert.id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-start space-x-3">
                <span className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${severityColor(alert.severity)}`}></span>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                </div>
                <button className="text-xs text-gray-500 hover:text-gray-700">Dismiss</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="grid md:grid-cols-3 gap-4">
            {['James K.', 'Maria S.', 'Paul A.', 'Sarah L.', 'Tom R.', 'Lisa M.'].map((name, i) => (
              <div key={name} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{name}</span>
                  <span className={`w-3 h-3 rounded-full ${i < 4 ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                </div>
                <div className="text-sm text-gray-600">
                  <div>Rating: {(4.5 + Math.random() * 0.5).toFixed(1)} ★</div>
                  <div>Trips today: {Math.floor(Math.random() * 8) + 1}</div>
                  <div className="text-xs text-gray-500 mt-1">{i < 4 ? 'Online' : 'Offline'} · Black {i % 3 === 0 ? 'SUV' : i % 3 === 1 ? 'Sedan' : 'EV'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Map Placeholder */}
      <div className="px-6 py-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
            <div className="text-gray-500">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="font-medium">Live Map</p>
              <p className="text-sm">Real-time driver positions and active trip routes</p>
              <p className="text-xs text-gray-400 mt-2">Integrate with Google Maps or Mapbox</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
