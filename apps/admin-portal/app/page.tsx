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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Admin Portal
          </h1>
          <p className="text-gray-600 mb-6">
            Welcome to the UrWay Dispatch administration dashboard.
          </p>
          <div className="space-y-3">
            <div className="bg-slate-50 p-4 rounded-lg text-left">
              <h3 className="font-semibold text-slate-900 mb-1">API Health Ping</h3>
              <div className="text-xs text-slate-600 break-all mb-2">{apiBaseUrl}</div>
              {ping.status === 'idle' || ping.status === 'checking' ? (
                <div className="text-sm text-slate-700">Checking...</div>
              ) : ping.status === 'ok' ? (
                <div className="text-sm text-green-700">
                  OK (HTTP {ping.httpStatus}) in {ping.latencyMs}ms
                </div>
              ) : (
                <div className="text-sm text-red-700">FAIL: {ping.error}</div>
              )}
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-600 font-medium">Active Drivers:</span>
                  <div className="text-2xl font-bold text-blue-900">247</div>
                </div>
                <div>
                  <span className="text-blue-600 font-medium">Daily Rides:</span>
                  <div className="text-2xl font-bold text-blue-900">1,432</div>
                </div>
              </div>
            </div>
            <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Access Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}