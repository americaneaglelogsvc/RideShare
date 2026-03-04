# Implemented but Not Documented

Generated: 2026-03-03T08:15:00Z

Per §1.3 and §20 anti-drift rule: implemented code not covered in CANONICAL.md must be reverse-engineered into the canonical document.

---

## Items found and ALREADY canonized in Step 0

| Feature | Evidence | Action taken |
| --- | --- | --- |
| Dynamic pricing (zone + density surge) | `geozone.service.ts`, `geo_zones` table, RPCs | Added as §7.6 in CANONICAL.md |
| 4-way referral split (spill-over) | `referral-distribution.service.ts`, `referral_distribution_splits` | Added as §8.6 in CANONICAL.md |
| Branding fee schedules + approval | `branding-invoice.service.ts`, `branding_requests` table | Added as §9.4 in CANONICAL.md |
| PII minimization baseline | `pii_minimization.md`, `consent.service.ts`, `mask_old_trip_pii` RPC | Added as PII-BASE-0001 in JSONL |
| Messaging masking + retention | `messaging_masking_and_retention.md` | Added as MSG-RET-0001 in JSONL |

## Items found and NOT YET canonized (require future §20 action)

| Feature | Evidence | Recommended action |
| --- | --- | --- |
| Circuit breaker (payment resilience) | `circuit-breaker.service.ts`, `circuit_breaker_state` table | Add §11.5 in CANONICAL.md |
| VIP tier management | `vip-analytics.service.ts`, `vip_riders` table, `vip_alerts` | Add §4.8 or §9.2D in CANONICAL.md |
| Spill-over marketplace liquidity | `marketplace-liquidity.service.ts`, `spill_over_referrals` | Add §6.8 in CANONICAL.md |
| Parallel session monitoring | `parallel-session.service.ts`, `parallel_session_log` | Add §11.6 in CANONICAL.md |
| Tenant analytics (materialized views) | `tenant-analytics.service.ts`, 4 MVs | Add §9.2E in CANONICAL.md |
| "Ask the Agent" NL analytics | `tenant-dashboard.controller.ts` POST /dashboard/:tenantId/ask | Add §9.2F in CANONICAL.md |
| Blue/Green deployment script | `scripts/blue-green-deploy.ps1` | Add §15.1 in CANONICAL.md |
| Heartbeat + stale driver cleanup | `heartbeat.service.ts`, `driver_heartbeats` | Add §6.9 in CANONICAL.md |
| Discount codes (VIP incentives) | `discount_codes` table | Add §8.7 in CANONICAL.md |

**Note:** These 9 items represent implemented capabilities that have no corresponding canonical requirement. Per §20, they must be added to CANONICAL.md before they can be marked "Implemented" in `requirements_status.md`.
