# Plan to 100% CANONICAL Coverage

req_id: GOV-PLAN-100-0001

## 1. Milestone-oriented roadmap

1. FOUNDATION complete (tenancy, RBAC, config, PII, messaging, audit, i18n) with JSONL evidence.
2. Hosting & CI/CD on GCP urwaydispatch.com (dev/staging/prod) with urwaydispatch.com front door.
3. Core backend foundations: tenancy, identity, config, audit wired end-to-end.
4. Policy Center, dispatch/realtime, pricing/quoting, payments/ledger implemented and tested.
5. Rider/driver apps and consoles wired to backend and policies.
6. Reliability harness (k6/chaos/DLQ) and GO/NO-GO gates enforcing safe production cutovers.

## 2. Evidence expectations per milestone

- Each milestone is only considered complete when:
  - All in-scope canonical ids have `status` = `Implemented` or `Tested` in `requirements_status.jsonl`.
  - Evidence includes code, db, tests, and CI traces as per CANONICAL §1.3.

## 3. Next concrete chunks

- C2-B: Governance evidence pack (this set of documents) wired into JSONL.
- C3-A/C3-B: GCP IaC and CI/CD baselines targeting urwaydispatch.com and urwaydispatch.com.
- C4-A/C4-B: Tenancy, config, auth, and audit services end-to-end.
