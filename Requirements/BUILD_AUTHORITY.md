# Build Authority (STRICT)

The ONLY requirements source-of-truth is:
- BlackRavenia_RideShare_Canonical_Requirements_v6_1.md

All other documents are governance/process artifacts only.
They MUST NOT be used to create or change requirements.

If a capability is missing, update ONLY the canonical requirements document.


<!-- BEGIN: PAYMENTS_PROVIDER_BOUNDARY -->
## Payments provider boundary (normative)

- RideShare and PaySurity are separate lines of business.
- Tenants MAY choose PaySurity; PaySurity MUST NOT be required.
- RideShare MUST support tenant-chosen providers (BYOP) with per-tenant credentials/config.
- If PaySurity is used, it MUST be treated as an external provider via API; no shared auth, no shared DB, no shared infra coupling.
- Settlement gating is RideShare-native: driver/tenant payout MUST occur only when the trip is in Completely Settled state (platform checking has received funds), regardless of provider.

<!-- END: PAYMENTS_PROVIDER_BOUNDARY -->

