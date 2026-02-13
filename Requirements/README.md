# Requirements (Canonical)

**Source of truth:**
- CANONICAL.md
- CANONICAL.json

These are copies of:
- $canonicalBase.md
- $canonicalBase.json

## Rules (mandatory)
- Agentic Artificial Intelligence (AI) must do **as-is scan first** and mark completion only with evidence.
- Implemented-but-not-documented behavior must be reverse engineered into the canonical document and tracked.

## Folders
- sources/ = raw inputs used to build the canonical requirements
- _archive/<timestamp>/ = older drafts moved out of the way


<!-- BEGIN: PAYMENTS_PROVIDER_BOUNDARY -->
## Payments provider boundary (normative)

- RideShare and PaySurity are separate lines of business.
- Tenants MAY choose PaySurity; PaySurity MUST NOT be required.
- RideShare MUST support tenant-chosen providers (BYOP) with per-tenant credentials/config.
- If PaySurity is used, it MUST be treated as an external provider via API; no shared auth, no shared DB, no shared infra coupling.
- Settlement gating is RideShare-native: driver/tenant payout MUST occur only when the trip is in Completely Settled state (platform checking has received funds), regardless of provider.

<!-- END: PAYMENTS_PROVIDER_BOUNDARY -->

