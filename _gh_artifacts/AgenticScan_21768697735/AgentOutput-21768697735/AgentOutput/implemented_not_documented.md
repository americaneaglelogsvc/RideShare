# Implemented but Not Documented

## Driver app UI pages exist (Airport Queue, Auth, Dashboard, Earnings, Onboarding, Profile, Trip)

**Evidence:**
- ui:apps/driver-app/src/pages/AirportQueuePage.tsx
- ui:apps/driver-app/src/pages/AuthPage.tsx
- ui:apps/driver-app/src/pages/DashboardPage.tsx
- ui:apps/driver-app/src/pages/EarningsPage.tsx
- ui:apps/driver-app/src/pages/OnboardingPage.tsx
- ui:apps/driver-app/src/pages/ProfilePage.tsx
- ui:apps/driver-app/src/pages/TripPage.tsx

**Why not in requirements:**
This batch is focused on build/CI/deployment governance (BRRS-1.x). The presence of these UI pages is an implemented product surface not described in these governance requirements.

## Rider app Booking page exists

**Evidence:**
- ui:apps/rider-app/src/pages/BookingPage.tsx

**Why not in requirements:**
Not covered by BRRS-1.x governance requirements; indicates product functionality outside this batch.

## Supabase tables for core UrwayDispatch domain exist (drivers, vehicles, trips, bookings, payments, etc.)

**Evidence:**
- file:(AS-IS summary) Database schema lists tables: drivers, vehicles, driver_locations, trips, ride_offers, riders, bookings, quotes, payments, ratings, airport_queues, driver_payouts, payment_refunds, saved_payment_methods, driver_bank_accounts

**Why not in requirements:**
BRRS-1.x covers build artifacts/gates/deploy automation, not domain data model. Note: evidence is limited to the prompt AS-IS summary and does not include db:table.column @ file:line mappings.
