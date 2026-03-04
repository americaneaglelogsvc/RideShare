# AS-IS REPORT

Generated: 2026-03-03T08:24:00Z

## 1. Repository

- **Location:** `americaneaglelogsvc/RideShare`
- **Backend:** NestJS 10 (TypeScript) — `services/gateway/`
- **Frontend:** React+Vite (driver-app, rider-app), Next.js (admin-portal) — `apps/`
- **Database:** Supabase (PostgreSQL + PostGIS) — 12 migrations in `supabase/migrations/`
- **CI/CD:** GitHub Actions — `.github/workflows/`

## 2. Backend inventory

| Category | Count | Key items |
| --- | --- | --- |
| Services | 37 | dispatch, driver, payment, offer, ledger, billing-cron, geozone, identity, etc. |
| Controllers | 10 | admin, compliance, developer, dispatch, driver, health, payment, paysurity-webhook, seo, tenant-dashboard |
| Guards | 2 | JwtAuthGuard, IdempotencyGuard |
| Middleware | 1 | TenantContextMiddleware (with compliance gatekeeper) |
| WebSocket | 1 | DriverSocketGateway |
| Migrations | 12 | jade_sea (initial) through 1008_phase7_iron_shield |

**Missing from backend:** RolesGuard, @Roles() decorator, RiderController, PolicyService, PolicyController, FcmService, JobQueueService.

## 3. Frontend inventory

| App | Framework | State |
| --- | --- | --- |
| Driver App | React + Vite | Auth, dashboard, trip, earnings, onboarding pages. Incomplete flows. |
| Rider App | React + Vite | BookingPage, PaymentForm. Incomplete flows. |
| Admin Portal | Next.js | Health check + basic stats page. Minimal. |

## 4. Coverage snapshot

| Status | Count | % |
| --- | --- | --- |
| ✅ Implemented | 11 | 14.9% |
| 🟡 Partial | 27 | 36.5% |
| ❌ Not Started | 36 | 48.6% |
| **Total** | **74** | |

## 5. What works (Phases 1–7.0 completed per UWD_Grand_Implementation_Plan.md)

- Multi-tenant isolation (RLS on 14+ tables, tenant_id everywhere)
- Driver identity resolution (global → tenant-scoped profiles)
- Conflict-safe offer claiming (atomic_assign_trip with FOR UPDATE SKIP LOCKED)
- Dispatch with nearest-driver PostGIS queries
- Payment processing with FluidPay integration and bank_settled gating
- Ledger service (trip fare recording)
- Billing cron (daily ACH autopull)
- Tenant dashboard (16-module analytics + materialized views)
- Branding invoice generation
- S3 document storage
- Observability (metrics, global monitor, health endpoints)
- Rate limiting on admin + webhook endpoints
- Compliance gatekeeper middleware

## 6. What does NOT work / is missing

- **No test files** — zero *.spec.ts or *.test.ts anywhere
- **No RolesGuard** — all endpoints accessible to any authenticated user
- **No Policy Center** — entire §7.5 unimplemented
- **No RiderController** — ReservationsService is orphaned
- **No FCM push** — no device_tokens table or FcmService
- **No formal state machines** — trip/offer transitions are implicit in code
- **No CI/CD staging pipeline** — GitHub Actions exist but no auto-deploy
- **No job queue or DLQ** — background tasks are inline
- **36 of 74 req_ids have zero implementation**

## 7. Key RPCs (PostgreSQL)

`atomic_assign_trip`, `find_nearest_drivers`, `find_geo_zone`, `get_driver_density_per_sq_mile`, `check_driver_compliance`, `detect_parallel_sessions`, `refresh_dashboard_materialized_views`, `get_tenant_map_drivers`, `detect_at_risk_vips`, `mask_old_trip_pii`, `cleanup_expired_idempotency_keys`, `cleanup_old_health_snapshots`
