# UrWay Dispatch — User Manual

> **Version:** 4.0 | **Last Updated:** 2026-03-13

---

## 1. Overview

UrWay Dispatch is a multi-tenant ride dispatch platform for licensed transportation providers. It connects **Riders** with **Drivers** through a real-time dispatch system, complete with pricing, payment processing, and fleet management.

### User Roles

| Role | Description | App |
|------|-------------|-----|
| **Rider** | Books and tracks rides | Rider App |
| **Driver** | Accepts and completes rides | Driver App |
| **Tenant Owner** | Manages fleet and branding | Admin Portal → Owner Console |
| **Dispatch Ops** | Monitors live trips and alerts | Admin Portal → Ops Console |
| **Platform Admin** | Manages all tenants platform-wide | Admin Portal → Platform Admin |

---

## 2. Rider App

### 2.1 Getting Started
1. Open the Rider App in your browser
2. Sign up with your email and password
3. You'll be assigned to your local transportation provider (tenant)

### 2.2 Booking a Ride
1. **Enter Pickup & Dropoff** — Type your addresses or use the map
2. **Passenger Details** — Enter the number of passengers, luggage size, and any special assistance needs
3. **Vehicle Selection** — The system recommends the best vehicle type based on your needs
4. **Review Quote** — See the full price breakdown including base fare, per-mile, per-minute, and booking fee
5. **Confirm Booking** — Your request is dispatched to available drivers

### 2.3 Tracking Your Ride
- After booking, you'll see real-time updates as your trip progresses:
  - **Requested** → Waiting for a driver
  - **Assigned** → Driver accepted, en route to pickup
  - **Active** → Ride in progress
  - **Completed** → Arrived at destination
- Driver name, vehicle details, and ETA are shown once a driver accepts

### 2.4 Ride History
- View all past trips with pickup/dropoff, fare, and driver info
- Each trip shows the route, duration, and fare breakdown

### 2.5 Support
- Access the FAQ section from the main menu
- Contact your local provider for trip-specific issues

---

## 3. Driver App

### 3.1 Getting Started
1. Open the Driver App
2. Log in with your credentials (provided by your fleet operator)
3. Your profile, vehicle info, and documents are pre-configured by your operator

### 3.2 Going Online
1. From the **Dashboard**, tap **Go Online**
2. The app begins listening for ride offers via real-time connection
3. Your location is shared with the dispatch system

### 3.3 Destination Mode
- Toggle **Destination Mode** to only receive rides heading in your direction
- Enter your destination address — the system filters offers accordingly

### 3.4 Accepting a Ride
1. When a new ride offer appears, you'll see:
   - Pickup and dropoff addresses
   - Estimated fare and your net payout
   - Distance and estimated duration
   - Pickup ETA
2. Tap **Accept** to take the ride, or **Decline** to pass
3. Offers expire after a timeout — act quickly!

### 3.5 Trip Lifecycle
1. **En Route to Pickup** — Navigate to the rider's location
2. **Arrived at Pickup** — Mark arrival when you reach the pickup point
3. **Start Trip** — Begin the ride once the rider is aboard
4. **Complete Trip** — End the ride at the destination

### 3.6 Earnings
- View your earnings breakdown by day, week, month, or year
- See trip history with individual trip details
- Track your commission rate and net payout per trip
- Payout schedule and bank account info displayed

### 3.7 Profile Management
- **Personal Info** — Update name, email, phone
- **Vehicle Info** — View vehicle details (changes require admin approval)
- **Documents** — Track license, insurance, and registration expiry
- **Settings** — Set max trip distance, preferred areas, auto-accept preferences

---

## 4. Admin Portal

### 4.1 Ops Console (Dispatchers)
- **Live Trip Table** — Monitor all active, pending, and completed trips
- **Alert Dashboard** — View critical, warning, and info alerts
- **Driver Status** — See which drivers are online, offline, or on-trip

### 4.2 Owner Console (Fleet Operators)
- **Dashboard** — Revenue, trip volume, driver utilization metrics
- **Fleet Management** — View and manage your driver roster
- **Branding** — Customize your tenant's appearance
- **Pricing Policies** — Configure per-category pricing (base fare, per-mile, per-minute, booking fee)
- **Reports** — Download financial and operational reports

### 4.3 Platform Admin (UrWay Staff)
- **Tenant Management** — View all tenants, suspend/reactivate
- **System Health** — Monitor API, database, and service status
- **Test Runner** — Execute automated test suites

---

## 5. Pricing Model

Fares are calculated per-category:

| Component | Description |
|-----------|-------------|
| **Base Fare** | Fixed starting charge |
| **Per Mile** | Distance-based charge |
| **Per Minute** | Time-based charge |
| **Minimum Fare** | Floor price guarantee |
| **Booking Fee** | Platform service fee |
| **Surge Multiplier** | Dynamic pricing during high demand (capped) |

Each tenant configures their own pricing policies for each vehicle category (sedan, SUV, EV).

---

## 6. Payment Flow

1. **Ride Completion** — Fare is calculated automatically
2. **Payment Processing** — Charged via FluidPay (card or ACH)
3. **Settlement** — Funds enter `PENDING_BANK_SETTLEMENT` state
4. **Bank Settlement** — Once confirmed by the bank → `BANK_SETTLED`
5. **Driver Payout** — Initiated only from `BANK_SETTLED` funds (PAY-SETTLE-002)

### Refunds
- Full or partial refunds available via the payment endpoint
- Refund status tracked in the `payment_refunds` table

---

## 7. Real-Time Features

- **SSE (Server-Sent Events)** — Sub-second trip notifications for drivers and riders
- **Named Events:**
  - `ride-offer` — Driver receives a new ride request
  - `trip-update` — Both driver and rider receive trip state changes
- **Auto-Reconnect** — Clients reconnect within 1 second on connection loss
- **Heartbeat** — Server sends heartbeat every 15 seconds to keep connection alive
- **Poll Fallback** — For clients that cannot maintain SSE connections

---

## 8. Multi-Tenancy

- Each transportation provider operates as a separate **Tenant**
- Data is fully isolated — drivers, riders, trips, and payments are tenant-scoped
- Tenants can customize:
  - Pricing policies
  - Branding
  - Driver onboarding requirements
  - Revenue share configuration

---

## 9. Security

- **JWT Authentication** via Supabase with auto-refresh
- **Role-Based Access Control (RBAC)** — 7 roles with granular permissions
- **Idempotency Guards** — Payment and mutation endpoints prevent duplicate requests
- **Webhook Signature Verification** — HMAC-SHA256 for FluidPay webhooks
- **Input Validation** — Class-validator with whitelist enforcement
- **PII Masking** — Rider phone numbers masked in driver view

---

## 10. Troubleshooting

| Issue | Solution |
|-------|----------|
| "Unauthorized" error | Re-login to refresh your JWT token |
| No ride offers appearing | Ensure you're set to "Online" status |
| Payment failed | Check card details; retry with a different payment method |
| App shows "Mock Data" label | Gateway API may be offline; check system health |
| SSE connection drops | App auto-reconnects within 1 second |
