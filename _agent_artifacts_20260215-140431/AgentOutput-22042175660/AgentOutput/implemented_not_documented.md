# Implemented but Not Documented

## Driver app UI pages (Airport Queue, Auth, Dashboard, Earnings, Onboarding, Profile, Trip)

**Evidence:**
- ui:apps/driver-app/src/pages/AirportQueuePage.tsx
- ui:apps/driver-app/src/pages/AuthPage.tsx
- ui:apps/driver-app/src/pages/DashboardPage.tsx
- ui:apps/driver-app/src/pages/EarningsPage.tsx
- ui:apps/driver-app/src/pages/OnboardingPage.tsx
- ui:apps/driver-app/src/pages/ProfilePage.tsx
- ui:apps/driver-app/src/pages/TripPage.tsx

**Why not in requirements:**
This batch is limited to BRRS-1.1–BRRS-1.5 (build/CI/release governance). These concrete UI surfaces are implemented artifacts but are not described by these governance requirements.

## Rider app Booking page UI

**Evidence:**
- ui:apps/rider-app/src/pages/BookingPage.tsx

**Why not in requirements:**
Not covered by BRRS-1.1–BRRS-1.5, which focus on build artifacts and release gates rather than product UI capabilities.

## Presence of core UrwayDispatch domain tables in DB schema (drivers, vehicles, trips, bookings, payments, etc.)

**Evidence:**
- file:(AS-IS summary) Database schema lists tables: drivers, vehicles, driver_locations, trips, ride_offers, riders, bookings, quotes, payments, ratings, airport_queues, driver_payouts, payment_refunds, saved_payment_methods, driver_bank_accounts

**Why not in requirements:**
The batch requirements are about build/release governance; these domain entities suggest implemented data modeling not described by BRRS-1.1–BRRS-1.5. Note: AS-IS does not provide db:table.column @ file:line evidence, only table names in the summary.
