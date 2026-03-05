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
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-amber-600/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-slate-500 hover:text-amber-400 text-sm transition-colors">← Home</a>
            <div>
              <h1 className="text-xl font-bold text-amber-400">Operations Console</h1>
              <p className="text-xs text-slate-500">Real-time dispatch monitoring · {apiSource === 'live' ? <span className="text-green-400">Live Data</span> : <span className="text-yellow-400">Mock Data</span>}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-xs text-slate-400">GoldRavenia</span>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-[#1e293b] border-b border-slate-700 px-6 py-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">12</div>
            <div className="text-xs text-slate-500">Active Trips</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">28</div>
            <div className="text-xs text-slate-500">Online Drivers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">3</div>
            <div className="text-xs text-slate-500">Unassigned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">$4,280</div>
            <div className="text-xs text-slate-500">Today Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">1</div>
            <div className="text-xs text-slate-500">Critical Alerts</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex space-x-4 border-b border-slate-700">
          {(['trips', 'alerts', 'drivers'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'
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
          <div className="bg-[#1e293b] rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#253347]">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Trip ID</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Rider</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Driver</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Pickup</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Dropoff</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">ETA</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {trips.map(trip => (
                  <tr key={trip.id} className="hover:bg-[#253347] transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-amber-400">{trip.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{trip.rider}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{trip.driver}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColor(trip.status)}`}>{trip.status.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-400">{trip.pickup}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{trip.dropoff}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{trip.eta}</td>
                    <td className="px-4 py-3">
                      {trip.status === 'pending' ? (
                        <button className="text-xs bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-500">Assign</button>
                      ) : (
                        <button className="text-xs text-amber-400 hover:underline">View</button>
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
              <div key={alert.id} className="bg-[#1e293b] rounded-lg border border-slate-700 p-4 flex items-start space-x-3">
                <span className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${severityColor(alert.severity)}`}></span>
                <div className="flex-1">
                  <p className="text-sm text-slate-200">{alert.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{alert.time}</p>
                </div>
                <button className="text-xs text-slate-500 hover:text-amber-400 transition-colors">Dismiss</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="grid md:grid-cols-3 gap-4">
            {['James K.', 'Maria S.', 'Paul A.', 'Sarah L.', 'Tom R.', 'Lisa M.'].map((name, i) => (
              <div key={name} className="bg-[#1e293b] rounded-lg border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{name}</span>
                  <span className={`w-3 h-3 rounded-full ${i < 4 ? 'bg-green-400' : 'bg-slate-600'}`}></span>
                </div>
                <div className="text-sm text-slate-400">
                  <div>Rating: <span className="text-amber-400">{(4.5 + i * 0.1).toFixed(1)}</span> ★</div>
                  <div>Trips today: {i + 3}</div>
                  <div className="text-xs text-slate-500 mt-1">{i < 4 ? 'Online' : 'Offline'} · Black {i % 3 === 0 ? 'SUV' : i % 3 === 1 ? 'Sedan' : 'EV'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Map Placeholder */}
      <div className="px-6 py-4">
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-6 text-center">
          <div className="bg-[#0f172a] rounded-lg h-64 flex items-center justify-center border border-slate-800">
            <div className="text-slate-500">
              <div className="text-4xl mb-3">🗺️</div>
              <p className="font-semibold text-slate-300">Live Map</p>
              <p className="text-sm text-slate-500">Real-time driver positions and active trip routes</p>
              <p className="text-xs text-slate-600 mt-2">Google Maps / Mapbox integration ready</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
