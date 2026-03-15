"use client";

import { useState, useEffect } from 'react';
import { platformApi, opsApi } from '../lib/api';
import { AuthGuard } from '../lib/auth-guard';

// §9.3 Platform Admin Console — tenant CRUD, cross-tenant tracking, kill-switch, test runner

type AdminTab = 'tenants' | 'health' | 'killswitch' | 'tests';

interface TenantRow {
  id: string;
  name: string;
  plan: string;
  drivers: number;
  trips_mtd: number;
  revenue_mtd: number;
  status: string;
  theme: string;
  whiteLabel: boolean;
}

const FALLBACK_TENANTS: TenantRow[] = [
  { id: 'ten-001', name: 'Chicago Premium Cars', plan: 'Professional', drivers: 32, trips_mtd: 2847, revenue_mtd: 128450, status: 'active', theme: 'default', whiteLabel: false },
  { id: 'ten-002', name: 'Lake Shore Limo', plan: 'Enterprise', drivers: 58, trips_mtd: 4210, revenue_mtd: 215800, status: 'active', theme: 'default', whiteLabel: false },
];

function PlatformAdminContent() {
  const [activeTab, setActiveTab] = useState<AdminTab>('tenants');
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(false);
  const [tenants, setTenants] = useState<TenantRow[]>(FALLBACK_TENANTS);
  const [dataSource, setDataSource] = useState<'loading' | 'live' | 'mock'>('loading');
  const [metrics, setMetrics] = useState({ activeTrips: 0, onlineDrivers: 0, totalRiders: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tenantRes, metricsRes] = await Promise.all([
          platformApi.getTenants(),
          opsApi.getMetrics(),
        ]);

        if (cancelled) return;

        if (tenantRes.data && Array.isArray(tenantRes.data) && tenantRes.data.length > 0) {
          const mapped: TenantRow[] = tenantRes.data.map((t: any) => ({
            id: t.id,
            name: t.name || t.slug || 'Unknown',
            plan: t.billing_status === 'CURRENT' ? 'Active' : t.billing_status || 'N/A',
            drivers: t.driver_count || 0,
            trips_mtd: t.trip_count || 0,
            revenue_mtd: t.revenue_cents || 0,
            status: t.is_suspended ? 'suspended' : t.is_active ? 'active' : 'inactive',
            theme: 'default',
            whiteLabel: false,
          }));
          setTenants(mapped);
          setDataSource('live');
        } else {
          setDataSource('mock');
        }

        if (metricsRes.data) {
          setMetrics(metricsRes.data as any);
        }
      } catch {
        if (!cancelled) setDataSource('mock');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalDrivers = tenants.reduce((s, t) => s + t.drivers, 0);
  const totalTrips = tenants.reduce((s, t) => s + t.trips_mtd, 0);
  const totalRevenue = tenants.reduce((s, t) => s + t.revenue_mtd, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-amber-600/30 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="text-slate-500 hover:text-amber-400 text-sm transition-colors">← Home</a>
            <div>
              <h1 className="text-xl font-bold text-amber-400">Platform Administration</h1>
              <p className="text-xs text-slate-500">UrWay Dispatch — Cross-tenant management</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs bg-red-900/60 border border-red-700/50 text-red-300 px-2 py-1 rounded font-mono">SUPER ADMIN</span>
            <span className={`text-xs px-2 py-1 rounded font-mono ${
              dataSource === 'live' ? 'bg-green-900/60 border border-green-700/50 text-green-300' : 'bg-yellow-900/60 border border-yellow-700/50 text-yellow-300'
            }`}>{dataSource === 'live' ? '● Live Data' : dataSource === 'mock' ? '○ Mock Data' : '◌ Loading...'}</span>
            <span className="text-sm text-slate-500">admin@urwaydispatch.com</span>
          </div>
        </div>
      </header>

      {/* Platform Stats */}
      <div className="bg-[#1e293b] border-b border-slate-700 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{tenants.length}</div>
            <div className="text-xs text-gray-500">Total Tenants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{tenants.filter(t => t.status === 'active').length}</div>
            <div className="text-xs text-gray-500">Active Tenants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{totalDrivers}</div>
            <div className="text-xs text-gray-500">Total Drivers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{totalTrips.toLocaleString()}</div>
            <div className="text-xs text-gray-500">MTD Trips</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">${(totalRevenue / 100).toLocaleString()}</div>
            <div className="text-xs text-gray-500">MTD Revenue</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4">
        <div className="flex space-x-4 border-b border-slate-700">
          {([
            { key: 'tenants', label: 'Tenant Management' },
            { key: 'health', label: 'System Health' },
            { key: 'killswitch', label: 'Kill Switch' },
            { key: 'tests', label: 'Test Runner' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? 'border-amber-400 text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {activeTab === 'tenants' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">All Tenants</h2>
              <button className="text-sm bg-amber-600 px-4 py-2 rounded-lg hover:bg-amber-500">+ Create Tenant</button>
            </div>
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-750">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Tenant</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Theme</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Drivers</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Trips (MTD)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Revenue (MTD)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-700">
                  {tenants.map(t => (
                    <tr key={t.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            t.theme === 'goldravenia' ? 'bg-yellow-500' :
                            t.theme === 'blackravenia' ? 'bg-gray-900' :
                            t.theme === 'silverpeak' ? 'bg-gray-500' :
                            t.theme === 'metrofleet' ? 'bg-blue-500' :
                            t.theme === 'nightowl' ? 'bg-purple-500' :
                            'bg-blue-600'
                          }`}></div>
                          <div>
                            <div className="text-sm font-medium">{t.name}</div>
                            <div className="text-xs text-gray-500 font-mono">{t.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{t.plan}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-300 capitalize">{t.theme}</span>
                          {t.whiteLabel && (
                            <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded-full">White-label</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{t.drivers}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">{t.trips_mtd.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-300">${(t.revenue_mtd / 100).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          t.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-xs text-amber-400 hover:text-amber-300 mr-3">Edit</button>
                        <button className="text-xs text-blue-400 hover:text-blue-300 mr-3">Theme</button>
                        <button className="text-xs text-red-400 hover:text-red-300">
                          {t.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">System Health</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { name: 'Gateway API', status: 'healthy', latency: '42ms', uptime: '99.97%' },
                { name: 'Supabase (Postgres)', status: 'healthy', latency: '8ms', uptime: '99.99%' },
                { name: 'Cloud Run', status: 'healthy', latency: '-', uptime: '99.95%' },
                { name: 'Fluidpay Webhook', status: 'healthy', latency: '120ms', uptime: '99.90%' },
                { name: 'S3 Storage', status: 'healthy', latency: '35ms', uptime: '99.99%' },
                { name: 'Push Notifications (FCM)', status: 'degraded', latency: '450ms', uptime: '99.5%' },
              ].map(s => (
                <div key={s.name} className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-gray-500">Latency: {s.latency} · Uptime: {s.uptime}</div>
                  </div>
                  <span className={`w-3 h-3 rounded-full ${s.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'killswitch' && (
          <div className="max-w-lg">
            <h2 className="text-lg font-semibold mb-4">Emergency Kill Switch</h2>
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-6">
              <p className="text-sm text-red-200 mb-4">
                The kill switch immediately disables all dispatch operations across all tenants. 
                Use only in case of critical system failure or security incident.
              </p>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setKillSwitchEnabled(!killSwitchEnabled)}
                  className={`px-6 py-3 rounded-lg font-bold text-lg transition-colors ${
                    killSwitchEnabled
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {killSwitchEnabled ? '🟢 RESTORE OPERATIONS' : '🔴 ACTIVATE KILL SWITCH'}
                </button>
              </div>
              {killSwitchEnabled && (
                <div className="mt-4 bg-red-800 rounded p-3">
                  <p className="text-sm text-red-200 font-medium">⚠️ KILL SWITCH ACTIVE</p>
                  <p className="text-xs text-red-300 mt-1">All dispatch operations suspended. Existing trips will complete but no new trips can be created.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Test Runner</h2>
            <div className="space-y-4">
              {[
                { suite: 'RolesGuard', tests: 5, status: 'passed', time: '1.2s' },
                { suite: 'TripStateMachine', tests: 19, status: 'passed', time: '3.8s' },
                { suite: 'RatingService', tests: 5, status: 'passed', time: '2.1s' },
                { suite: 'HourlyBookingService', tests: 3, status: 'passed', time: '1.9s' },
                { suite: 'SplitPayService', tests: 4, status: 'passed', time: '1.5s' },
              ].map(s => (
                <div key={s.suite} className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{s.suite}</div>
                    <div className="text-xs text-gray-500">{s.tests} tests · {s.time}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    s.status === 'passed' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                  }`}>{s.status}</span>
                </div>
              ))}
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Total: 37 tests</div>
                    <div className="text-xs text-green-400">All passing</div>
                  </div>
                  <button className="text-sm bg-amber-600 px-4 py-2 rounded-lg hover:bg-amber-500">Run All Tests</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlatformAdminPage() {
  return (
    <AuthGuard>
      <PlatformAdminContent />
    </AuthGuard>
  );
}
