# UrWayDispatch — Staging Walkthrough (Clickable Role-Based Demo)

> **Purpose**: Leadership demo guide. Act as each persona in sequence, clicking
> real links to experience the full ride lifecycle from prospect to financial close.
>
> **Last updated**: 2026-03-05
>
> **Time to complete**: ~20 minutes for the full walkthrough

---

## Quick Start: Launch All Apps

Open **4 terminal windows** and run these commands. Each app starts in ~5 seconds:

```bash
# Terminal 1 — Gateway API (port 3000)
cd services/gateway && npm run start:dev

# Terminal 2 — Admin Portal (port 4400)
cd apps/admin-portal && npm run dev

# Terminal 3 — Rider App (port 5173)
cd apps/rider-app && npm run dev

# Terminal 4 — Driver App (port 5174)
cd apps/driver-app && npm run dev
```

> **Staging alternative**: If Cloud Run is deployed, replace `localhost:3000` with
> your staging URL throughout. The admin portal, rider, and driver apps can point
> to staging by setting `NEXT_PUBLIC_API_BASE_URL` / `VITE_API_BASE_URL`.

---

## App URLs at a Glance

| App | Local URL | What It Is |
| --- | --------- | ---------- |
| **Swagger API Explorer** | [http://localhost:3000/api](http://localhost:3000/api) | Interactive API docs — click "Try it out" on any endpoint |
| **Admin Portal — Home** | [http://localhost:4400](http://localhost:4400) | Gateway health check + navigation hub |
| **Admin Portal — Platform Admin** | [http://localhost:4400/platform-admin](http://localhost:4400/platform-admin) | UWD super-admin: all tenants, system health, kill switch |
| **Admin Portal — Ops Console** | [http://localhost:4400/ops-console](http://localhost:4400/ops-console) | Live trips table, driver status grid, alerts |
| **Admin Portal — Owner Console** | [http://localhost:4400/owner-console](http://localhost:4400/owner-console) | Tenant owner: branding, fleet, pricing, drivers, reports |
| **Rider App — Home** | [http://localhost:5173](http://localhost:5173) | Rider booking hub: on-demand, scheduled, hourly |
| **Rider App — Book a Ride** | [http://localhost:5173/book](http://localhost:5173/book) | Pickup/dropoff, vehicle category, fare estimate |
| **Rider App — Scheduled** | [http://localhost:5173/book/scheduled](http://localhost:5173/book/scheduled) | Future ride: date/time picker, vehicle category |
| **Rider App — Hourly** | [http://localhost:5173/book/hourly](http://localhost:5173/book/hourly) | 2-12 hour chauffeur booking |
| **Rider App — Ride History** | [http://localhost:5173/history](http://localhost:5173/history) | Past trips with receipts and rate link |
| **Rider App — Support** | [http://localhost:5173/support](http://localhost:5173/support) | Dispute filing and tracking |
| **Rider App — Consent/Privacy** | [http://localhost:5173/consent](http://localhost:5173/consent) | GDPR/CCPA toggles, DSAR export/delete |
| **Rider App — Profile** | [http://localhost:5173/profile](http://localhost:5173/profile) | Edit profile, payment methods, account |
| **Driver App — Login** | [http://localhost:5174/auth](http://localhost:5174/auth) | Driver sign-in |
| **Driver App — Onboarding** | [http://localhost:5174/onboarding](http://localhost:5174/onboarding) | Driver document upload, vehicle info, ToS |
| **Driver App — Dashboard** | [http://localhost:5174](http://localhost:5174) | Online/offline toggle, ride offers, stats |
| **Driver App — Active Trip** | [http://localhost:5174/trip](http://localhost:5174/trip) | Live trip: pickup → ride → dropoff, wait timer |
| **Driver App — Earnings** | [http://localhost:5174/earnings](http://localhost:5174/earnings) | Today/week/month breakdown, trip-by-trip detail |
| **Driver App — Scheduled Rides** | [http://localhost:5174/scheduled-rides](http://localhost:5174/scheduled-rides) | Upcoming confirmed rides, confirm/decline |
| **Driver App — Airport Queue** | [http://localhost:5174/airport-queue](http://localhost:5174/airport-queue) | ORD/MDW queue position, estimated wait |
| **Driver App — Fleet Owner** | [http://localhost:5174/fleet](http://localhost:5174/fleet) | Manage vehicles and assigned drivers |
| **Driver App — Messages** | [http://localhost:5174/messages](http://localhost:5174/messages) | In-trip PII-masked chat with rider |
| **Driver App — Profile** | [http://localhost:5174/profile](http://localhost:5174/profile) | Driver settings, documents, vehicle |
| **Public Website — Home** | [http://localhost:3000/public/index.html](http://localhost:3000/public/index.html) | Marketing landing page |
| **Public Website — About** | [http://localhost:3000/public/about.html](http://localhost:3000/public/about.html) | Company story |
| **Public Website — Services** | [http://localhost:3000/public/services.html](http://localhost:3000/public/services.html) | Service verticals |
| **Public Website — For Operators** | [http://localhost:3000/public/for-operators.html](http://localhost:3000/public/for-operators.html) | TNC operator lead capture form |
| **Public Website — Fleet** | [http://localhost:3000/public/fleet.html](http://localhost:3000/public/fleet.html) | Fleet management overview |
| **Public Website — Pricing** | [http://localhost:3000/public/pricing.html](http://localhost:3000/public/pricing.html) | Plans: Starter / Professional / Enterprise |
| **Public Website — Safety** | [http://localhost:3000/public/safety.html](http://localhost:3000/public/safety.html) | Safety standards and background checks |
| **Public Website — FAQ** | [http://localhost:3000/public/faq.html](http://localhost:3000/public/faq.html) | Common questions |
| **Public Website — Contact** | [http://localhost:3000/public/contact.html](http://localhost:3000/public/contact.html) | Contact form |
| **Public Website — Terms** | [http://localhost:3000/public/terms.html](http://localhost:3000/public/terms.html) | Legal terms of service |
| **Public Website — Privacy** | [http://localhost:3000/public/privacy.html](http://localhost:3000/public/privacy.html) | Privacy policy |

---

## Test Tenants (Pre-Seeded)

| # | Tenant | Vertical | Min Wage | Mess Fee | Extra Stop | Category |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **GoldRavenia** | Luxury Black Car | $18/hr | $250 | $3.00 | black_sedan |
| 2 | **BlackRavenia** | Premium SUV | $16/hr | $150 | $3.00 | black_suv |
| 3 | SilverPeak | Executive Chauffeur | $20/hr | $300 | $4.00 | black_sedan |
| 4 | MetroFleet | Standard Rideshare | $15/hr | $75 | $2.00 | standard |
| 5 | NightOwl | Late-Night | $17/hr | $200 | $2.00 | standard |
| 6 | AeroTransit | Airport Specialist | $16/hr | $100 | $2.50 | black_sedan |
| 7 | CorporateRide | B2B Corporate | $18/hr | $200 | $3.00 | black_sedan |
| 8 | GreenWave | EV-Only Eco | $15/hr | $75 | $1.50 | standard |
| 9 | LegacyLuxe | Premium 24/7 | $22/hr | $350 | $5.00 | premium |
| 10 | UrbanRush | Budget Volume | $15/hr | $50 | $1.50 | standard |

Each tenant has **25 drivers** (online, GPS-positioned in Chicago) and **10 riders** pre-seeded.

---

## The Walkthrough: 7 Personas, 1 Ride Lifecycle

> Follow these in order. Each section tells you **who you are**, **what link to click**,
> and **what you'll see**. The demo tenant is **GoldRavenia** (Luxury Black Car).

---

### ACT 1: The Prospect (TNC Operator Shopping for Software)

**You are**: Marcus, owner of a Chicago black-car fleet. You found UrWayDispatch online.

| Step | Action | Click This Link |
| --- | --- | --- |
| 1.1 | Browse the marketing site | [Public Website — Home](http://localhost:3000/public/index.html) |
| 1.2 | Read about services offered | [Services Page](http://localhost:3000/public/services.html) |
| 1.3 | Check pricing plans | [Pricing Page](http://localhost:3000/public/pricing.html) |
| 1.4 | Read the operator pitch | [For Operators](http://localhost:3000/public/for-operators.html) |
| 1.5 | Submit the lead capture form | Fill out the form on [For Operators](http://localhost:3000/public/for-operators.html) and click Submit |
| 1.6 | Review safety standards | [Safety Page](http://localhost:3000/public/safety.html) |
| 1.7 | Check FAQ | [FAQ Page](http://localhost:3000/public/faq.html) |

**What you see**: A polished marketing site with Tailwind styling, SEO meta tags, responsive nav/footer. The lead form POSTs to the real `/leads` API endpoint.

---

### ACT 2: The UWD Platform Administrator (Onboarding GoldRavenia)

**You are**: Janet, UWD's platform ops lead. Marcus signed up. You're onboarding his tenant.

| Step | Action | Click This Link |
| --- | --- | --- |
| 2.1 | Open Platform Admin | [Platform Admin Console](http://localhost:4400/platform-admin) |
| 2.2 | See all 10 tenants listed | Scroll the Tenants table — GoldRavenia shows `active` status |
| 2.3 | Check system health | Click "System Health" section — API status indicator |
| 2.4 | Accept ToS on GoldRavenia's behalf | Open [Swagger → POST /onboarding/terms/accept](http://localhost:3000/api#/onboarding/OnboardingController_acceptTerms) — click **Try it out**, set `x-tenant-id: a1b2c3d4-0001-4000-8000-000000000001`, body: `{"accepted_by": "admin@goldravenia.com"}`, click **Execute** |
| 2.5 | Verify ToS status | [Swagger → GET /onboarding/terms/status](http://localhost:3000/api#/onboarding/OnboardingController_termsStatus) — Try it out with same tenant ID |

**What you see**: Platform Admin shows all 10 tenants with real DB counts. Swagger returns `{ "accepted": true }`.

---

### ACT 3: The Tenant Owner (Marcus Configures GoldRavenia)

**You are**: Marcus, GoldRavenia owner. Your tenant is active. You're configuring your operation.

| Step | Action | Click This Link |
| --- | --- | --- |
| 3.1 | Open Owner Console | [Owner Console](http://localhost:4400/owner-console) |
| 3.2 | Review dashboard KPIs | See revenue, trips, active drivers cards |
| 3.3 | Click "Branding" tab | Configure colors (#b8960c gold, #1a1a2e navy), upload logo |
| 3.4 | Click "Pricing" tab | View base fare ($8.00), per-mile ($2.50), per-min ($0.45), mess fee ($250), min wage ($18/hr) |
| 3.5 | Click "Drivers" tab | See 25 pre-seeded drivers with online status |
| 3.6 | Click "Fleet" tab | See 25 vehicles (Lincoln Continentals, black_sedan category) |
| 3.7 | Click "Reports" tab | Empty until rides are completed — will populate after Act 6 |

**What you see**: A 6-tab owner dashboard reading real data from the GoldRavenia tenant scope.

---

### ACT 4: The Rider (Alice Books a Ride on GoldRavenia)

**You are**: Alice, a rider using GoldRavenia's branded app.

| Step | Action | Click This Link |
| --- | --- | --- |
| 4.1 | Open rider home | [Rider App — Home](http://localhost:5173) |
| 4.2 | Tap "Book a Ride" | [Book a Ride](http://localhost:5173/book) |
| 4.3 | Enter pickup: Willis Tower | Type "233 S Wacker Dr" in pickup field |
| 4.4 | Enter dropoff: O'Hare | Type "O'Hare Terminal 1" in dropoff field |
| 4.5 | Select vehicle: Black Sedan | Click the black_sedan card |
| 4.6 | See fare estimate | $45.00 estimated fare displayed |
| 4.7 | Tap "Request Ride" | Ride is dispatched — the API creates the trip and sends offers to nearby drivers |
| 4.8 | **API equivalent** (Swagger) | [Swagger → POST /dispatch/dispatch-ride](http://localhost:3000/api#/dispatch/DispatchController_dispatchRide) — Try it out with GoldRavenia tenant ID, body below |

**Swagger body for Step 4.8** (paste into Swagger "Try it out"):

```json
{
  "rider_id": "r0000000-0001-4000-8000-000000000001",
  "rider_name": "Alice TestRider-T1",
  "rider_phone": "+13125550101",
  "pickup": { "address": "233 S Wacker Dr (Willis Tower)", "lat": 41.8789, "lng": -87.6359 },
  "dropoff": { "address": "O'Hare Terminal 1", "lat": 41.9742, "lng": -87.9073 },
  "category": "black_sedan",
  "estimated_fare": 4500
}
```

> **Save the `trip_id` from the response** — you'll use it in every subsequent act.

**What you see**: Rider app shows booking form with vehicle categories. Swagger returns `{ "success": true, "trip_id": "<UUID>" }`.

---

### ACT 5: The Driver (James Accepts and Drives the Trip)

**You are**: James Kim, GoldRavenia driver #1. You just got a ride offer.

| Step | Action | Click This Link |
| --- | --- | --- |
| 5.1 | Open driver dashboard | [Driver Dashboard](http://localhost:5174) |
| 5.2 | See the incoming ride offer | Offer card shows: Willis Tower → O'Hare, $45.00, black_sedan |
| 5.3 | Tap "Accept" | **API equivalent**: [Swagger → PUT /dispatch/accept-trip](http://localhost:3000/api#/dispatch/DispatchController_acceptTrip) — body: `{ "trip_id": "<TRIP_ID>", "driver_id": "d0000000-0001-4000-8000-0000000001" }` |
| 5.4 | Navigate to pickup | [Active Trip View](http://localhost:5174/trip) — shows "En Route to Pickup", address, ETA |
| 5.5 | Arrive at pickup → Tap "Arrived" | Trip status changes to "Waiting for Rider" |
| 5.6 | Rider enters → Tap "Start Trip" | **API**: [Swagger → PUT /dispatch/start-trip](http://localhost:3000/api#/dispatch/DispatchController_startTrip) — body: `{ "trip_id": "<TRIP_ID>" }` |
| 5.7 | Drive to O'Hare | Trip view shows: "In Progress", real-time duration counter |
| 5.8 | Arrive at O'Hare → Tap "Complete Trip" | **API**: [Swagger → PUT /dispatch/complete-trip](http://localhost:3000/api#/dispatch/DispatchController_completeTrip) — body: `{ "trip_id": "<TRIP_ID>" }` |
| 5.9 | View earnings | [Earnings Page](http://localhost:5174/earnings) — trip appears in today's earnings |

**What you see**: Driver app shows the full trip FSM (assigned → en route → waiting → active → completed). Swagger confirms each state transition.

---

### ACT 6: The Ops Manager (Applies Mid-Trip Adjustments)

**You are**: Janet again, watching live ops. The rider added a stop and left a mess.

| Step | Action | Click This Link |
| --- | --- | --- |
| 6.1 | Open Ops Console | [Ops Console](http://localhost:4400/ops-console) |
| 6.2 | Find the trip in the live table | Trip row shows: Alice → James, Willis Tower → O'Hare, status: `completed` |
| 6.3 | Apply extra stop adjustment | [Swagger → POST /dispatch/adjust-trip](http://localhost:3000/api#/dispatch/DispatchController_adjustTrip) — body below |
| 6.4 | Apply mess fee | Same endpoint, different adjustment type |
| 6.5 | Apply route deviation | Same endpoint, percentage auto-calculated from tenant policy |
| 6.6 | Check min-wage floor | Same endpoint — system auto-calculates if driver earned below $18/hr |

**Swagger body for Step 6.3** (extra stop):

```json
{
  "trip_id": "<TRIP_ID>",
  "adjustments": [{
    "type": "extra_stop",
    "description": "Rider added stop at Starbucks on N State St"
  }]
}
```

**Swagger body for Step 6.4** (mess fee — rider vomited):

```json
{
  "trip_id": "<TRIP_ID>",
  "adjustments": [{
    "type": "mess_fee",
    "description": "Rider vomited in back seat — interior cleaning required"
  }]
}
```

**Swagger body for Step 6.5** (route deviation):

```json
{
  "trip_id": "<TRIP_ID>",
  "adjustments": [{
    "type": "route_deviation",
    "description": "Driver took longer route via Lake Shore Drive due to construction"
  }]
}
```

**Swagger body for Step 6.6** (min-wage supplement):

```json
{
  "trip_id": "<TRIP_ID>",
  "adjustments": [{
    "type": "min_wage_supplement",
    "description": "Driver hourly below GoldRavenia $18/hr floor due to traffic"
  }]
}
```

> Each adjustment auto-resolves `amount_cents` from GoldRavenia's pricing policy.
> Swagger response shows the new cumulative fare after each adjustment.

**What you see**: Ops console shows the trip with updated fare. Each Swagger call returns `{ "success": true, "new_fare_cents": <updated> }`.

---

### ACT 7: The Finance Manager (Closes the Trip and Reconciles)

**You are**: Sandra, GoldRavenia's finance lead. The trip is done, adjustments applied. Time to close.

| Step | Action | Click This Link |
| --- | --- | --- |
| 7.1 | Close the trip (lock all financials) | [Swagger → PUT /dispatch/close-trip](http://localhost:3000/api#/dispatch/DispatchController_closeTrip) — body: `{ "trip_id": "<TRIP_ID>", "closed_by": "sandra@goldravenia.com" }` |
| 7.2 | Review the reconciliation response | Swagger returns the full financial breakdown (see below) |
| 7.3 | View daily reconciliation report | [Swagger → GET /admin/payouts/{tenantId}/reconciliation](http://localhost:3000/api#/admin/PayoutController_getDailyReconciliation) — use tenant ID `a1b2c3d4-0001-4000-8000-000000000001` |
| 7.4 | Return to Owner Console → Reports | [Owner Console](http://localhost:4400/owner-console) — click "Reports" tab, trip now shows CLOSED with final figures |
| 7.5 | View driver's updated earnings | [Driver Earnings](http://localhost:5174/earnings) — payout reflects adjustments |

**Expected reconciliation response from Step 7.1**:

```json
{
  "success": true,
  "reconciliation": {
    "trip_id": "...",
    "quoted_fare_cents": 4500,
    "adjustment_total": 28300,
    "final_fare_cents": 32800,
    "platform_fee_cents": 1890,
    "driver_payout_cents": 30910,
    "adjustments": [
      { "adjustment_type": "extra_stop", "amount_cents": 300 },
      { "adjustment_type": "mess_fee", "amount_cents": 25000 },
      { "adjustment_type": "route_deviation", "amount_cents": 900 },
      { "adjustment_type": "min_wage_supplement", "amount_cents": 2100 }
    ],
    "status": "closed",
    "closed_at": "2026-03-05T..."
  }
}
```

**What you see**: The trip is permanently in `closed` status. All financials are locked. The ledger has `TRIP_CLOSED`, `TRIP_ADJUSTMENT_EXTRA_STOP`, `TRIP_ADJUSTMENT_MESS_FEE`, `TRIP_ADJUSTMENT_ROUTE_DEVIATION`, and `TRIP_ADJUSTMENT_MIN_WAGE_SUPPLEMENT` events.

---

### BONUS ACT: Rider Cancels a Trip (Cancellation Fee)

**You are**: Bob (rider #2). You booked a ride but changed your mind after driver was assigned.

| Step | Action | Click This Link |
| --- | --- | --- |
| B.1 | Book a new ride | [Swagger → POST /dispatch/dispatch-ride](http://localhost:3000/api#/dispatch/DispatchController_dispatchRide) — same body as Act 4 but with `rider_id: "r0000000-0001-4000-8000-000000000002"` |
| B.2 | Driver accepts | [Swagger → PUT /dispatch/accept-trip](http://localhost:3000/api#/dispatch/DispatchController_acceptTrip) — use driver #2: `d0000000-0001-4000-8000-0000000002` |
| B.3 | Bob cancels | [Swagger → PUT /dispatch/cancel-trip](http://localhost:3000/api#/dispatch/DispatchController_cancelTrip) — body: `{ "trip_id": "<NEW_TRIP_ID>", "cancelled_by": "rider", "reason": "Changed plans" }` |

**Expected**: `{ "success": true, "cancellationFeeCents": 950, "message": "Trip cancelled. Cancellation fee: $9.50 USD." }`

---

### BONUS ACT: Additional Rider Features

**You are**: Alice again. After your trip, you explore other features.

| Step | Action | Click This Link |
| --- | --- | --- |
| C.1 | View ride history | [Ride History](http://localhost:5173/history) |
| C.2 | Rate the driver (5 stars) | [Rate Trip](http://localhost:5173/rate/TRIP_ID) (replace TRIP_ID) |
| C.3 | Message the driver | [Trip Messages](http://localhost:5173/messages/TRIP_ID) — PII-masked chat |
| C.4 | Split the fare with a friend | [Split Pay](http://localhost:5173/split-pay/TRIP_ID) — equal/percentage/custom |
| C.5 | File a support dispute | [Support](http://localhost:5173/support) — create/track disputes |
| C.6 | Book an hourly chauffeur | [Hourly Booking](http://localhost:5173/book/hourly) — 2-12 hour slider |
| C.7 | Schedule a future ride | [Scheduled Booking](http://localhost:5173/book/scheduled) — date/time picker |
| C.8 | Manage privacy/consent | [Consent & Privacy](http://localhost:5173/consent) — GDPR toggles, DSAR |

---

## Automated Simulation (All 10 Tenants at Once)

Run the full lifecycle for all 10 tenants (40 transactions) with one command:

```bash
STAGING_API_URL=http://localhost:3000 AUTH_TOKEN=test npx tsx scripts/simulate-full-lifecycle.ts
```

This exercises Acts 2-7 programmatically for every tenant and prints a pass/fail summary.

---

## Swagger Quick-Reference (All API Sections)

Open [http://localhost:3000/api](http://localhost:3000/api) and expand each section:

| Swagger Section | Key Endpoints | Persona |
| --- | --- | --- |
| **onboarding** | GET /terms, POST /terms/accept, GET /terms/status | Platform Admin |
| **dispatch** | POST /dispatch-ride, PUT /accept-trip, PUT /start-trip, PUT /complete-trip, POST /adjust-trip, PUT /close-trip, PUT /cancel-trip | Rider, Driver, Ops |
| **driver** | GET /offers, POST /offers/:id/respond, GET /earnings | Driver |
| **rider** | POST /disputes, GET /consent, POST /dsar | Rider |
| **admin** | GET /payouts/:tenantId/reconciliation | Finance |
| **corporate** | POST /accounts, POST /employees, POST /trip-approvals | Corporate Admin |
| **compliance** | GET /background-check, GET /disclosures | Compliance |
| **policy** | GET /pricing-policies, GET /jurisdiction-templates | Tenant Owner |
| **tenant** | GET /tenants, PUT /tenants/:id | Platform Admin |

---

## Verification Queries (Supabase SQL Editor)

Paste these into [Supabase SQL Editor](https://supabase.com/dashboard) to verify real data:

### All closed trips with adjustment breakdown

```sql
SELECT * FROM v_closed_trips_audit ORDER BY closed_at DESC LIMIT 20;
```

### Adjustment totals per tenant

```sql
SELECT t.name, a.adjustment_type, COUNT(*), SUM(a.amount_cents) as total_cents
FROM trip_adjustments a
JOIN tenants t ON t.id = a.tenant_id
GROUP BY t.name, a.adjustment_type
ORDER BY t.name, a.adjustment_type;
```

### Full ledger audit trail for a specific trip

```sql
SELECT event_type, fare_cents, metadata, created_at
FROM ledger_events
WHERE trip_id = '<TRIP_ID>'
ORDER BY created_at;
```

### Platform revenue summary across all tenants

```sql
SELECT t.name,
       COUNT(*) as trips,
       SUM(tr.final_fare_cents) as total_fare,
       SUM(tr.commission_cents) as platform_revenue,
       SUM(tr.net_payout_cents) as driver_payouts
FROM trips tr
JOIN tenants t ON t.id = tr.tenant_id
WHERE tr.status = 'closed'
GROUP BY t.name
ORDER BY total_fare DESC;
```

---

## Summary: What's Real vs. Placeholder

| Feature | Status | Where to See It |
| --- | --- | --- |
| 10 test tenants in database | **Real** | Platform Admin, Supabase |
| 250 drivers with GPS positions | **Real** | Owner Console → Drivers, Supabase |
| Ride booking + dispatch | **Real** | Rider App → Book, Swagger |
| Atomic driver assignment (no double-assign) | **Real** | Swagger accept-trip |
| Trip state machine (requested→assigned→active→completed→closed) | **Real** | Swagger, Ops Console |
| Mid-trip adjustments (extra stop, mess fee, route deviation, min-wage) | **Real** | Swagger adjust-trip |
| Financial reconciliation + close | **Real** | Swagger close-trip |
| Ledger audit trail | **Real** | Supabase SQL: ledger_events |
| Cancellation fees | **Real** | Swagger cancel-trip |
| ToS acceptance gate | **Real** | Swagger /onboarding |
| Tenant pricing policies (per-tenant rates) | **Real** | Supabase: tenant_pricing_policies |
| RLS tenant isolation | **Real** | Each API call scoped by x-tenant-id |
| Rider/driver web UIs | **Real** | localhost:5173, localhost:5174 |
| Admin consoles (ops, owner, platform) | **Real** | localhost:4400 |
| Public marketing website (10 pages) | **Real** | localhost:3000/public/ |
| Map tiles (Mapbox/Google) | Placeholder | Rider/Driver/Ops map areas |
| Payment processing (FluidPay live charge) | Stubbed | Ledger records, no live card charge |
| Push notifications (FCM) | Stubbed | Requires Firebase setup |
