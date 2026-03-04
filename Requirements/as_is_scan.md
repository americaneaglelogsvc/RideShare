# As-Is Scan (deterministic)

Generated: 2026-03-03T08:10:00Z
Scan scope: Full workspace `c:\Users\Detaimfc\Downloads\RideShare`

---

## Stack

| Layer | Technology |
| --- | --- |
| Backend | NestJS 10 (TypeScript, strict mode) |
| Database | Supabase (PostgreSQL) + PostGIS |
| Auth | Supabase JWT + JwtAuthGuard |
| Realtime | Supabase Realtime + Socket.IO (WebSocket gateway) |
| Frontend (driver) | React + Vite |
| Frontend (rider) | React + Vite |
| Frontend (admin) | Next.js |
| File storage | S3Service (AWS S3 compatible) |
| Email | SendGrid (EmailService) |
| SMS | Twilio (SmsService) |
| Push | Planned (FCM — not yet wired) |
| CI/CD | GitHub Actions (29 workflows) |
| Deployment | GCP Cloud Run (planned), Blue/Green script exists |

---

## Services (37)

| # | Service | File |
| --- | --- | --- |
| 1 | AdminService | services/admin.service.ts |
| 2 | BillingCronService | services/billing-cron.service.ts |
| 3 | BrandingInvoiceService | services/branding-invoice.service.ts |
| 4 | CircuitBreakerService | services/circuit-breaker.service.ts |
| 5 | ComplianceService | services/compliance.service.ts |
| 6 | ConsentService | services/consent.service.ts |
| 7 | DispatchService | services/dispatch.service.ts |
| 8 | DisputeService | services/dispute.service.ts |
| 9 | DistributionService | services/distribution.service.ts |
| 10 | DriverService | services/driver.service.ts |
| 11 | EmailService | services/email.service.ts |
| 12 | FluidpayService | services/fluidpay.service.ts |
| 13 | GeozoneService | services/geozone.service.ts |
| 14 | GlobalMonitorService | services/global-monitor.service.ts |
| 15 | HeartbeatService | services/heartbeat.service.ts |
| 16 | IdentityService | services/identity.service.ts |
| 17 | LedgerService | services/ledger.service.ts |
| 18 | MarketplaceLiquidityService | services/marketplace-liquidity.service.ts |
| 19 | MetricsService | services/metrics.service.ts |
| 20 | NotificationService | services/notification.service.ts |
| 21 | OfferService | services/offer.service.ts |
| 22 | OutboundWebhookService | services/outbound-webhook.service.ts |
| 23 | ParallelSessionService | services/parallel-session.service.ts |
| 24 | PaymentService | services/payment.service.ts |
| 25 | PricingService | services/pricing.service.ts |
| 26 | RealtimeService | services/realtime.service.ts |
| 27 | ReferralDistributionService | services/referral-distribution.service.ts |
| 28 | RefundService | services/refund.service.ts |
| 29 | ReservationsService | services/reservations.service.ts |
| 30 | S3Service | services/s3.service.ts |
| 31 | SkinningService | services/skinning.service.ts |
| 32 | SmsService | services/sms.service.ts |
| 33 | SupabaseService | services/supabase.service.ts |
| 34 | TaxService | services/tax.service.ts |
| 35 | TenantAnalyticsService | services/tenant-analytics.service.ts |
| 36 | TenantApiKeyService | services/tenant-api-key.service.ts |
| 37 | TenantService | services/tenant.service.ts |

---

## Controllers (10)

| # | Controller | File |
| --- | --- | --- |
| 1 | AdminController | controllers/admin.controller.ts |
| 2 | ComplianceController | controllers/compliance.controller.ts |
| 3 | DeveloperController | controllers/developer.controller.ts |
| 4 | DispatchController | controllers/dispatch.controller.ts |
| 5 | DriverController | controllers/driver.controller.ts |
| 6 | HealthController | controllers/health.controller.ts |
| 7 | PaymentController | controllers/payment.controller.ts |
| 8 | PaysurityWebhookController | controllers/paysurity-webhook.controller.ts |
| 9 | SeoController | controllers/seo.controller.ts |
| 10 | TenantDashboardController | controllers/tenant-dashboard.controller.ts |

**Missing:** RiderController (ReservationsService is orphaned — no controller wires it).

---

## Guards (2) + Middleware (1) + Gateway (1)

| Item | File |
| --- | --- |
| JwtAuthGuard | guards/jwt-auth.guard.ts |
| IdempotencyGuard | guards/idempotency.guard.ts |
| TenantContextMiddleware | tenant-context.middleware.ts |
| DriverSocketGateway | gateways/driver-socket.gateway.ts |

**Missing:** RolesGuard, @Roles() decorator, RateLimitGuard (exists in service code but file location TBD).

---

## Migrations (12)

| # | File | Phase |
| --- | --- | --- |
| 1 | 20250902065233_jade_sea.sql | Initial schema |
| 2 | 20250902144451_solitary_voice.sql | Initial schema |
| 3 | 20250902150446_violet_waterfall.sql | Initial schema |
| 4 | 1000_independent_concurrency_onboarding.sql | Phase 1 |
| 5 | 1001_schema_fixes.sql | Phase 1 (M2) |
| 6 | 1002_phase2_billing_onboarding.sql | Phase 2 |
| 7 | 1003_phase3_enterprise_scale.sql | Phase 3 |
| 8 | 1004_phase4_high_velocity_ecosystem.sql | Phase 4 |
| 9 | 1005_phase5_usa_market_maturity.sql | Phase 5 |
| 10 | 1006_phase65_intelligent_dashboard.sql | Phase 6.5 |
| 11 | 1007_launch_hardening.sql | Launch Hardening |
| 12 | 1008_phase7_iron_shield.sql | Phase 7.0 |

---

## Frontend Apps (3)

| App | Path | Framework |
| --- | --- | --- |
| Driver App | apps/driver-app | React + Vite |
| Rider App | apps/rider-app | React + Vite |
| Admin Portal | apps/admin-portal | Next.js |

---

## Tests

**No test files found.** No `*.spec.ts` or `*.test.ts` in `services/gateway/src`. No jest.config.ts. This is a critical gap.

---

## Config Schemas

| File | Purpose |
| --- | --- |
| Requirements/schemas/platform_config.schema.json | CFG-PLAT-0001 validation |
| Requirements/schemas/tenant_config.schema.json | CFG-TEN-0001 validation |
| Requirements/CANONICAL.schema.json | Requirements object schema |
| config/platform_config.example.json | Platform config example |
| config/tenant_config.example.json | Tenant config example |

---

## Key RPCs (PostgreSQL functions)

- `atomic_assign_trip` (FOR UPDATE SKIP LOCKED)
- `find_nearest_drivers` (PostGIS, miles-based)
- `find_geo_zone` (polygon lookup)
- `get_driver_density_per_sq_mile` (surge calc)
- `check_driver_compliance` (dispatch gate)
- `detect_parallel_sessions` (overlap monitor)
- `refresh_dashboard_materialized_views`
- `get_tenant_map_drivers`
- `detect_at_risk_vips`
- `mask_old_trip_pii`
- `cleanup_expired_idempotency_keys`
- `cleanup_old_health_snapshots`
