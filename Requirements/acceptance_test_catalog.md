# Acceptance Test Catalog

Updated: 2026-03-03T23:19:00Z
Per §17: Catalog of acceptance criteria for each req_id.

## Automated Tests (93 pass)

| Test Suite | Tests | File |
|---|---|---|
| RolesGuard | 5 | `roles.guard.spec.ts` |
| TripStateMachine | 19 | `trip-state-machine.spec.ts` |
| RatingService | 5 | `rating.service.spec.ts` |
| HourlyBookingService | 3 | `hourly-booking.service.spec.ts` |
| SplitPayService | 4 | `split-pay.service.spec.ts` |
| Gateway E2E | 18 | `app.e2e-spec.ts` |
| Acceptance E2E | 38 | `acceptance.e2e-spec.ts` |

## Acceptance Criteria by Phase

### Phase 7.2 — RBAC + Security
- [x] `TEN-BASE-0002`: Unauthenticated request to `/health/detailed` returns 401
- [x] `TEN-BASE-0002`: Request with `DRIVER` role to `/health/detailed` returns 403
- [x] `TEN-BASE-0002`: Request with `PLATFORM_SUPER_ADMIN` role returns 200
- [x] `TEN-BASE-0001`: Request without `x-tenant-id` header returns 400 on tenant-scoped routes
- [x] HMAC: Webhook with invalid signature returns `{ success: false }`

### Phase 7.3 — Policy Center
- [x] `TEN-POL-0001`: Create draft policy → validate → publish → verify active
- [x] `TEN-POL-0002`: Publish v2 → diff v1 vs v2 returns changes
- [x] `TEN-POL-0003`: Set activation mode to `manual_only` → verify manual activation required
- [x] `TEN-POL-0004`: Submit invalid policy JSON → Ajv returns validation errors
- [x] `TEN-POL-0005`: Create jurisdiction template → verify disclaimer text

### Phase 8 — Dispatch 2.0
- [x] `TRP-STM-0001`: All 19 state transitions validated (automated ✅)
- [x] `DIS-OFR-0001`: Two drivers claim same trip → only one succeeds (atomic)
- [x] `DIS-REAL-0001`: SSE endpoint streams trip updates to connected client
- [x] GrabBoard: Driver sees unclaimed trips sorted by fare
- [x] Airport Queue: FIFO ordering maintained across entries
- [x] Blacklist: Blocked driver excluded from dispatch candidates
- [x] Scheduled Ride: Ride created 2h ahead → dispatched 30 min before

### Phase 9 — Config + Pricing
- [x] `CFG-JSON-0001`: Invalid platform config rejected by Ajv
- [x] `CFG-JSON-0002`: Invalid tenant config rejected by Ajv
- [x] Cancellation: Cancel within 2 min → no fee; cancel after → fee applied
- [x] No-Show: After 5 min wait → rider charged, driver compensated
- [x] Surge: Trigger surge → verify 60s propagation delay before effective
- [x] Gratuity: Suggested percentages displayed, custom amount accepted

### Phase 10 — Payments
- [x] `RIDE-PAY-010`: Tenant-direct payment routes correctly
- [x] `RIDE-PAY-030`: Dunning sequence D0→D2→D5 fires on schedule
- [x] `RIDE-PAYOUT-111`: Bulk payout preview shows correct totals
- [x] `RIDE-PAYOUT-112`: Bulk payout execution creates ledger entries

### Phase 11 — Driver App
- [x] `NOT-PUSH-0001`: FCM push sent when trip assigned to driver
- [x] `DRV-WEB-0001`: Driver can complete onboarding flow end-to-end

### Phase 12 — Rider App
- [x] `RIDE-BOOK-ANTI-010`: >5 bookings in 10 min → velocity check blocks
- [x] `RIDE-DISC-010`: Rider creates dispute → admin resolves → rider notified
- [x] `RIDE-LEGAL-010`: Rider grants ToS consent → audit trail recorded
- [x] `MSG-RET-0001`: PII masked in messages older than retention window

### Phase 13 — Corporate
- [x] `CORP-ACCT-010`: Create corporate account → add employee → verify
- [x] `CORP-ACCT-020`: Trip exceeds per-trip limit → approval required
- [x] `CORP-ACCT-030`: Generate statement → verify trip count and totals
- [x] `CORP-ACCT-040`: Suspend account → employee cannot book

### Phase 14 — Microsites + FAQ
- [x] `MIC-PUB-0001`: Create microsite → publish → access by subdomain
- [x] `MIC-WGT-0001`: Create widget → retrieve by widget key
- [x] `UI-FAQ-0001`: Create category + article → search returns article

### Phase 15 — Reliability
- [x] `ENV-0001`: Missing required env var → startup warning logged
- [x] `TIME-TZ-0001`: Set tenant timezone → business hours check correct
- [x] `JOB-QUE-0001`: Enqueue job → process → verify completed
- [x] `API-IDEM-0001`: Duplicate request with same idempotency key → same response

### Phase 17 — Hardening
- [x] `AUD-EVT-0001`: Emit audit event → query returns event
- [x] `PII-BASE-0001`: Submit DSR → process → verify completed status
- [x] `GCP-ARCH-0001`: Feature gate enabled → isEnabled returns true
- [x] `GCP-ARCH-0001`: Feature gate disabled → isEnabled returns false
