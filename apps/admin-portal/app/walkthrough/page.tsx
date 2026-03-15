"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

const TENANT_ID = "a1b2c3d4-0001-4000-8000-000000000001";
const DRIVER_1  = "d0000000-0001-4000-8000-0000000001";
const DRIVER_2  = "d0000000-0001-4000-8000-0000000002";
const RIDER_1   = "r0000000-0001-4000-8000-000000000001";
const RIDER_2   = "r0000000-0001-4000-8000-000000000002";

const DEFAULT_URLS = {
  gateway: "http://localhost:9000",
  rider:   "http://localhost:5174",
  driver:  "http://localhost:5173",
  public:  "http://localhost:5173",
  admin:   "http://localhost:5175",
};

type SvcStatus  = "checking" | "online" | "offline";
type StepResult = { status: "idle" | "loading" | "ok" | "error"; data?: any; error?: string };

const SERVICES: { id: keyof typeof DEFAULT_URLS; label: string; port: string; cmd: string; healthPath?: string }[] = [
  { id: "gateway", label: "Gateway API",  port: "9000", cmd: "cd services/gateway && npx nest start", healthPath: "/health" },
  { id: "rider",   label: "Rider App",    port: "5174", cmd: "cd apps/rider-app && npx vite --port 5174" },
  { id: "driver",  label: "Driver App",   port: "5173", cmd: "cd apps/driver-app && npx vite --port 5173" },
  { id: "admin",   label: "Admin Portal", port: "5175", cmd: "cd apps/admin-portal && npx next dev --port 5175" },
];

