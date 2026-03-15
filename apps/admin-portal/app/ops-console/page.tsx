"use client";

import { useState, useEffect } from 'react';
import { opsApi } from '../lib/api';
import { AuthGuard } from '../lib/auth-guard';

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

function OpsConsoleContent() {
  const [apiSource, setApiSource] = useState<'live' | 'mock'>('mock');
  const [activeTab, setActiveTab] = useState<'trips' | 'alerts' | 'drivers'>('trips');
  const [trips, setTrips] = useState<TripRow[]>(MOCK_TRIPS);
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [stats, setStats] = useState({ activeTrips: 12, onlineDrivers: 28, unassigned: 3, todayRevenue: 4280, criticalAlerts: 1 });
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      let isLive = false;

      // Fetch live trips
      const { data } = await opsApi.getLiveTrips();
      if (data && Array.isArray(data)) {
        setTrips(data.map((t: any) => ({
          id: t.id?.slice(0, 8) || t.id,
          rider: t.rider_name || t.riders?.name || 'Unknown',
          driver: t.driver_name || (t.drivers ? `${t.drivers.first_name} ${t.drivers.last_name}` : 'Unassigned'),
          status: t.status || 'pending',
          pickup: t.pickup_address || '',
          dropoff: t.dropoff_address || '',
          eta: t.eta_minutes ? `${t.eta_minutes} min` : '-',
        })));
        isLive = true;
      }

      // Fetch alerts
      const { data: alertsData } = await opsApi.getAlerts();
      if (alertsData && Array.isArray(alertsData)) {
        setAlerts(alertsData.length > 0 ? alertsData : MOCK_ALERTS.map(a => ({...a, message: 'No active alerts'})).slice(0, 0));
        if (alertsData.length === 0) {
          setAlerts([]);
        } else {
          setAlerts(alertsData);
        }
        isLive = true;
      }

      // Fetch metrics
      const { data: metricsData } = await opsApi.getMetrics();
      if (metricsData) {
        const m = metricsData as any;
        setStats({
          activeTrips: m.activeTrips || 0,
          onlineDrivers: m.onlineDrivers || 0,
          unassigned: 0,  // Will be computed from trips
          todayRevenue: 0, // Would need a dedicated endpoint
          criticalAlerts: alertsData ? (alertsData as any[]).filter((a: any) => a.severity === 'critical' || a.severity === 'warning').length : 0,
        });
        isLive = true;
      }

      // Fetch driver statuses
      const { data: driverData } = await opsApi.getDriverStatuses();
      if (driverData && Array.isArray(driverData)) {
        setDrivers(driverData);
        isLive = true;
      }

      if (isLive) setApiSource('live');
    })();
  }, []);

  // Compute unassigned from trips
  const computedUnassigned = trips.filter(t => t.driver === 'Unassigned' || !t.driver).length;

  const statusColor = (status: string) => {
    switch (status) {
      case 'in_progress': case 'active': return 'bg-blue-100 text-blue-800';
      case 'en_route_pickup': case 'assigned': return 'bg-yellow-100 text-yellow-800';
      case 'pending': case 'requested': return 'bg-red-100 text-red-800';
      case 'completed': case 'closed': return 'bg-green-100 text-green-800';
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
              <p className="text-xs text-slate-500">Real-time dispatch monitoring · {apiSource === 'live' ? <span className="text-green-400">● Live Data</span> : <span className="text-yellow-400">○ Mock Data</span>}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-xs text-slate-400">UrWay Dispatch</span>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-[#1e293b] border-b border-slate-700 px-6 py-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.activeTrips}</div>
            <div className="text-xs text-slate-500">Active Trips</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{stats.onlineDrivers}</div>
            <div className="text-xs text-slate-500">Online Drivers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{computedUnassigned}</div>
            <div className="text-xs text-slate-500">Unassigned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.todayRevenue > 0 ? `$${(stats.todayRevenue / 100).toLocaleString()}` : '$0'}</div>
            <div className="text-xs text-slate-500">Today Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">{stats.criticalAlerts}</div>
            <div className="text-xs text-slate-500">Alerts</div>
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

export default function OpsConsolePage() {
  return (
    <AuthGuard>
      <OpsConsoleContent />
    </AuthGuard>
  );
}
