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
    <div className="min-h-screen bg-[#0f172a] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1e293b] border-r border-slate-700 min-h-screen flex-shrink-0">
        <div className="p-5 border-b border-slate-700">
          <a href="/" className="text-slate-500 hover:text-amber-400 text-xs transition-colors block mb-3">← Home</a>
          <h2 className="text-base font-bold text-amber-400">Owner Console</h2>
          <p className="text-xs text-slate-500 mt-0.5">GoldRavenia</p>
        </div>
        <nav className="p-3 space-y-0.5">
          {MODULES.map(m => (
            <button
              key={m.key}
              onClick={() => setActiveTab(m.key as TabKey)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center space-x-3 transition-colors ${
                activeTab === m.key
                  ? 'bg-amber-600/20 text-amber-400 font-medium border border-amber-600/30'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700 mt-2">
          <p className="text-xs text-slate-600 uppercase tracking-wide mb-2">More Modules</p>
          <ul className="text-xs text-slate-500 space-y-1">
            {['Corporate Accounts', 'Microsites', 'Compliance', 'Payouts', 'Referrals', 'Events', 'Support', 'Settings', 'API Keys', 'Audit Log'].map(m => (
              <li key={m} className="flex items-center space-x-2 hover:text-slate-300 cursor-pointer transition-colors">
                <span className="w-1.5 h-1.5 bg-slate-600 rounded-full"></span>
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
            <h1 className="text-xl font-bold text-white mb-5">Dashboard</h1>
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Monthly Revenue', value: '$128,450', sub: '+12.3% vs last month', subColor: 'text-green-400' },
                { label: 'Active Drivers',  value: '32',       sub: '28 online now',        subColor: 'text-slate-400' },
                { label: 'Trips (MTD)',     value: '2,847',    sub: '+8.1% vs last month',  subColor: 'text-green-400' },
                { label: 'Avg Rating',      value: '4.87 ★',   sub: '1,204 ratings',        subColor: 'text-slate-400' },
              ].map(s => (
                <div key={s.label} className="bg-[#1e293b] rounded-xl p-5 border border-slate-700">
                  <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                  <div className="text-2xl font-bold text-amber-400">{s.value}</div>
                  <div className={`text-xs mt-1 ${s.subColor}`}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700">
                <h3 className="font-semibold text-slate-300 mb-3">Revenue Trend</h3>
                <div className="h-44 bg-[#0f172a] rounded-lg flex items-center justify-center text-slate-600 text-sm border border-slate-800">Recharts / Chart.js integration ready</div>
              </div>
              <div className="bg-[#1e293b] rounded-xl p-5 border border-slate-700">
                <h3 className="font-semibold text-slate-300 mb-3">Trip Volume</h3>
                <div className="h-44 bg-[#0f172a] rounded-lg flex items-center justify-center text-slate-600 text-sm border border-slate-800">Daily trip counts chart</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'branding' && (
          <div>
            <h1 className="text-xl font-bold text-white mb-5">Branding</h1>
            <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700 max-w-2xl">
              <div className="space-y-5">
                <div>
                  <label htmlFor="brand-name" className="block text-sm font-medium text-slate-300 mb-1">Company Name</label>
                  <input id="brand-name" type="text" defaultValue="GoldRavenia" className="w-full px-4 py-2 bg-[#0f172a] border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="brand-primary" className="block text-sm font-medium text-slate-300 mb-1">Primary Color</label>
                    <input id="brand-primary" type="color" defaultValue="#b8960c" className="w-full h-10 rounded cursor-pointer bg-[#0f172a] border border-slate-600" />
                  </div>
                  <div>
                    <label htmlFor="brand-accent" className="block text-sm font-medium text-slate-300 mb-1">Accent Color</label>
                    <input id="brand-accent" type="color" defaultValue="#1a1a2e" className="w-full h-10 rounded cursor-pointer bg-[#0f172a] border border-slate-600" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Logo</label>
                  <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-amber-600/50 transition-colors cursor-pointer">
                    <p className="text-sm text-slate-400">Drag &amp; drop your logo or click to upload</p>
                    <p className="text-xs text-slate-600 mt-1">PNG, SVG. Max 2MB. Recommended 512×512</p>
                  </div>
                </div>
                <div>
                  <label htmlFor="brand-domain" className="block text-sm font-medium text-slate-300 mb-1">Custom Domain</label>
                  <input id="brand-domain" type="text" defaultValue="ride.goldravenia.com" className="w-full px-4 py-2 bg-[#0f172a] border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:outline-none" />
                </div>
                <button className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-500 font-medium transition-colors">Save Branding</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'fleet' && (
          <div>
            <h1 className="text-xl font-bold text-white mb-5">Fleet Management</h1>
            <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden">
              <div className="px-4 py-3 bg-[#253347] flex justify-between items-center">
                <span className="text-sm text-slate-400">25 vehicles (Lincoln Continental fleet)</span>
                <button className="text-sm bg-amber-600 text-white px-4 py-1.5 rounded-lg hover:bg-amber-500 transition-colors">Add Vehicle</button>
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Vehicle</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Plate</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Driver</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-700">
                  {[
                    { vehicle: '2024 Lincoln Continental', category: 'Black Sedan', plate: 'IL-GR-001', driver: 'James K.', status: 'in_use' },
                    { vehicle: '2024 Lincoln Continental', category: 'Black Sedan', plate: 'IL-GR-002', driver: 'Maria S.', status: 'in_use' },
                    { vehicle: '2024 Lincoln Continental', category: 'Black Sedan', plate: 'IL-GR-003', driver: '-', status: 'available' },
                    { vehicle: '2024 Lincoln Continental', category: 'Black Sedan', plate: 'IL-GR-004', driver: 'Paul A.', status: 'in_use' },
                    { vehicle: '2024 Lincoln Continental', category: 'Black Sedan', plate: 'IL-GR-005', driver: '-', status: 'maintenance' },
                  ].map((v, i) => (
                    <tr key={i} className="hover:bg-[#253347] transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-200">{v.vehicle}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{v.category}</td>
                      <td className="px-4 py-3 text-sm font-mono text-amber-400">{v.plate}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{v.driver}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        v.status === 'in_use' ? 'bg-blue-900/60 text-blue-300' :
                        v.status === 'available' ? 'bg-green-900/60 text-green-300' :
                        'bg-yellow-900/60 text-yellow-300'
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
            <h1 className="text-xl font-bold text-white mb-5">Pricing &amp; Policies</h1>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700">
                <h3 className="font-semibold text-slate-300 mb-4">Base Rates</h3>
                <div className="space-y-3">
                  {[
                    { cat: 'Black Sedan', base: '$8.00', mile: '$2.50', min: '$0.45' },
                    { cat: 'Black SUV',   base: '$12.00', mile: '$3.25', min: '$0.65' },
                  ].map(r => (
                    <div key={r.cat} className="flex items-center justify-between py-2 border-b border-slate-700">
                      <span className="text-sm text-slate-200">{r.cat}</span>
                      <div className="text-xs text-slate-400">Base {r.base} · {r.mile}/mi · {r.min}/min</div>
                    </div>
                  ))}
                </div>
                <button className="mt-4 text-sm text-amber-400 hover:underline">Edit Rates</button>
              </div>
              <div className="bg-[#1e293b] rounded-xl p-6 border border-slate-700">
                <h3 className="font-semibold text-slate-300 mb-4">Active Policies</h3>
                <div className="space-y-3">
                  {['Cancellation: 2 min free / $9.50 after', 'No-show: $12.00 fee', 'Mess fee: $250.00', 'Min wage supplement: $18/hr floor', 'Surge cap: 1.8x', 'Gratuity: 18% default'].map(p => (
                    <div key={p} className="flex items-center space-x-2 text-sm text-slate-300">
                      <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
                <button className="mt-4 text-sm text-amber-400 hover:underline">Manage Policies</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'drivers' && (
          <div>
            <h1 className="text-xl font-bold text-white mb-5">Driver Management</h1>
            <div className="bg-[#1e293b] rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-[#253347] border-b border-slate-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Driver</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Rating</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Trips (MTD)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Credentials</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-700">
                  {[
                    { name: 'James K.', rating: 4.92, trips: 142, creds: 'License ✓ Insurance ✓ Chauffeur ✓', status: 'active' },
                    { name: 'Maria S.', rating: 4.88, trips: 128, creds: 'License ✓ Insurance ✓', status: 'active' },
                    { name: 'Paul A.', rating: 4.95, trips: 156, creds: 'License ✓ Insurance ✓ TSA ✓', status: 'active' },
                    { name: 'Sarah L.', rating: 0, trips: 0, creds: 'License ✓ Insurance ⏳', status: 'onboarding' },
                  ].map((d, i) => (
                    <tr key={i} className="hover:bg-[#253347] transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-white">{d.name}</td>
                      <td className="px-4 py-3 text-sm text-amber-400">{d.rating > 0 ? `${d.rating} ★` : '-'}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{d.trips}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">{d.creds}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        d.status === 'active' ? 'bg-green-900/60 text-green-300' : 'bg-yellow-900/60 text-yellow-300'
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
            <h1 className="text-xl font-bold text-white mb-5">Reports</h1>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: 'Revenue Report',       desc: 'Daily/weekly/monthly revenue breakdown', icon: '💰' },
                { title: 'Trip Report',           desc: 'Trip volume, categories, and geography', icon: '🚗' },
                { title: 'Driver Performance',    desc: 'Ratings, acceptance, completion rates', icon: '👤' },
                { title: 'Customer Satisfaction', desc: 'Ratings, feedback, and NPS scores', icon: '⭐' },
                { title: 'Financial Statement',   desc: 'P&L, payout summaries, tax docs', icon: '📋' },
                { title: 'Compliance',            desc: 'Document expiry, background check status', icon: '✅' },
              ].map(r => (
                <div key={r.title} className="bg-[#1e293b] rounded-xl p-5 border border-slate-700 hover:border-amber-600/40 transition-colors cursor-pointer">
                  <div className="text-2xl mb-3">{r.icon}</div>
                  <h3 className="font-semibold text-white mb-1">{r.title}</h3>
                  <p className="text-sm text-slate-400">{r.desc}</p>
                  <button className="mt-3 text-sm text-amber-400 hover:underline">Generate →</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
