# Plan to 100% CANONICAL Coverage

Generated: 2026-03-03T08:26:00Z
Starting point: 11 ✅ (14.9%) | 27 🟡 (36.5%) | 36 ❌ (48.6%) — 74 total req_ids

## Execution order (sequential, 3 parallelizable pairs)

### Phase 7.2 — RBAC + Security (M02)

- **Delivers:** TEN-BASE-0002 (RolesGuard + @Roles + user_roles table)
- **Also:** Guard /health/detailed, HMAC on Fluidpay webhook, tsconfig strict, Jest test bed
- **Moves:** 1 🟡→✅, creates test infrastructure

### Phase 7.3 — Policy Center (M03)

- **Delivers:** TEN-POL-0001 through TEN-POL-0005
- **Also:** PolicyService, PolicyController, 6 REST endpoints, Ajv schema validation, jurisdiction templates
- **Moves:** 5 ❌→✅

### Phase 8 — Dispatch 2.0 (M04 partial)

- **Delivers:** TRP-STM-0001, DIS-REAL-0001 completion
- **Also:** GrabBoard, airport queue 2.0, destination-aware matching, scheduled ride dispatch, blacklists
- **Moves:** 2 🟡→✅

### Phase 9 — Pricing + Config (M05)

- **Delivers:** CFG-PLAT-0001, CFG-TEN-0001, CFG-JSON-0001, CFG-JSON-0002
- **Also:** Surge policy controls, cancellation/no-show/wait-time modules, runtime Ajv validation
- **Moves:** 4 🟡→✅

### Phase 10 — Payments Completeness (M06)

- **Delivers:** RIDE-PAY-010/020/030/040/050, RIDE-PAYOUT-100–112, PAY-ADJ-0001, PAY-FLOW-0100, TAX-*, BILL-INV-0001
- **Also:** Hybrid routing, full dunning, bulk payouts, 4-way referral split, TIN vault, daily recon
- **Moves:** 15 ❌→✅, 10 🟡→✅

### Phase 11 — Driver App (M07) `[can ∥ Phase 10]`

- **Delivers:** DRV-WEB-0001 completion, NOT-PUSH-0001
- **Also:** OCR doc capture, navigation deep-link, FCM integration, device_tokens table
- **Moves:** 1 ❌→✅, 1 🟡→✅

### Phase 12 — Rider App (M08)

- **Delivers:** RID-WEB-0001 completion, RIDE-DISC-010, RIDE-LEGAL-010/020, RIDE-BOOK-ANTI-010, MSG-RET-0001
- **Also:** Full rider flows, in-app messaging, consent gates
- **Moves:** 4 ❌→✅, 2 🟡→✅

### Phase 13 — Console UIs (M09+M10+M11)

- **Delivers:** CORP-ACCT-010/020/030/040
- **Also:** Tenant ops console, tenant owner console, platform admin console, observability dashboards
- **Moves:** 4 ❌→✅

### Phase 14 — Website + Microsites (M13) `[can ∥ Phase 15]`

- **Delivers:** MIC-PUB-0001, MIC-WGT-0001, UI-FAQ-0001
- **Also:** 9-page public website, tenant microsites, domain management, SEO
- **Moves:** 3 ❌→✅

### Phase 15 — Testing + Reliability (M12) `[can ∥ Phase 14]`

- **Delivers:** API-ERR-0001, API-IDEM-0001, TIME-TZ-0001, ENV-0001, GCP-AUTH-0001, GCP-CD-0001, JOB-QUE-0001
- **Also:** Full Jest suite, k6 load tests, chaos tests, DLQ, GO/NO-GO, OpenAPI validation, canary deployment
- **Moves:** 5 ❌→✅, 2 🟡→✅

### Phase 16 — Mobile Apps

- **Delivers:** DRV-MOB-0001, DRV-APP-SYNC-010, RID-MOB-0001, RIDE-APP-SYNC-010
- **Also:** React Native (iOS + Android), cross-device state sync, native FCM
- **Moves:** 4 ❌→✅

### Phase 17 — Feature-gated + Final Hardening (M14)

- **Delivers:** GCP-ARCH-0001, GCP-ARCH-0002, AUD-EVT-0001, PII-BASE-0001, PLAN-TO-100
- **Also:** WCAG 2.1 AA, backup/DR, marketplace/ads, Chicagoland events, anti-drift final sweep
- **Moves:** 2 ❌→✅, 3 🟡→✅

## Governance rule (enforced after every phase)

1. Update all 15 mandated artifacts with new evidence
2. Git commit with phase tag
3. Report: "X req_ids moved. Y remaining."

## Expected outcome

After Phase 17: 74/74 req_ids at ✅ Implemented or better = **100% CANONICAL coverage**.
