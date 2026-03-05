"use client";

import { useEffect, useMemo, useState } from 'react';

type ApiPingState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; httpStatus: number; latencyMs: number }
  | { status: 'fail'; error: string };

export default function HomePage() {
  const apiBaseUrl = useMemo(() => {
    const v =
      (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ||
      (process.env.VITE_API_BASE_URL as string | undefined) ||
      'https://api.urwaydispatch.com';
    return v.replace(/\/$/, '');
  }, []);

  const [ping, setPing] = useState<ApiPingState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setPing({ status: 'checking' });
      const start = Date.now();

      try {
        const res = await fetch(`${apiBaseUrl}/health`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const latencyMs = Date.now() - start;
        if (!cancelled) {
          setPing({ status: 'ok', httpStatus: res.status, latencyMs });
        }
      } catch (e: any) {
        if (!cancelled) {
          setPing({ status: 'fail', error: e?.message || String(e) });
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  const apiOk = ping.status === 'ok';
  const apiFail = ping.status === 'fail';

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans">
      {/* Brand Header */}
      <header className="border-b border-amber-600/30 bg-[#0f172a] px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚗</span>
            <div>
              <h1 className="text-xl font-bold text-amber-400 tracking-tight">UrWay Dispatch</h1>
              <p className="text-xs text-slate-500">Admin Portal · Multi-tenant Ride Dispatch Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${apiOk ? 'bg-green-400' : apiFail ? 'bg-red-500' : 'bg-yellow-400 animate-pulse'}`} />
            <span className="text-xs text-slate-400">
              {apiOk ? `API OK · ${(ping as any).latencyMs}ms` : apiFail ? 'API Offline' : 'Checking…'}
            </span>
          </div>
        </div>
      </header>

      {/* Hero + Nav */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-2">Administration Dashboard</h2>
          <p className="text-slate-400">Manage tenants, monitor operations, and explore the platform lifecycle.</p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-amber-900/40 to-amber-800/20 border border-amber-600/40 rounded-xl p-6 mb-8 text-center">
          <div className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-1">Featured</div>
          <h3 className="text-xl font-bold text-white mb-2">Interactive Platform Walkthrough</h3>
          <p className="text-slate-400 text-sm mb-4">8 personas · real API calls · full ride lifecycle from Prospect to Financial Close</p>
          <a href="/walkthrough" className="inline-block bg-amber-600 hover:bg-amber-500 text-white font-bold px-8 py-3 rounded-lg transition-all active:scale-95 shadow-lg shadow-amber-900/40">
            ▶ Start Walkthrough
          </a>
        </div>

        {/* Console grid */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            { href: '/ops-console',    label: 'Ops Console',     icon: '🗺️',  desc: 'Live map, active trips, driver statuses, real-time alerts',        color: 'border-violet-500/40 hover:border-violet-400' },
            { href: '/owner-console',  label: 'Owner Console',   icon: '🏢',  desc: 'Branding, pricing policies, fleet, drivers, reports per tenant',   color: 'border-blue-500/40 hover:border-blue-400' },
            { href: '/platform-admin', label: 'Platform Admin',  icon: '⚙️',  desc: 'Cross-tenant management, system health, kill switch, test runner', color: 'border-red-500/40 hover:border-red-400' },
          ].map(c => (
            <a key={c.href} href={c.href} className={`block bg-[#1e293b] border rounded-xl p-6 transition-all hover:bg-[#253347] ${c.color}`}>
              <div className="text-2xl mb-3">{c.icon}</div>
              <div className="font-semibold text-white mb-1">{c.label}</div>
              <div className="text-xs text-slate-400">{c.desc}</div>
            </a>
          ))}
        </div>

        {/* API Health + Stats */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Gateway API</h3>
            <div className="text-xs text-slate-500 font-mono break-all mb-2">{apiBaseUrl}</div>
            {ping.status === 'idle' || ping.status === 'checking' ? (
              <div className="text-sm text-slate-400 animate-pulse">Checking…</div>
            ) : ping.status === 'ok' ? (
              <div className="text-sm text-green-400">✅ OK · HTTP {ping.httpStatus} · {ping.latencyMs}ms</div>
            ) : (
              <div className="text-sm text-red-400">❌ {ping.error}</div>
            )}
          </div>
          <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Platform Snapshot</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-amber-400">10</div>
                <div className="text-xs text-slate-500">Active Tenants</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">250</div>
                <div className="text-xs text-slate-500">Seeded Drivers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">100</div>
                <div className="text-xs text-slate-500">Seeded Riders</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-400">68</div>
                <div className="text-xs text-slate-500">Tests Passing</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}