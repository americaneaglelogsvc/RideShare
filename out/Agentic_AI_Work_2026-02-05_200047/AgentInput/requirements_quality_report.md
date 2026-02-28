# Requirements Quality Report

- Total requirements: 45
- Missing acceptance criteria (Given/When/Then): 43

## Missing acceptance criteria list
- BRRS-1.1 — Canonical build rules (strict)
- BRRS-1.2 — Definition of Done (DoD) (strict by default)
- BRRS-1.3 — Required build artifacts (must be produced by agentic AI)
- BRRS-2.1 — Personas
- BRRS-2.3 — White-label branding
- BRRS-3.1 — Authentication and authorization
- BRRS-3.2 — Rate limiting and abuse prevention
- BRRS-3.3 — Personally Identifiable Information (PII) minimization
- BRRS-3.4 — Masked communications and messaging retention
- BRRS-3.5 — Driver compliance gating (expiry + notifications)
- BRRS-3.6 — Document capture with Optical Character Recognition (OCR) auto-population
- BRRS-3.7 — License status validation and background checks (pluggable)
- BRRS-3.8 — Optional specialized credentials for preferred dispatch status (feature-gated)
- BRRS-3.9 — Kill switches (platform + tenant)
- BRRS-4.1 — Core flows
- BRRS-4.2 — Passenger/luggage fit and fees
- BRRS-4.3 — Stops, split-pay, gratuity
- BRRS-4.4 — Cancellations, no-shows, support
- BRRS-4.5 — Ratings and feedback
- BRRS-4.6 — In-app messaging
- BRRS-5.1 — Onboarding and compliance
- BRRS-5.2 — Going online and offers
- BRRS-5.3 — Navigation and pickup workflow
- BRRS-5.4 — Trip completion, payouts, and early payout
- BRRS-5.5 — Destination mode, airport queueing, chat/voice
- BRRS-5.6 — Scheduled ride confirmation workflow
- BRRS-5.7 — Driver↔rider messaging and ratings
- BRRS-6.1 — Ring, hop, and fairness
- BRRS-6.2 — GrabBoard
- BRRS-6.3 — Airport Queue 2.0
- BRRS-6.4 — Destination-aware matching
- BRRS-6.6 — Blacklists and mutual-block pairing prevention
- BRRS-6.7 — Scheduled ride dispatch and confirmation exceptions
- BRRS-7.1 — Base pricing
- BRRS-7.2 — Surge pricing
- BRRS-7.3 — Surge policy controls and precedence
- BRRS-7.4 — Cancellation, no-show, wait-time, luggage, stops, gratuity
- BRRS-8.1 — Orchestration model
- BRRS-8.2 — Ledger integrity
- BRRS-8.3 — Driver payouts (tenant-managed)
- BRRS-9.1 — Tenant dispatcher and operations console
- BRRS-9.2 — Tenant owner console
- BRRS-9.3 — Platform super-admin console

### Instruction to agent
For each item above: add Proposed Given/When/Then in requirements_status.jsonl and set needs_acceptance=true.
