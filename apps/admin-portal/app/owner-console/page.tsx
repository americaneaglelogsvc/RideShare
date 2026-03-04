"use client";

import { useState, useEffect } from 'react';
import { ownerApi } from '../lib/api';

// §9.2 Tenant Owner Console — branding, fleet, reports, 16-module IA

type TabKey = 'dashboard' | 'branding' | 'fleet' | 'pricing' | 'drivers' | 'reports';

const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'branding', label: 'Branding', icon: '🎨' },
  { key: 'fleet', label: 'Fleet', icon: '🚗' },
  { key: 'pricing', label: 'Pricing & Policies', icon: '💰' },
  { key: 'drivers', label: 'Drivers', icon: '👤' },
  { key: 'reports', label: 'Reports', icon: '📈' },
];

export default function OwnerConsolePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Owner Console</h2>
          <p className="text-xs text-gray-500 mt-1">Chicago Premium Cars</p>
        </div>
        <nav className="p-4 space-y-1">
          {MODULES.map(m => (
            <button
              key={m.key}
              onClick={() => setActiveTab(m.key as TabKey)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center space-x-3 transition-colors ${
                activeTab === m.key ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 mt-4">
          <p className="text-xs text-gray-400">Additional modules:</p>
          <ul className="text-xs text-gray-500 mt-2 space-y-1">
            {['Corporate Accounts', 'Microsites', 'Compliance', 'Payouts', 'Referrals', 'Events', 'Support', 'Settings', 'API Keys', 'Audit Log'].map(m => (
              <li key={m} className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {activeTab === 'dashboard' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="text-sm text-gray-500">Monthly Revenue</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">$128,450</div>
                <div className="text-xs text-green-600 mt-1">+12.3% vs last month</div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="text-sm text-gray-500">Active Drivers</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">32</div>
                <div className="text-xs text-gray-500 mt-1">28 online now</div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="text-sm text-gray-500">Total Trips (MTD)</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">2,847</div>
                <div className="text-xs text-green-600 mt-1">+8.1% vs last month</div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="text-sm text-gray-500">Avg Rating</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">4.87</div>
                <div className="text-xs text-gray-500 mt-1">Based on 1,204 ratings</div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Revenue Trend</h3>
                <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 text-sm">Chart placeholder — integrate Recharts or Chart.js</div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Trip Volume</h3>
                <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 text-sm">Chart placeholder — daily trip counts</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Branding</h1>
            <div className="bg-white rounded-xl p-6 border border-gray-200 max-w-2xl">
              <div className="space-y-6">
                <div>
                  <label htmlFor="brand-name" className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input id="brand-name" type="text" defaultValue="Chicago Premium Cars" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand-primary" className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                    <input id="brand-primary" type="color" defaultValue="#1e40af" className="w-full h-10 rounded cursor-pointer" />
                  </div>
                  <div>
                    <label htmlFor="brand-accent" className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                    <input id="brand-accent" type="color" defaultValue="#3b82f6" className="w-full h-10 rounded cursor-pointer" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <p className="text-sm text-gray-500">Drag & drop your logo or click to upload</p>
                    <p className="text-xs text-gray-400 mt-1">PNG, SVG. Max 2MB. Recommended 512×512</p>
                  </div>
                </div>
                <div>
                  <label htmlFor="brand-domain" className="block text-sm font-medium text-gray-700 mb-1">Custom Domain</label>
                  <input id="brand-domain" type="text" defaultValue="ride.chicagopremiumcars.com" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium">Save Branding</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fleet' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Fleet Management</h1>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
                <span className="text-sm text-gray-600">18 vehicles</span>
                <button className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700">Add Vehicle</button>
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Plate</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { vehicle: '2024 BMW 540i', category: 'Black Sedan', plate: 'IL-CPR-001', driver: 'James K.', status: 'in_use' },
                    { vehicle: '2024 Cadillac Escalade', category: 'Black SUV', plate: 'IL-CPR-002', driver: 'Maria S.', status: 'in_use' },
                    { vehicle: '2024 Tesla Model S', category: 'Black EV', plate: 'IL-CPR-003', driver: '-', status: 'available' },
                    { vehicle: '2023 Mercedes E-Class', category: 'Black Sedan', plate: 'IL-CPR-004', driver: 'Paul A.', status: 'in_use' },
                    { vehicle: '2024 Lincoln Navigator', category: 'Black SUV', plate: 'IL-CPR-005', driver: '-', status: 'maintenance' },
                  ].map((v, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{v.vehicle}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.category}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">{v.plate}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{v.driver}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        v.status === 'in_use' ? 'bg-blue-100 text-blue-800' :
                        v.status === 'available' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>{v.status.replace(/_/g, ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Pricing & Policies</h1>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Base Rates</h3>
                <div className="space-y-3">
                  {[
                    { cat: 'Black Sedan', base: '$10.00', mile: '$2.50', min: '$0.55' },
                    { cat: 'Black SUV', base: '$15.00', mile: '$3.25', min: '$0.75' },
                    { cat: 'Black EV', base: '$12.00', mile: '$2.75', min: '$0.60' },
                  ].map(r => (
                    <div key={r.cat} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-700">{r.cat}</span>
                      <div className="text-xs text-gray-500">Base {r.base} · {r.mile}/mi · {r.min}/min</div>
                    </div>
                  ))}
                </div>
                <button className="mt-4 text-sm text-blue-600 hover:underline">Edit Rates</button>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Active Policies</h3>
                <div className="space-y-3">
                  {['Cancellation (2min free, $10 after)', 'No-show ($15 fee)', 'Wait time ($0.75/min after 5min)', 'Surge cap (1.8x)', 'Gratuity (default 18%)'].map(p => (
                    <div key={p} className="flex items-center space-x-2 text-sm text-gray-700">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
                <button className="mt-4 text-sm text-blue-600 hover:underline">Manage Policies</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'drivers' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Driver Management</h1>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Trips (MTD)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Credentials</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {[
                    { name: 'James K.', rating: 4.92, trips: 142, creds: 'License ✓ Insurance ✓ Chauffeur ✓', status: 'active' },
                    { name: 'Maria S.', rating: 4.88, trips: 128, creds: 'License ✓ Insurance ✓', status: 'active' },
                    { name: 'Paul A.', rating: 4.95, trips: 156, creds: 'License ✓ Insurance ✓ TSA ✓', status: 'active' },
                    { name: 'Sarah L.', rating: 0, trips: 0, creds: 'License ✓ Insurance ⏳', status: 'onboarding' },
                  ].map((d, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{d.rating > 0 ? `${d.rating} ★` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{d.trips}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{d.creds}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        d.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>{d.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: 'Revenue Report', desc: 'Daily/weekly/monthly revenue breakdown', icon: '💰' },
                { title: 'Trip Report', desc: 'Trip volume, categories, and geography', icon: '🚗' },
                { title: 'Driver Performance', desc: 'Ratings, acceptance, completion rates', icon: '👤' },
                { title: 'Customer Satisfaction', desc: 'Ratings, feedback, and NPS scores', icon: '⭐' },
                { title: 'Financial Statement', desc: 'P&L, payout summaries, tax docs', icon: '📋' },
                { title: 'Compliance', desc: 'Document expiry, background check status', icon: '✅' },
              ].map(r => (
                <div key={r.title} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="text-2xl mb-3">{r.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-1">{r.title}</h3>
                  <p className="text-sm text-gray-600">{r.desc}</p>
                  <button className="mt-3 text-sm text-blue-600 hover:underline">Generate →</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
