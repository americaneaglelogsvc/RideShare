# UrWayDispatch — Staging Walkthrough

> **Purpose**: Step-by-step guide for project leadership to view and verify the
> complete ride lifecycle across all 10 test tenants on the staging environment.
>
> **Last updated**: 2026-03-05

---

## Prerequisites

| Item | Value |
|------|-------|
| Staging API URL | `https://urway-api-staging-XXXXXXXXXX.run.app` (from Cloud Run) |
| Auth Token | Service-role JWT or staging test token |
| Supabase Dashboard | `https://supabase.com/dashboard/project/<PROJECT_REF>` |
| GCP Console | `https://console.cloud.google.com/run?project=rideoo-487904` |

---

## Test Tenants

| # | Tenant | Domain | Vertical | Category | Drivers | Riders |
|---|--------|--------|----------|----------|---------|--------|
| 1 | **GoldRavenia** | goldravenia.com | Luxury Black Car | black_sedan | 25 | 10 |
| 2 | **BlackRavenia** | blackravenia.com | Premium SUV | black_suv | 25 | 10 |
| 3 | SilverPeak | silverpeak.com | Executive Chauffeur | black_sedan | 25 | 10 |
| 4 | MetroFleet | metrofleet.com | Standard Rideshare | standard | 25 | 10 |
| 5 | NightOwl | nightowlrides.com | Late-Night | standard | 25 | 10 |
| 6 | AeroTransit | aerotransit.com | Airport Specialist | black_sedan | 25 | 10 |
| 7 | CorporateRide | corporateride.com | B2B Corporate | black_sedan | 25 | 10 |
| 8 | GreenWave | greenwaveev.com | EV-Only Eco | standard | 25 | 10 |
| 9 | LegacyLuxe | legacyluxe.com | Premium 24/7 | premium | 25 | 10 |
| 10 | UrbanRush | urbanrush.com | Budget Volume | standard | 25 | 10 |

---

## Full Ride Lifecycle (Step-by-Step)

Replace `$API` with your staging URL and `$TOKEN` with your auth token.

### Step 1: Accept Platform Terms of Service

```bash
curl -s -X POST "$API/onboarding/terms/accept" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: a1b2c3d4-0001-4000-8000-000000000001" \
  -d '{"accepted_by": "admin@goldravenia.com"}'
```

**Expected**: `{ "success": true, "terms_version": "v1.0.0", "accepted_at": "..." }`

### Step 2: Rider Books a Ride

```bash
curl -s -X POST "$API/dispatch/dispatch-ride" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: a1b2c3d4-0001-4000-8000-000000000001" \
  -d '{
    "rider_id": "r0000000-0001-4000-8000-000000000001",
    "rider_name": "Alice TestRider-T1",
    "rider_phone": "+13125550101",
    "pickup": { "address": "233 S Wacker Dr (Willis Tower)", "lat": 41.8789, "lng": -87.6359 },
    "dropoff": { "address": "O'\''Hare Terminal 1", "lat": 41.9742, "lng": -87.9073 },
    "category": "black_sedan",
    "estimated_fare": 4500
  }'
```

**Expected**: `{ "success": true, "trip_id": "<UUID>" }`

> Save the `trip_id` — you'll use it in every subsequent step.

### Step 3: Driver Accepts Trip

```bash
TRIP_ID="<trip_id from step 2>"
curl -s -X PUT "$API/dispatch/accept-trip" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: a1b2c3d4-0001-4000-8000-000000000001" \
  -d "{\"trip_id\": \"$TRIP_ID\", \"driver_id\": \"d0000000-0001-4000-8000-0000000001\"}"
```

**Expected**: `{ "success": true, "trip": { "status": "assigned", ... } }`

### Step 4: Driver Picks Up Passenger (Start Trip)

```bash
curl -s -X PUT "$API/dispatch/start-trip" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: a1b2c3d4-0001-4000-8000-000000000001" \
  -d "{\"trip_id\": \"$TRIP_ID\"}"
```

**Expected**: `{ "success": true, "trip": { "status": "active", ... } }`

### Step 5: Mid-Trip Adjustment — Extra Stop

```bash
curl -s -X POST "$API/dispatch/adjust-trip" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: a1b2c3d4-0001-4000-8000-000000000001" \
  -d "{
    \"trip_id\": \"$TRIP_ID\",
    \"adjustments\": [{
      \"type\": \"extra_stop\",
      \"description\": \"Rider added stop at Starbucks on N State St\"
    }]
  }"
```

**Expected**: `{ "success": true, "new_fare_cents": <original + extra_stop_fee>, "adjustments": [...] }`

