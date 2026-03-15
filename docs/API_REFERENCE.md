# UrWay Dispatch — API Reference

> **Version:** 4.0 (Wave 4)  
> **Base URL:** `http://localhost:9000` (development) | `https://api.urwaydispatch.com` (production)  
> **Auth:** JWT Bearer token via Supabase Auth

---

## Authentication

All endpoints require a valid JWT unless marked `@Public()`.

### Sign In (Supabase)
```http
POST {SUPABASE_URL}/auth/v1/token?grant_type=password
Content-Type: application/json

{
  "email": "driver1@tenantalpha.com",
  "password": "Password123!"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "..."
}
```

Use the `access_token` as `Authorization: Bearer <token>` on all subsequent requests.

---

## Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <jwt_token>` |
| `x-tenant-id` | Yes | UUID of the tenant (e.g., `11111111-1111-1111-1111-111111111111`) |
| `Content-Type` | Yes | `application/json` |

---

## 🚗 Dispatch — Trip Lifecycle

### Find Available Drivers
```http
POST /dispatch/find-drivers
```
```json
{
  "lat": 41.8781,
  "lng": -87.6298,
  "category": "black_sedan"
}
```
**Response:** `{ success: true, drivers: [...] }`

### Accept Trip
```http
PUT /dispatch/accept-trip
```
```json
{
  "trip_id": "uuid",
  "driver_id": "uuid"
}
```
**Response:** `{ success: true, trip: { id, status: "assigned", ... } }`

### Start Trip
```http
PUT /dispatch/start-trip
```
```json
{ "trip_id": "uuid" }
```
**Response:** `{ success: true, trip: { id, status: "active", ... } }`

### Complete Trip
```http
PUT /dispatch/complete-trip
```
```json
{ "trip_id": "uuid" }
```
**Response:** `{ success: true, trip: { id, status: "completed", ... } }`

### Close Trip
```http
PUT /dispatch/close-trip
```
```json
{ "trip_id": "uuid" }
```
**Response:** `{ success: true, trip: { id, status: "closed", ... } }`

### Cancel Trip
```http
PUT /dispatch/cancel-trip
```
```json
{
  "trip_id": "uuid",
  "cancelled_by": "rider" | "driver" | "system",
  "reason": "optional reason"
}
```

---

## 📡 Real-Time — Server-Sent Events

### Driver SSE Stream
```http
GET /dispatch/realtime/sse/driver/:driverId
```
**Events Emitted:**
- `event: ride-offer` — New ride request with full trip data
- `event: trip-update` — Trip status change

**Example:**
```
event: ride-offer
data: {"type":"new_offer","tripId":"...","pickup":{"address":"...","lat":41.87,"lng":-87.62},"estimatedFare":4500,"netPayout":3600}

event: trip-update
data: {"type":"trip_update","tripId":"...","status":"active"}
```

### Rider SSE Stream
```http
GET /dispatch/realtime/sse/rider/:riderId
```
**Events Emitted:**
- `event: trip-update` — Trip status change with driver info

### Poll Trip (Fallback)
```http
GET /dispatch/realtime/poll/trip/:tripId
```

### Poll Offers (Fallback)
```http
GET /dispatch/realtime/poll/offers/:driverId
```

---

## 💳 Payments

### Process Payment
```http
POST /payments/process
```
```json
{
  "trip_id": "uuid",
  "rider_id": "uuid",
  "tenant_id": "uuid",
  "amount_cents": 4500,
  "payment_method": {
    "type": "card",
    "card": {
      "number": "4111111111111111",
      "exp_month": "12",
      "exp_year": "2027",
      "cvc": "123"
    }
  }
}
```
**Note:** Uses FluidPay gateway. If `FLUIDPAY_API_KEY` is not configured, payments are simulated.

### Process Driver Payout
```http
POST /payments/payout
```
```json
{
  "driver_id": "uuid",
  "tenant_id": "uuid",
  "amount_cents": 3600,
  "bank_account": {
    "account_number": "000123456789",
    "routing_number": "110000000",
    "account_holder_name": "James Wilson",
    "account_type": "checking"
  }
}
```
**Settlement gating:** Payout is only allowed if `BANK_SETTLED` funds >= requested amount (PAY-SETTLE-002).

### Get Payment Status
```http
GET /payments/:paymentId/status
```

### Refund Payment
```http
POST /payments/:paymentId/refund
```
```json
{ "amount": 2000 }
```

### Webhook (FluidPay)
```http
POST /payments/webhook
```
`@Public()` — No JWT required. Validates `fluidpay-signature` header.

---

## 👤 Driver Endpoints

### Get Profile
```http
GET /driver/profile
```

### Update Profile
```http
PUT /driver/profile
```

### Update Status
```http
PUT /driver/status
```
```json
{ "status": "online" | "offline", "location": { "lat": 41.87, "lng": -87.63 } }
```

### Update Location
```http
POST /driver/location
```
```json
{ "lat": 41.87, "lng": -87.63, "heading": 90, "speed": 35 }
```

### Get Dashboard
```http
GET /driver/dashboard
```

### Get Earnings
```http
GET /driver/earnings?period=week
```
**Periods:** `today`, `week`, `month`, `year`

### Get Trip History
```http
GET /driver/trips/history?limit=20&offset=0
```

---

## 💰 Pricing

### Get Quote
```http
POST /pricing/quote
```
```json
{
  "category": "black_sedan",
  "service": "on_demand",
  "pickup": { "lat": 41.87, "lng": -87.63, "address": "..." },
  "dropoff": { "lat": 41.97, "lng": -87.90, "address": "..." }
}
```

---

## 🏢 Admin Endpoints

### Live Trips
```http
GET /admin/trips/live
```

### Alerts
```http
GET /admin/alerts
```

### Driver Statuses
```http
GET /admin/drivers/statuses
```

### Real-time Metrics
```http
GET /admin/metrics/realtime
```

### List Tenants
```http
GET /admin/tenants
```

### Suspend Tenant
```http
POST /admin/tenants/:tenantId/suspend
```

---

## 🔍 Health

### Basic Health
```http
GET /health
```
`@Public()` — No JWT required.

### Detailed Health
```http
GET /health/detailed
```

---

## Error Responses

All errors follow this format:
```json
{
  "statusCode": 400,
  "message": "Descriptive error message",
  "error": "Bad Request"
}
```

| Code | Meaning |
|------|---------|
| 400 | Bad Request — DTO validation failed |
| 401 | Unauthorized — Missing or invalid JWT |
| 403 | Forbidden — Insufficient role permissions |
| 404 | Not Found — Resource doesn't exist |
| 429 | Too Many Requests — Rate limit exceeded |

---

## DTO Validation

All UUIDs are validated with regex `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$` (case-insensitive).

Payloads are validated with `class-validator` via NestJS `ValidationPipe`:
- `whitelist: true` — Unknown properties stripped
- `forbidNonWhitelisted: true` — Unknown properties cause 400
- `transform: true` — Auto-conversion of types

---

## Database Schema Reference

| Table | Purpose |
|-------|---------|
| `tenants` | Multi-tenant root |
| `driver_profiles` | Driver details (tenant-scoped) |
| `drivers` | FK target for trips.driver_id |
| `riders` | Rider accounts (tenant-scoped) |
| `trips` | Core trip records |
| `ride_offers` | Driver offer queue |
| `payments` | Payment transactions |
| `driver_payouts` | Driver payout records |
| `ledger_entries` | Audit trail for all trip events |
| `driver_locations` | Real-time driver positions |
| `tenant_pricing_policies` | Per-category pricing config |
