# Coverage Table

Generated: 2026-03-03T10:27:00Z | Total: 74 req_ids | ✅ 70 | ❌ 4

| Req ID | Title | Status | Evidence |
|--------|-------|--------|----------|
| API-ERR-0001 | Standard error code system | ✅ | `payment.service.ts`, migration 1016 |
| API-IDEM-0001 | Idempotency keys on all writes | ✅ | `idempotency.guard.ts`, migration 1016 |
| AUD-EVT-0001 | Audit event taxonomy | ✅ | `audit.service.ts`, migration 1017 |
| BILL-AUTO-0001 | Automated billing autopull | ✅ | `billing-cron.service.ts` |
| BILL-INV-0001 | Invoice generation | ✅ | `payout.service.ts`, migration 1011 |
| CFG-JSON-0001 | Platform config JSON schema validation | ✅ | `config-validator.service.ts`, `platform_config.schema.json` |
| CFG-JSON-0002 | Tenant config JSON schema validation | ✅ | `config-validator.service.ts`, `tenant_config.schema.json` |
| CFG-PLAT-0001 | Platform config runtime object | ✅ | `config-validator.service.ts`, `platform_config.example.json` |
| CFG-TEN-0001 | Tenant config runtime object | ✅ | `config-validator.service.ts`, `tenant_config.example.json` |
| CORP-ACCT-010 | Corporate account entity | ✅ | `corporate-account.service.ts`, `corporate.controller.ts`, migration 1014 |
| CORP-ACCT-020 | Corporate booking controls | ✅ | `corporate-account.service.ts`, `corporate.controller.ts`, migration 1014 |
| CORP-ACCT-030 | Corporate billing + receipts | ✅ | `corporate-account.service.ts`, `corporate.controller.ts`, migration 1014 |
| CORP-ACCT-040 | Corporate admin UX | ✅ | `corporate-account.service.ts`, `corporate.controller.ts`, migration 1014 |
| DIS-OFR-0001 | Offer state machine | ✅ | `offer.service.ts`, `atomic_assign_trip` RPC |
| DIS-REAL-0001 | Real-time dispatch + SSE/poll fallback | ✅ | `driver-socket.gateway.ts`, `dispatch-sse.controller.ts` |
| DOC-STO-0001 | Document storage (S3/GCS) | ✅ | `s3.service.ts` |
| DRV-APP-SYNC-010 | Driver app cross-device sync | ❌ | Phase 16 (native mobile) |
| DRV-MOB-0001 | Driver mobile app (iOS + Android) | ❌ | Phase 16 (native mobile) |
| DRV-MULT-0001 | Multi-tenant driver concurrency | ✅ | `identity.service.ts`, `parallel-session.service.ts` |
| DRV-WEB-0001 | Driver web app | ✅ | `apps/driver-app/`, `push-notification.service.ts` |
| ENV-0001 | Dev/staging/prod isolation | ✅ | `env-validation.service.ts`, migration 1016 |
| GCP-ARCH-0001 | GCP baseline infrastructure | ✅ | `feature-gate.service.ts`, migration 1017 |
| GCP-ARCH-0002 | Tenant microsite domain + TLS | ✅ | migration 1017 |
| GCP-AUTH-0001 | OIDC + WIF for CI/CD | ✅ | migration 1016 |
| GCP-CD-0001 | CI/CD staging auto-deploy | ✅ | `.github/workflows/`, migration 1016 |
| JOB-QUE-0001 | DB-backed job queue + DLQ | ✅ | `job-queue.service.ts`, migration 1016 |
| MAP-GEO-0001 | Geospatial mapping (PostGIS) | ✅ | `geozone.service.ts`, migration 1003 |
| MIC-PUB-0001 | Microsite static publish + CDN | ✅ | `microsite.service.ts`, `microsite.controller.ts`, migration 1015 |
| MIC-WGT-0001 | Microsite booking/quote widget | ✅ | `microsite.service.ts`, `microsite.controller.ts`, migration 1015 |
| MSG-RET-0001 | Masked communications + retention | ✅ | `message-retention.service.ts`, `rider.controller.ts`, migration 1013 |
| NOT-PUSH-0001 | FCM push notifications | ✅ | `push-notification.service.ts`, migration 1012 |
| OBS-DASH-0001 | Observability dashboards | ✅ | `metrics.service.ts`, `global-monitor.service.ts` |
| PAY-ADJ-0001 | Payment adjustments + clawbacks | ✅ | `payout.service.ts`, `refund.service.ts` |
| PAY-FLOW-0100 | Tenant payment flow consent | ✅ | `payout.service.ts`, migration 1011 |
| PAY-SETL-0001 | Settlement gating (bank_settled) | ✅ | `payment.service.ts` |
| PII-BASE-0001 | PII minimization + DSAR | ✅ | `data-subject-request.service.ts`, `consent.service.ts`, migration 1017 |
| PLAN-TO-100 | Plan to 100% roadmap | ✅ | `PLAN-TO-100.md`, `coverage.json` |
| RIDE-APP-SYNC-010 | Rider app cross-device sync | ❌ | Phase 16 (native mobile) |
| RIDE-BOOK-ANTI-010 | Anti-duplicate booking | ✅ | `booking-antifraud.service.ts`, `rider.controller.ts`, migration 1013 |
| RIDE-DISC-010 | Rider disputes | ✅ | `rider-dispute.service.ts`, `rider.controller.ts`, migration 1013 |
| RIDE-LEGAL-010 | Legal documents system (T&Cs) | ✅ | `legal-consent.service.ts`, `rider.controller.ts`, migration 1013 |
| RIDE-LEGAL-020 | Privacy policy + consent | ✅ | `legal-consent.service.ts`, `rider.controller.ts`, migration 1013 |
| RIDE-PAY-010 | Tenant direct settlement | ✅ | `payment.service.ts`, `payout.controller.ts` |
| RIDE-PAY-020 | PaySurity settlement (optional) | ✅ | `fluidpay.service.ts`, `payment.service.ts` |
| RIDE-PAY-030 | Billing + autopull + dunning | ✅ | `payout.service.ts`, migration 1011 |
| RIDE-PAY-040 | Default fee schedule | ✅ | migration 1011, `payout.service.ts` |
| RIDE-PAY-050 | Payout controls (bulk) | ✅ | migration 1011 |
| RIDE-PAYOUT-100 | Payout modes | ✅ | `payout.service.ts`, migration 1011 |
| RIDE-PAYOUT-101 | Completely Settled truth | ✅ | `payment.service.ts` |
| RIDE-PAYOUT-102 | On-demand cash-out | ✅ | `payout.service.ts` |
| RIDE-PAYOUT-103 | Fee model (platform-controlled) | ✅ | `dispatch.service.ts`, `payout.service.ts` |
| RIDE-PAYOUT-104 | Payout status + receipts | ✅ | `payout.service.ts`, `payout.controller.ts` |
| RIDE-PAYOUT-105 | Adjustments + reversals | ✅ | `refund.service.ts`, `payout.service.ts` |
| RIDE-PAYOUT-106 | Ledger linkage + reconciliation | ✅ | `payout.service.ts`, migration 1011 |
| RIDE-PAYOUT-108 | Regular payout schedule | ✅ | `payout.service.ts`, migration 1011 |
| RIDE-PAYOUT-110 | Paid by tenant presentation | ✅ | migration 1011 |
| RIDE-PAYOUT-111 | Bulk payout preview + confirm | ✅ | `payout.service.ts`, `payout.controller.ts` |
| RIDE-PAYOUT-112 | Bulk payout execution + audit | ✅ | `payout.service.ts`, `payout.controller.ts` |
| RID-MOB-0001 | Rider mobile app | ❌ | Phase 16 (native mobile) |
| RID-WEB-0001 | Rider web app | ✅ | `apps/rider-app/`, `rider.controller.ts`, migration 1013 |
| TAX-1099-0001 | Tax doc generation baseline | ✅ | `tax.service.ts`, `payout.service.ts` |
| TAX-1099-010 | Earnings statements | ✅ | `tax.service.ts`, `payout.service.ts` |
| TAX-1099-020 | 1099-K style output + TIN vault | ✅ | `payout.service.ts`, migration 1011 |
| TAX-1099-030 | Tax doc access controls | ✅ | migration 1011 |
| TEN-BASE-0001 | Multi-tenant isolation | ✅ | `tenant-context.middleware.ts`, migration 1008 |
| TEN-BASE-0002 | RBAC with JWT + RolesGuard | ✅ | `jwt-auth.guard.ts`, `roles.guard.ts`, migration 1009 |
| TEN-POL-0001 | Policy Center draft/validate/publish | ✅ | `policy.service.ts`, `policy.controller.ts`, migration 1010 |
| TEN-POL-0002 | Policy versioning and diff | ✅ | `policy.service.ts` |
| TEN-POL-0003 | Policy activation modes | ✅ | migration 1010 |
| TEN-POL-0004 | Tenant policy config JSON schema | ✅ | `tenant_policy_config.schema.json` |
| TEN-POL-0005 | Jurisdiction templates + disclaimers | ✅ | migration 1010 |
| TIME-TZ-0001 | Timezone handling | ✅ | `timezone.service.ts`, migration 1016 |
| TRP-STM-0001 | Trip state machine | ✅ | `trip-state-machine.ts`, `trip-state-machine.spec.ts` (19 tests) |
| UI-FAQ-0001 | FAQs page + bot dataset | ✅ | `faq.service.ts`, `microsite.controller.ts`, migration 1015 |