export default function WalkthroughPage() {
  const [urls, setUrls]         = useState({ ...DEFAULT_URLS });
  const [authToken, setAuthToken] = useState("test");
  const [tripId, setTripId]     = useState("");
  const [cancelId, setCancelId] = useState("");
  const [activeAct, setActiveAct] = useState(1);
  const [results, setResults]   = useState<Record<string, StepResult>>({});
  const [svc, setSvc]           = useState<Record<string, SvcStatus>>({});
  const actRefs = useRef<Record<number, HTMLDivElement | null>>({});

  function setResult(key: string, r: StepResult) {
    setResults((prev) => ({ ...prev, [key]: r }));
  }

  const checkServices = useCallback(async () => {
    setSvc(prev => Object.fromEntries(SERVICES.map(s => [s.id, prev[s.id] ?? "checking"])));
    await Promise.all(SERVICES.map(async s => {
      const url = s.healthPath ? `${urls[s.id]}${s.healthPath}` : urls[s.id];
      try {
        await fetch(url, { signal: AbortSignal.timeout(2500), mode: "no-cors" });
        setSvc(prev => ({ ...prev, [s.id]: "online" }));
      } catch {
        setSvc(prev => ({ ...prev, [s.id]: "offline" }));
      }
    }));
  }, [urls]);

  useEffect(() => {
    checkServices();
    const t = setInterval(checkServices, 15000);
    return () => clearInterval(t);
  }, [checkServices]);

  async function callApi(key: string, method: string, path: string, body?: any, tid = TENANT_ID) {
    setResult(key, { status: "loading" });
    try {
      const res = await fetch(`${urls.gateway}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "x-tenant-id": tid,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({ _raw: "non-JSON response" }));
      setResult(key, { status: res.ok ? "ok" : "error", data });
      return data;
    } catch (e: any) {
      setResult(key, { status: "error", error: e.message });
      return null;
    }
  }

  const setUrl = (k: keyof typeof DEFAULT_URLS, v: string) => setUrls(prev => ({ ...prev, [k]: v }));
  function openUrl(url: string) { window.open(url, "_blank"); }

  function scrollToAct(n: number) {
    setActiveAct(n);
    setTimeout(() => actRefs.current[n]?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

  async function runAllApiSteps() {
    scrollToAct(2);
    const tosData = await callApi("tos-accept", "POST", "/onboarding/terms/accept", { accepted_by: "admin@goldravenia.com" });
    if (!tosData) return;
    scrollToAct(4);
    const dispatchData = await callApi("dispatch-ride", "POST", "/dispatch/dispatch-ride", {
      rider_id: RIDER_1, rider_name: "Alice TestRider-T1", rider_phone: "+13125550101",
      pickup: { address: "233 S Wacker Dr (Willis Tower)", lat: 41.8789, lng: -87.6359 },
      dropoff: { address: "O'Hare Terminal 1", lat: 41.9742, lng: -87.9073 },
      category: "black_sedan", estimated_fare: 4500,
    });
    const tid = dispatchData?.trip_id;
    if (tid) setTripId(tid);
    if (!tid) return;
    scrollToAct(5);
    await callApi("accept-trip",   "PUT",  "/dispatch/accept-trip",   { trip_id: tid, driver_id: DRIVER_1 });
    await callApi("start-trip",    "PUT",  "/dispatch/start-trip",    { trip_id: tid });
    await callApi("complete-trip", "PUT",  "/dispatch/complete-trip", { trip_id: tid });
    scrollToAct(6);
    await callApi("adj-extra-stop", "POST", "/dispatch/adjust-trip",  { trip_id: tid, adjustments: [{ type: "extra_stop", description: "Rider added stop at Starbucks" }] });
    await callApi("adj-mess-fee",   "POST", "/dispatch/adjust-trip",  { trip_id: tid, adjustments: [{ type: "mess_fee", description: "Interior cleaning required" }] });
    await callApi("adj-deviation",  "POST", "/dispatch/adjust-trip",  { trip_id: tid, adjustments: [{ type: "route_deviation", description: "Longer route via Lake Shore Dr" }] });
    await callApi("adj-minwage",    "POST", "/dispatch/adjust-trip",  { trip_id: tid, adjustments: [{ type: "min_wage_supplement", description: "Driver below $18/hr floor" }] });
    scrollToAct(7);
    await callApi("close-trip", "PUT", "/dispatch/close-trip", { trip_id: tid, closed_by: "sandra@goldravenia.com" });
    scrollToAct(8);
    const cancelData = await callApi("cancel-dispatch", "POST", "/dispatch/dispatch-ride", {
      rider_id: RIDER_2, rider_name: "Bob TestRider-T1", rider_phone: "+13125550102",
      pickup: { address: "400 N Michigan Ave", lat: 41.8902, lng: -87.6244 },
      dropoff: { address: "Midway Airport", lat: 41.7868, lng: -87.7522 },
      category: "black_sedan", estimated_fare: 3500,
    });
    const cid = cancelData?.trip_id;
    if (cid) { setCancelId(cid); await callApi("cancel-accept", "PUT", "/dispatch/accept-trip", { trip_id: cid, driver_id: DRIVER_2 }); }
    if (cid) await callApi("cancel-trip", "PUT", "/dispatch/cancel-trip", { trip_id: cid, cancelled_by: "rider", reason: "Changed plans" });
  }

  const pill = (label: string, color: string) => (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
  );

  function ResultBox({ k }: { k: string }) {
    const r = results[k];
    if (!r || r.status === "idle") return null;
    if (r.status === "loading") return <div className="mt-2 text-xs text-slate-400 animate-pulse">⏳ Calling API…</div>;
    const ok = r.status === "ok";
    return (
      <pre className={`mt-2 text-xs rounded p-3 overflow-auto max-h-48 whitespace-pre-wrap break-all ${ok ? "bg-green-950 text-green-300 border border-green-700" : "bg-red-950 text-red-300 border border-red-700"}`}>
        {ok ? "✅ " : "❌ "}{JSON.stringify(r.data ?? r.error, null, 2)}
      </pre>
    );
  }

  function Btn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
    return <button onClick={onClick} className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all active:scale-95 ${color}`}>{label}</button>;
  }

  function ActCard({ n, persona, role, color, borderColor, badge, children }: { n: number; persona: string; role: string; color: string; borderColor: string; badge: string; children: React.ReactNode }) {
    const open = activeAct === n;
    const done = Object.values(results).length > 0 && activeAct > n;
    return (
      <div ref={(el) => { actRefs.current[n] = el; }} className={`rounded-xl border-2 transition-all ${open ? borderColor : "border-slate-700"} bg-slate-800 mb-4`}>
        <button onClick={() => scrollToAct(n)} className="w-full flex items-center gap-4 p-4 text-left">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${done ? "bg-green-600 text-white" : open ? color : "bg-slate-600 text-slate-300"}`}>
            {done ? "✓" : n}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white">{persona}</span>
              {pill(badge, color + " text-white")}
            </div>
            <div className="text-xs text-slate-400">{role}</div>
          </div>
          <span className="text-slate-400 text-lg">{open ? "▲" : "▼"}</span>
        </button>
        {open && <div className="px-4 pb-4 pt-0 space-y-4">{children}</div>}
      </div>
    );
  }

  const stepRow = (label: string, btn: React.ReactNode, resultKey?: string) => (
    <div className="bg-slate-750 rounded-lg p-3 border border-slate-600">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 text-sm text-slate-300 min-w-0">{label}</div>
        <div className="shrink-0">{btn}</div>
      </div>
      {resultKey && <ResultBox k={resultKey} />}
    </div>
  );

  const svcDot = (id: string) => {
    const s = svc[id] ?? "checking";
    return (
      <span className={`inline-block w-2 h-2 rounded-full mr-1 ${s === "online" ? "bg-green-400" : s === "offline" ? "bg-red-500" : "bg-yellow-400 animate-pulse"}`} />
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">

      {/* ── Brand Header ── */}
      <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] border-b border-amber-600/40 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚗</span>
              <div>
                <h1 className="text-xl font-bold text-amber-400 tracking-tight">UrWay Dispatch</h1>
                <p className="text-xs text-slate-400">Interactive Platform Walkthrough · 8 Personas · Real API Calls</p>
              </div>
            </div>
          </div>
          <button onClick={runAllApiSteps} className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold px-6 py-2.5 rounded-lg transition-all active:scale-95 shadow-lg shadow-amber-900/40 whitespace-nowrap">
            ▶ Run Full Lifecycle
          </button>
        </div>
      </div>

      {/* ── Service Health Panel ── */}
      <div className="bg-slate-800/80 border-b border-slate-700 px-6 py-3">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap gap-x-6 gap-y-2 items-center justify-between">
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {SERVICES.map(s => (
                <div key={s.id} className="flex items-center gap-1.5 text-xs">
                  {svcDot(s.id)}
                  <span className={svc[s.id] === "online" ? "text-green-400" : svc[s.id] === "offline" ? "text-red-400" : "text-yellow-400"}>{s.label}</span>
                  <span className="text-slate-500">:{s.port}</span>
                  {svc[s.id] === "offline" && (
                    <code className="text-slate-500 text-[10px] ml-1 hidden sm:inline">{s.cmd}</code>
                  )}
                </div>
              ))}
            </div>
            <button onClick={checkServices} className="text-xs text-slate-400 hover:text-amber-400 transition-colors">↻ Refresh</button>
          </div>
        </div>
      </div>

      {/* ── Config Bar ── */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap gap-3 items-center">
          {([
            { key: "gateway" as const, label: "Gateway", ph: "http://localhost:9000" },
            { key: "rider"   as const, label: "Rider",   ph: "http://localhost:5174" },
            { key: "driver"  as const, label: "Driver",  ph: "http://localhost:5173" },
            { key: "admin"   as const, label: "Admin",   ph: "http://localhost:5175" },
          ] as const).map(f => (
            <div key={f.key} className="flex items-center gap-1.5 flex-1 min-w-36">
              <span className="text-xs text-slate-500 whitespace-nowrap">{f.label}</span>
              <input value={urls[f.key]} onChange={e => setUrl(f.key, e.target.value)} title={`${f.label} base URL`} placeholder={f.ph} className="flex-1 bg-slate-700 text-white text-xs px-2 py-1.5 rounded border border-slate-600 focus:outline-none focus:border-amber-500 min-w-0" />
            </div>
          ))}
          <div className="flex items-center gap-1.5 min-w-28">
            <span className="text-xs text-slate-500">Token</span>
            <input value={authToken} onChange={e => setAuthToken(e.target.value)} title="Bearer auth token" placeholder="test" className="flex-1 bg-slate-700 text-white text-xs px-2 py-1.5 rounded border border-slate-600 focus:outline-none focus:border-amber-500 min-w-0" />
          </div>
          {tripId && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">trip_id</span>
              <span className="bg-green-950 text-green-300 text-xs px-2 py-1 rounded font-mono border border-green-700">{tripId.slice(0,14)}…</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div className="bg-slate-850 border-b border-slate-700 px-6 py-3 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-1 min-w-max">
          {[
            { n: 1, label: "Prospect" },
            { n: 2, label: "Platform Admin" },
            { n: 3, label: "Tenant Owner" },
            { n: 4, label: "Rider" },
            { n: 5, label: "Driver" },
            { n: 6, label: "Ops Mgr" },
            { n: 7, label: "Finance" },
            { n: 8, label: "Bonus" },
          ].map((a, i, arr) => (
            <div key={a.n} className="flex items-center gap-1">
              <button onClick={() => scrollToAct(a.n)} className={`flex flex-col items-center gap-1 px-2 group`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${activeAct === a.n ? "bg-amber-500 text-white scale-110" : activeAct > a.n ? "bg-green-600 text-white" : "bg-slate-600 text-slate-400 group-hover:bg-slate-500"}`}>
                  {activeAct > a.n ? "✓" : a.n}
                </div>
                <span className={`text-xs whitespace-nowrap ${activeAct === a.n ? "text-amber-400" : "text-slate-500"}`}>{a.label}</span>
              </button>
              {i < arr.length - 1 && <div className={`h-0.5 w-6 ${activeAct > a.n ? "bg-green-600" : "bg-slate-600"}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Acts */}
      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* ACT 1 */}
        <ActCard n={1} persona="Marcus Chen" role="Prospect — TNC operator shopping for dispatch software" color="bg-purple-600" borderColor="border-purple-500" badge="Prospect">
          <p className="text-sm text-slate-400">Marcus found UrWayDispatch online. Walk the public marketing site before he signs up.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              ["🏠 Home",             ""],
              ["⚙️ Services",         "/services.html"],
              ["💰 Pricing",          "/pricing.html"],
              ["🚀 For Operators",    "/for-operators.html"],
              ["🛡️ Safety",          "/safety.html"],
              ["❓ FAQ",              "/faq.html"],
              ["📋 Terms of Service", "/terms.html"],
              ["🔒 Privacy Policy",   "/privacy.html"],
            ].map(([label, path]) => (
              <React.Fragment key={label as string}>
                {stepRow(label as string, <Btn label="Open Page →" color="bg-purple-700 hover:bg-purple-600 text-white" onClick={() => openUrl(`${urls.public}${path as string}`)} />)}
              </React.Fragment>
            ))}
          </div>
          <div className="pt-2 text-xs text-slate-500">💡 On "For Operators", fill out the lead form and click Submit — it POSTs to the real <code>/leads</code> API.</div>
          <div className="flex justify-end pt-2"><Btn label="Next: Platform Admin →" color="bg-slate-600 hover:bg-slate-500 text-white" onClick={() => scrollToAct(2)} /></div>
        </ActCard>

        {/* ACT 2 */}
        <ActCard n={2} persona="Janet Reyes" role="UWD Platform Administrator — onboarding GoldRavenia" color="bg-red-700" borderColor="border-red-500" badge="Platform Admin">
          <p className="text-sm text-slate-400">Marcus signed up. Janet onboards his tenant in the Platform Admin console and accepts ToS.</p>
          {stepRow("Open Platform Admin — see all 10 pre-seeded tenants", <Btn label="Open Platform Admin →" color="bg-red-700 hover:bg-red-600 text-white" onClick={() => openUrl(`${urls.admin}/platform-admin`)} />)}
          {stepRow("Accept Terms of Service for GoldRavenia (tenant ID: a1b2c3d4-0001-…)", <Btn label="Execute: POST /onboarding/terms/accept" color="bg-red-700 hover:bg-red-600 text-white" onClick={() => callApi("tos-accept", "POST", "/onboarding/terms/accept", { accepted_by: "admin@goldravenia.com" })} />, "tos-accept")}
          {stepRow("Check ToS acceptance status", <Btn label="Execute: GET /onboarding/terms/status" color="bg-slate-600 hover:bg-slate-500 text-white" onClick={() => callApi("tos-status", "GET", "/onboarding/terms/status")} />, "tos-status")}
          {stepRow("View full API catalogue in Swagger", <Btn label="Open Swagger UI →" color="bg-slate-600 hover:bg-slate-500 text-white" onClick={() => openUrl(`${urls.gateway}/api`)} />)}
          <div className="flex justify-end pt-2"><Btn label="Next: Tenant Owner →" color="bg-slate-600 hover:bg-slate-500 text-white" onClick={() => scrollToAct(3)} /></div>
        </ActCard>

        {/* ACT 3 */}
        <ActCard n={3} persona="Marcus Chen" role="Tenant Owner — configuring GoldRavenia in Owner Console" color="bg-blue-700" borderColor="border-blue-500" badge="Tenant Owner">
          <p className="text-sm text-slate-400">Marcus logs into the Owner Console to set up branding, pricing, and verify his drivers are online.</p>
          {stepRow("Open Owner Console — Dashboard, Branding, Pricing, Drivers, Fleet, Reports tabs", <Btn label="Open Owner Console →" color="bg-blue-700 hover:bg-blue-600 text-white" onClick={() => openUrl(`${urls.admin}/owner-console`)} />)}
          <div className="bg-slate-700 rounded p-3 text-xs text-slate-300 space-y-1">
            <div><span className="text-amber-400 font-bold">Branding tab:</span> Colors — #b8960c (gold) + #1a1a2e (navy), logo</div>
            <div><span className="text-amber-400 font-bold">Pricing tab:</span> Base $8.00 | Per-mile $2.50 | Per-min $0.45 | Mess fee $250 | Min wage $18/hr</div>
            <div><span className="text-amber-400 font-bold">Drivers tab:</span> 25 pre-seeded drivers (all online, GPS-positioned across Chicago)</div>
            <div><span className="text-amber-400 font-bold">Fleet tab:</span> 25 Lincoln Continentals (black_sedan category)</div>
            <div><span className="text-amber-400 font-bold">Reports tab:</span> Will populate with financial data after ride is closed in Acts 6–7</div>
          </div>
          <div className="flex justify-end pt-2"><Btn label="Next: Rider →" color="bg-slate-600 hover:bg-slate-500 text-white" onClick={() => scrollToAct(4)} /></div>
        </ActCard>

        {/* ACT 4 */}
        <ActCard n={4} persona="Alice Nguyen" role="Rider — booking a black-car ride via GoldRavenia's branded app" color="bg-green-700" borderColor="border-green-500" badge="Rider">
          <p className="text-sm text-slate-400">Alice opens the rider app and books a ride from Willis Tower to O'Hare.</p>
          {stepRow("Open Rider App — home screen with on-demand, scheduled, hourly tiles", <Btn label="Open Rider App →" color="bg-green-700 hover:bg-green-600 text-white" onClick={() => openUrl(urls.rider)} />)}
          {stepRow("Open booking screen — enter pickup/dropoff, select Black Sedan", <Btn label="Open Book a Ride →" color="bg-green-700 hover:bg-green-600 text-white" onClick={() => openUrl(`${urls.rider}/book`)} />)}
          {stepRow(
            "Dispatch ride — Willis Tower → O'Hare, black_sedan, $45 estimated fare",
            <Btn label="Execute: POST /dispatch/dispatch-ride" color="bg-green-700 hover:bg-green-600 text-white" onClick={async () => {
              const d = await callApi("dispatch-ride", "POST", "/dispatch/dispatch-ride", {
                rider_id: RIDER_1, rider_name: "Alice TestRider-T1", rider_phone: "+13125550101",
                pickup: { address: "233 S Wacker Dr (Willis Tower)", lat: 41.8789, lng: -87.6359 },
                dropoff: { address: "O'Hare Terminal 1", lat: 41.9742, lng: -87.9073 },
                category: "black_sedan", estimated_fare: 4500,
              });
              if (d?.trip_id) setTripId(d.trip_id);
            }} />,
            "dispatch-ride"
          )}
          {tripId && <div className="bg-green-900 border border-green-600 rounded p-2 text-xs text-green-300 font-mono">trip_id captured: {tripId} — auto-used in all remaining steps ✅</div>}
          <div className="flex justify-end pt-2"><Btn label="Next: Driver →" color="bg-slate-600 hover:bg-slate-500 text-white" onClick={() => scrollToAct(5)} /></div>
        </ActCard>

        {/* ACT 5 */}
        <ActCard n={5} persona="James Kim" role="Driver — GoldRavenia driver #1 accepting and completing the trip" color="bg-orange-700" borderColor="border-orange-500" badge="Driver">
          <p className="text-sm text-slate-400">James gets the offer on his driver app, accepts it, picks Alice up, and drops her at O'Hare.</p>
          {stepRow("Open Driver App — dashboard with online/offline toggle and ride offer", <Btn label="Open Driver App →" color="bg-orange-700 hover:bg-orange-600 text-white" onClick={() => openUrl(urls.driver)} />)}
          {stepRow("Open Active Trip view — en route, wait timer, no-show at 5 min", <Btn label="Open Active Trip →" color="bg-orange-700 hover:bg-orange-600 text-white" onClick={() => openUrl(`${urls.driver}/trip`)} />)}
          {stepRow("Driver accepts the trip offer (REQUESTED → ASSIGNED)", <Btn label="Execute: PUT /accept-trip" color="bg-orange-700 hover:bg-orange-600 text-white" onClick={() => callApi("accept-trip", "PUT", "/dispatch/accept-trip", { trip_id: tripId, driver_id: DRIVER_1 })} />, "accept-trip")}
          {stepRow("Alice enters the car — driver taps Start Trip (ASSIGNED → ACTIVE)", <Btn label="Execute: PUT /start-trip" color="bg-orange-700 hover:bg-orange-600 text-white" onClick={() => callApi("start-trip", "PUT", "/dispatch/start-trip", { trip_id: tripId })} />, "start-trip")}
          {stepRow("Arrive at O'Hare — driver taps Complete (ACTIVE → COMPLETED)", <Btn label="Execute: PUT /complete-trip" color="bg-orange-700 hover:bg-orange-600 text-white" onClick={() => callApi("complete-trip", "PUT", "/dispatch/complete-trip", { trip_id: tripId })} />, "complete-trip")}
          {stepRow("View James's earnings — today/week/month breakdown", <Btn label="Open Earnings →" color="bg-orange-700 hover:bg-orange-600 text-white" onClick={() => openUrl(`${urls.driver}/earnings`)} />)}
          <div className="flex justify-end pt-2"><Btn label="Next: Ops Manager →" color="bg-slate-600 hover:bg-slate-500 text-white" onClick={() => scrollToAct(6)} /></div>
        </ActCard>

        {/* ACT 6 */}
        <ActCard n={6} persona="Janet Reyes" role="Ops Manager — applying 4 adjustments to the completed trip" color="bg-violet-700" borderColor="border-violet-500" badge="Ops Manager">
          <p className="text-sm text-slate-400">Alice added a stop, made a mess, the route deviated, and James's hourly fell below GoldRavenia's $18/hr floor. Janet applies all 4 adjustments. Each <code>amount_cents</code> auto-resolves from GoldRavenia's pricing policy.</p>
          {stepRow("Open Ops Console — see live trips table with Alice's completed trip", <Btn label="Open Ops Console →" color="bg-violet-700 hover:bg-violet-600 text-white" onClick={() => openUrl(`${urls.admin}/ops-console`)} />)}
          {stepRow("Extra stop — Starbucks on N State St (+$3.00)", <Btn label="Execute: extra_stop" color="bg-violet-700 hover:bg-violet-600 text-white" onClick={() => callApi("adj-extra-stop", "POST", "/dispatch/adjust-trip", { trip_id: tripId, adjustments: [{ type: "extra_stop", description: "Rider added stop at Starbucks on N State St" }] })} />, "adj-extra-stop")}
          {stepRow("Mess fee — interior cleaning required (+$250.00)", <Btn label="Execute: mess_fee" color="bg-violet-700 hover:bg-violet-600 text-white" onClick={() => callApi("adj-mess-fee", "POST", "/dispatch/adjust-trip", { trip_id: tripId, adjustments: [{ type: "mess_fee", description: "Rider vomited — interior cleaning required" }] })} />, "adj-mess-fee")}
          {stepRow("Route deviation — Lake Shore Drive construction (+$9.00)", <Btn label="Execute: route_deviation" color="bg-violet-700 hover:bg-violet-600 text-white" onClick={() => callApi("adj-deviation", "POST", "/dispatch/adjust-trip", { trip_id: tripId, adjustments: [{ type: "route_deviation", description: "Longer route via Lake Shore Drive due to construction" }] })} />, "adj-deviation")}
          {stepRow("Min-wage supplement — driver below $18/hr floor (+$21.00)", <Btn label="Execute: min_wage_supplement" color="bg-violet-700 hover:bg-violet-600 text-white" onClick={() => callApi("adj-minwage", "POST", "/dispatch/adjust-trip", { trip_id: tripId, adjustments: [{ type: "min_wage_supplement", description: "Driver hourly below GoldRavenia $18/hr floor due to traffic" }] })} />, "adj-minwage")}
          <div className="flex justify-end pt-2"><Btn label="Next: Finance →" color="bg-slate-600 hover:bg-slate-500 text-white" onClick={() => scrollToAct(7)} /></div>
        </ActCard>

        {/* ACT 7 */}
        <ActCard n={7} persona="Sandra Park" role="Finance Manager — locking financials and reconciling the closed trip" color="bg-teal-700" borderColor="border-teal-500" badge="Finance">
          <p className="text-sm text-slate-400">Trip is COMPLETED with adjustments applied. Sandra closes it — all figures lock, ledger records <code>TRIP_CLOSED</code>.</p>
          {stepRow("Close the trip — COMPLETED → CLOSED, all financials locked permanently", <Btn label="Execute: PUT /close-trip" color="bg-teal-700 hover:bg-teal-600 text-white" onClick={() => callApi("close-trip", "PUT", "/dispatch/close-trip", { trip_id: tripId, closed_by: "sandra@goldravenia.com" })} />, "close-trip")}
          {stepRow("View Owner Console Reports — trip shows CLOSED with final figures", <Btn label="Open Owner Console → Reports →" color="bg-teal-700 hover:bg-teal-600 text-white" onClick={() => openUrl(`${urls.admin}/owner-console`)} />)}
          {stepRow("View James's final payout — reflects all 4 adjustments", <Btn label="Open Driver Earnings →" color="bg-teal-700 hover:bg-teal-600 text-white" onClick={() => openUrl(`${urls.driver}/earnings`)} />)}
          <div className="bg-teal-950 border border-teal-700 rounded p-3 text-xs text-teal-200 space-y-1">
            <div className="font-bold text-teal-100 mb-1">Expected reconciliation breakdown:</div>
            <div>Quoted fare: <span className="text-white">$45.00</span></div>
            <div>+ Extra stop: <span className="text-white">$3.00</span> | Mess fee: <span className="text-white">$250.00</span> | Route dev: <span className="text-white">$9.00</span> | Min-wage: <span className="text-white">$21.00</span></div>
            <div>= Final fare: <span className="text-amber-300 font-bold">$328.00</span></div>
            <div>Platform fee (5.75% + $1.00): <span className="text-white">~$19.86</span></div>
            <div>Driver payout: <span className="text-green-300 font-bold">~$308.14</span></div>
          </div>
          <div className="flex justify-end pt-2"><Btn label="Next: Bonus Acts →" color="bg-slate-600 hover:bg-slate-500 text-white" onClick={() => scrollToAct(8)} /></div>
        </ActCard>

        {/* BONUS */}
        <ActCard n={8} persona="Bob Martinez" role="Bonus: Late cancellation + post-trip rider features" color="bg-pink-700" borderColor="border-pink-500" badge="Bonus">
          <p className="text-sm text-slate-400">Bob books a ride, driver accepts, then Bob cancels — triggering a cancellation fee. Plus explore all post-trip rider features.</p>
          {stepRow("Book Bob's ride (Rider #2)", <Btn label="Execute: dispatch Bob's ride" color="bg-pink-700 hover:bg-pink-600 text-white" onClick={async () => { const d = await callApi("cancel-dispatch", "POST", "/dispatch/dispatch-ride", { rider_id: RIDER_2, rider_name: "Bob TestRider-T1", rider_phone: "+13125550102", pickup: { address: "400 N Michigan Ave", lat: 41.8902, lng: -87.6244 }, dropoff: { address: "Midway Airport", lat: 41.7868, lng: -87.7522 }, category: "black_sedan", estimated_fare: 3500 }); if (d?.trip_id) setCancelId(d.trip_id); }} />, "cancel-dispatch")}
          {stepRow("Driver #2 accepts", <Btn label="Execute: accept-trip (driver #2)" color="bg-pink-700 hover:bg-pink-600 text-white" onClick={() => callApi("cancel-accept", "PUT", "/dispatch/accept-trip", { trip_id: cancelId, driver_id: DRIVER_2 })} />, "cancel-accept")}
          {stepRow("Bob cancels after driver assigned — triggers $9.50 late-cancel fee", <Btn label="Execute: cancel-trip" color="bg-pink-700 hover:bg-pink-600 text-white" onClick={() => callApi("cancel-trip", "PUT", "/dispatch/cancel-trip", { trip_id: cancelId, cancelled_by: "rider", reason: "Changed plans" })} />, "cancel-trip")}
          <div className="border-t border-slate-600 pt-3 mt-1">
            <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Post-Trip Rider Features</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                ["⭐ Rate Driver (5 stars + tags)", `${urls.rider}/rate/TRIP_ID`],
                ["💬 PII-Masked Chat", `${urls.rider}/messages/TRIP_ID`],
                ["🔀 Split Pay", `${urls.rider}/split-pay/TRIP_ID`],
                ["📋 Ride History + Receipts", `${urls.rider}/history`],
                ["🕒 Schedule a Future Ride", `${urls.rider}/book/scheduled`],
                ["⏱️ Hourly Chauffeur (2-12h)", `${urls.rider}/book/hourly`],
                ["🆘 File a Support Dispute", `${urls.rider}/support`],
                ["🔒 GDPR/CCPA Consent + DSAR", `${urls.rider}/consent`],
              ].map(([label, url]) => (
                <React.Fragment key={label as string}>
                  {stepRow(label as string, <Btn label="Open →" color="bg-pink-700 hover:bg-pink-600 text-white" onClick={() => openUrl((url as string).replace("TRIP_ID", tripId || "demo"))} />)}
                </React.Fragment>
              ))}
            </div>
          </div>
        </ActCard>

        {/* Footer */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mt-2 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <div className="font-bold text-white text-lg mb-1">Walkthrough Complete</div>
          <div className="text-slate-400 text-sm mb-4">Full ride lifecycle: Prospect → ToS → Booking → Drive → 4 Adjustments → Close. All real API calls, real DB writes, real financial reconciliation.</div>
          <div className="flex flex-wrap justify-center gap-3">
            <Btn label="View All Tenants in Platform Admin" color="bg-red-700 hover:bg-red-600 text-white" onClick={() => openUrl(`${urls.admin}/platform-admin`)} />
            <Btn label="Open Swagger API Docs" color="bg-slate-600 hover:bg-slate-500 text-white" onClick={() => openUrl(`${urls.gateway}/api`)} />
            <Btn label="Run Full Simulation (all 10 tenants)" color="bg-amber-600 hover:bg-amber-500 text-white" onClick={runAllApiSteps} />
          </div>
        </div>
      </div>
    </div>
  );
}