> The `amount_cents` is auto-resolved from the tenant's pricing policy.
> GoldRavenia: extra_stop = $3.00, mess_fee = $250.00, damage_fee = $300.00

### Step 5b: Mess/Damage Fee (Rider left mess in vehicle)

```bash
curl -s -X POST "$API/dispatch/adjust-trip" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: a1b2c3d4-0001-4000-8000-000000000001" \
  -d "{
    \"trip_id\": \"$TRIP_ID\",
    \"adjustments\": [{
      \"type\": \"mess_fee\",
      \"description\": \"Rider vomited in back seat — interior cleaning required\"
    }]
  }"
```

### Step 6: Driver Drops Off Passenger (Complete Trip)

```bash
curl -s -X PUT "$API/dispatch/complete-trip" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: a1b2c3d4-0001-4000-8000-000000000001" \
  -d "{\"trip_id\": \"$TRIP_ID\"}"
```

**Expected**: `{ "success": true, "trip": { "status": "completed", "net_payout_cents": ..., "commission_cents": ... } }`

### Step 7: Financial Reconciliation — Close Trip

```bash
curl -s -X PUT "$API/dispatch/close-trip" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: a1b2c3d4-0001-4000-8000-000000000001" \
  -d "{\"trip_id\": \"$TRIP_ID\", \"closed_by\": \"admin@goldravenia.com\"}"
```

**Expected**:
```json
{
  "success": true,
  "reconciliation": {
    "trip_id": "...",
    "quoted_fare_cents": 4500,
    "adjustment_total": 28000,
    "final_fare_cents": 32500,
    "platform_fee_cents": 1875,
    "driver_payout_cents": 30625,
    "adjustments": [...],
    "status": "closed",
    "closed_at": "2026-03-05T..."
  }
}
```

> **This is the final reconciliation.** The trip is now in `closed` status.
> All financial figures are locked. The ledger has a `TRIP_CLOSED` event.

### Step 8: Cancellation Test

```bash
# Book another ride
curl -s -X POST "$API/dispatch/dispatch-ride" ...
# Accept it
curl -s -X PUT "$API/dispatch/accept-trip" ...
# Then cancel as rider (triggers late-cancel fee)
curl -s -X PUT "$API/dispatch/cancel-trip" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: a1b2c3d4-0001-4000-8000-000000000001" \
  -d "{\"trip_id\": \"$TRIP_ID\", \"cancelled_by\": \"rider\", \"reason\": \"Changed plans\"}"
```

**Expected**: `{ "success": true, "cancellationFeeCents": 950, "message": "Trip cancelled. Cancellation fee: $9.50 USD." }`

---

## Automated Full Simulation (All 10 Tenants)

Run the simulation script to exercise all 10 tenants × 3 rides + 1 cancellation:

```bash
STAGING_API_URL=https://urway-api-staging-XXXXXX.run.app \
AUTH_TOKEN=your-staging-token \
npx tsx scripts/simulate-full-lifecycle.ts
```

Output: 40 transactions, each traced through all states ending in `CLOSED ✅`.

---

## Verification Queries (Supabase SQL Editor)

### All closed trips with adjustments
```sql
SELECT * FROM v_closed_trips_audit ORDER BY closed_at DESC LIMIT 20;
```

### Adjustment breakdown by tenant
```sql
SELECT t.name, a.adjustment_type, COUNT(*), SUM(a.amount_cents) as total_cents
FROM trip_adjustments a
JOIN tenants t ON t.id = a.tenant_id
GROUP BY t.name, a.adjustment_type
ORDER BY t.name, a.adjustment_type;
```

### Ledger events for a specific trip
```sql
SELECT event_type, fare_cents, metadata, created_at
FROM ledger_events
WHERE trip_id = '<TRIP_ID>'
ORDER BY created_at;
```

### Platform revenue summary
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

## What Leadership Will See

| View | Source | Data Type |
|------|--------|-----------|
| Platform Admin (`/platform-admin`) | All 10 tenants in DB | **Real** |
| Ops Console (`/ops-console`) | Live trips table | **Real** |
| Owner Console (`/owner-console`) | KPIs from reconciliation API | **Real** |
| Swagger (`/api`) | All endpoints documented | **Real** |
| Simulation output | GitHub Actions job summary | **Real** |
| Map tiles | Rider/Driver/Ops views | ⬜ Placeholder |

> **Note**: Map integration (Mapbox/Google Maps) is the remaining visual gap.
> All business logic, transactions, and financial data are real and DB-backed.
