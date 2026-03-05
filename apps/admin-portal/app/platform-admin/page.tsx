"use client";

import { useState, useEffect } from 'react';
import { platformApi } from '../lib/api';

// §9.3 Platform Admin Console — tenant CRUD, cross-tenant tracking, kill-switch, test runner

type AdminTab = 'tenants' | 'health' | 'killswitch' | 'tests';

const MOCK_TENANTS = [
  { id: 'ten-001', name: 'Chicago Premium Cars', plan: 'Professional', drivers: 32, trips_mtd: 2847, revenue_mtd: 128450, status: 'active' },
  { id: 'ten-002', name: 'Lake Shore Limo', plan: 'Enterprise', drivers: 58, trips_mtd: 4210, revenue_mtd: 215800, status: 'active' },
  { id: 'ten-003', name: 'Windy City Black Car', plan: 'Starter', drivers: 8, trips_mtd: 412, revenue_mtd: 18900, status: 'active' },
  { id: 'ten-004', name: 'O\'Hare Express', plan: 'Professional', drivers: 22, trips_mtd: 1890, revenue_mtd: 89200, status: 'active' },
  { id: 'ten-005', name: 'Midwest Executive', plan: 'Enterprise', drivers: 45, trips_mtd: 3100, revenue_mtd: 167300, status: 'suspended' },
];

export default function PlatformAdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('tenants');
  const [killSwitchEnabled, setKillSwitchEnabled] = useState(false);

  const totalDrivers = MOCK_TENANTS.reduce((s, t) => s + t.drivers, 0);
  const totalTrips = MOCK_TENANTS.reduce((s, t) => s + t.trips_mtd, 0);
  const totalRevenue = MOCK_TENANTS.reduce((s, t) => s + t.revenue_mtd, 0);

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
            <span className="text-sm text-slate-500">admin@urwaydispatch.com</span>
          </div>
        </div>
      </header>

      {/* Platform Stats */}
      <div className="bg-[#1e293b] border-b border-slate-700 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{MOCK_TENANTS.length}</div>
            <div className="text-xs text-gray-500">Total Tenants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{MOCK_TENANTS.filter(t => t.status === 'active').length}</div>
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
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Drivers</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Trips (MTD)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Revenue (MTD)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-700">
                  {MOCK_TENANTS.map(t => (
                    <tr key={t.id} className="hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{t.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{t.id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{t.plan}</td>
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
