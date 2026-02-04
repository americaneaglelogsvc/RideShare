# BlackRavenia RideShare Platform — Canonical Requirements (v6.1)

**Timestamp (America/Chicago): 2026-02-04 05:21:23**  

**Brand:** blackravenia.com  
**Scope:** Passenger rides first. Multi-tenant, white-label Software as a Service (SaaS) platform with tenant-branded microsites and per-tenant feature gating.  
**Database:** PostgreSQL (PostgreSQL)  
**Maps & Infrastructure:** Google-first (Google Cloud Platform (GCP), Google Cloud Storage (GCS), Google Cloud SQL (Cloud SQL), Google Maps Platform, Firebase Cloud Messaging (FCM), Google Analytics (GA), Google Workspace (Gmail, Calendar)).  
**Payments:** PaySurity (internal) as orchestration layer; Fluidpay and Argyle Payments are treated as black-box gateways for tenants and drivers (white-labeled under PaySurity).  
**Optional future integration:** American Eagle Logistics (AEL) for package/courier opportunities (feature-gated; passenger rides remain the primary product).

> **Single requirements authority:** This document is the ONLY build authority.  
> **Semantic matching:** The agentic Artificial Intelligence (AI) must evaluate “as-is” status by meaning and end-to-end coverage, not by Requirement Identifier (REQ ID) matching.

---

## 1. Product governance, anti-drift guardrails, and evidence-based progress

### 1.1 Canonical build rules (strict)
- The build must be implemented against the semantics in this document.
- No capability can be marked “Implemented” or “Tested” without evidence links.

### 1.2 Definition of Done (DoD) (strict by default)
For each capability in this document:

- **Designed**: screen(s) and flow(s) exist in `screen_index.md`, and relevant state machine/timers are specified.
- **Implemented**: end-to-end path exists: User Interface (UI) → Application Programming Interface (API) → Database (DB) → side effects (notifications, policy propagation, ledger entries).
- **Tested**: automated tests exist and pass in Continuous Integration (CI) for happy-path and key negative-paths.
- **Shippable**: deployed to staging with smoke tests passing; observability signals visible (metrics/logs/alerts).
- **Launch-ready**: shippable + operational playbooks + tenant onboarding + compliance workflows + incident response runbooks.

### 1.3 Required build artifacts (must be produced by agentic AI)
The agentic AI must generate and maintain:

1) `as_is_scan.md` — deterministic scan: stack, services, endpoints, migrations, tests, workflows.  
2) `requirements_status.md` — semantic checklist mapping each capability to Not Started / In Progress / Implemented / Tested / Blocked, with evidence links.  
3) `progress_report.md` — time-stamped deltas since last scan + risks + next actions, all evidence-linked.  
4) `implemented_not_documented.md` — implemented code not covered in this document, with evidence.

**Evidence gates (non-negotiable):**
- “Implemented” requires: file paths + API routes/endpoints + DB migrations/queries.  
- “Tested” requires: test file paths + CI proof (workflow + run output reference).  
- “Shippable” requires: staging deployment reference + smoke test evidence.

---

## 2. Personas, roles, and tenancy model

### 2.1 Personas
- **Rider (End Customer)**: books rides, pays, tracks driver, rates driver/vehicle, manages trip history and receipts.
- **Driver**: completes onboarding/compliance, goes online, accepts offers, navigates, chats, completes trips, views earnings/unpaid balance/payout history.
- **Tenant Dispatcher / Operations Staff (Tenant Ops)**: monitors live operations, intervenes on assignments, manages drivers/vehicles, handles disputes.
- **Tenant Owner / Fleet Operator (Tenant Owner)**: manages business settings, policies, fleet, analytics, staff.
- **Platform Super Admin (Platform Owner)**: seeds/CRUD tenants, global policies, feature gates, pricing constraints, monitoring, kill switches, test execution.
- **Platform Sub-Super Admin (Platform Staff)**: delegated platform ops, support, compliance review, incident response.

### 2.2 Tenancy and data isolation
- Every relevant row includes `tenant_id`.
- Tenants see only their own riders, drivers, vehicles, trips, payouts, messages, ratings, policies, analytics.
- Platform Super Admin (and authorized platform staff) can view all tenant data for operations, compliance, auditing, and support.

**Acceptance:**
- Given Tenant A and Tenant B exist, when a Tenant A user queries trips, then only Tenant A trips are returned.

### 2.3 White-label branding
- Rider and Driver experiences are branded per tenant (colors, logo, copy, domains).
- Driver reimbursements/payouts are shown under tenant branding, because payout scheduling is controlled by the tenant.
- Platform records the financial truth via ledger, but external gateway names remain hidden from tenants/drivers (PaySurity is the gateway “face”).

---

## 3. Identity, security, privacy, and compliance

### 3.1 Authentication and authorization
- Authentication: JSON Web Token (JWT) sessions.
- Authorization: Role-Based Access Control (RBAC) with least privilege.
- Audit logs for admin/policy/financial actions: who/what/when/where (tenant, user, IP).

### 3.2 Rate limiting and abuse prevention
- Web Application Firewall (WAF) + throttling for login, trip creation, payment attempts, messaging.
- 429 responses include Retry-After.

### 3.3 Personally Identifiable Information (PII) minimization
- Data retention policies for sensitive fields.
- Export/delete tooling for tenant data, subject to legal retention.

### 3.4 Masked communications and messaging retention
- Riders and drivers must not see each other’s phone or email.
- In-app messaging is required; optional voice is feature-gated.
- Messages retained for industry-standard period (default 180 days), configurable per tenant and platform policy.

### 3.5 Driver compliance gating (expiry + notifications)
- Driver cannot go online or accept trips if any required compliance item is expired:
  - driver’s license,
  - vehicle insurance,
  - vehicle registration.
- Optional strict mode: block login (default: allow login but restrict to compliance remediation + earnings views).
- Notifications at D-14 and D-1 before expiry to driver and tenant operations contacts; delivery is logged.

### 3.6 Document capture with Optical Character Recognition (OCR) auto-population
- Driver/vehicle document screens allow in-app camera capture.
- Optical Character Recognition (OCR) parses documents to prefill fields (document number, expiry, name, plate, VIN (Vehicle Identification Number)).
- Driver must review and confirm extracted data; edits are audited.

### 3.7 License status validation and background checks (pluggable)
- Pluggable provider model for:
  - license status (active/suspended/revoked) and Motor Vehicle Record (MVR),
  - background screening,
  - re-screening intervals (configurable) and incident-triggered re-checks.
- Minimum viable: driver attestation + tenant review + scheduled reminders; provider integration is strongly recommended.

### 3.8 Optional specialized credentials for preferred dispatch status (feature-gated)
- Driver profile includes optional section: “Also open to Package/Courier Opportunities.”
- Drivers can upload proofs for credentials such as:
  - Professional Chauffeur license,
  - Transportation Security Administration (TSA) certification,
  - Hazardous Materials (Hazmat) certification,
  - Medical/Pharma transport certification,
  - Non-Emergency Medical Transport (NEMT) certification,
  - Nuclear medicine transport certification.
- Each credential requires proof capture via in-app camera, OCR parsing, expiry tracking, tenant approval.

### 3.9 Kill switches (platform + tenant)
- Platform Super Admin and designated platform staff can deactivate tenant, driver, or vehicle (reason required; audited). Effective within 60 seconds.
- Tenants can deactivate their own drivers and vehicles.

---

## 4. Rider application (Web first; mobile optional) — end-to-end experience

### 4.1 Core flows
- Account: sign-up/sign-in, profile, receipts, ride history.
- Booking types: Book now (on-demand), Reserve (scheduled), Hourly.
- Upfront pricing quote shown before confirmation.
- Live tracking after assignment: driver location and ETA (Estimated Time of Arrival) refresh at least every 60 seconds.
- Assigned driver + vehicle details shown (industry standard).

### 4.2 Passenger/luggage fit and fees
- Booking collects passenger count and large luggage count.
- System warns if selected vehicle likely cannot fit passengers/luggage; suggests upgrade.
- Luggage fee may apply based on configurable thresholds.

### 4.3 Stops, split-pay, gratuity
- Multiple stops supported; pricing rules configurable by tenant within platform limits.
- Split-pay across multiple payers and/or payment methods.
- Gratuity presets configurable (or rider-defined free entry).

### 4.4 Cancellations, no-shows, support
- Cancellation/no-show policies configurable by tenant within platform constraints, and disclosed before confirmation.
- Support case tracking: issue types, attachments, status, resolution, potential SLA credits.

### 4.5 Ratings and feedback
- Rider can rate: driver, vehicle, cleanliness, friendliness (1–5) + optional textual feedback (max length configurable).
- Rider can report safety/quality incidents tied to a trip.

### 4.6 In-app messaging
- Rider and assigned driver can text-chat live; masked identities; retention policy applies.

---

## 5. Driver application (Progressive Web App (PWA) or native) — end-to-end experience

### 5.1 Onboarding and compliance
- Driver profile form + vehicle form(s).
- In-app photo capture for documents; OCR auto-population; driver confirmation.
- Tenant review/approval and status tracking.
- Compliance expiry gating blocks go-online and acceptance.

### 5.2 Going online and offers
- Driver status: offline/online/busy.
- Offer flow: 5-second ring, auto-hop, GrabBoard claiming.
- Real-time earnings + accumulated unpaid balance visible only to the driver.

### 5.3 Navigation and pickup workflow
- Driver sees rider details (industry standard): rider first name + initial, pickup pin, pickup notes, passenger count, luggage count.
- Google Maps deep-link navigation to pickup and destination (no platform routing cost requirement).
- Arrival detection: within 50 feet + stationary 60 seconds triggers “Arrived” and starts wait timer.
- Wait-time fees accrue per tenant-configured rates (bounded by platform).

### 5.4 Trip completion, payouts, and early payout
- Trip completion triggers payment capture and ledger entry.
- Payout schedule is tenant-managed (weekly/biweekly/monthly) and visible to driver.
- Early payout requests supported; fee tiers configurable by platform (lower fee for longer hold, higher for instant).

### 5.5 Destination mode, airport queueing, chat/voice
- Destination Mode: no daily cap; policy controls at driver/region/tenant with precedence.
- Airport prequeue and activation with fairness caps.
- In-app chat required; voice optional and feature-gated.

### 5.6 Scheduled ride confirmation workflow
- Scheduled rides require explicit driver confirmation within a configurable window.
- Confirmation must consider driver location and travel time to arrive on time.
- If not confirmed: system re-offers and alerts tenant dispatcher board.

### 5.7 Driver↔rider messaging and ratings
- In-app messaging with rider; masked identities; retention policy applies.
- Driver can rate rider (1–5) with optional feedback.

---

## 6. Dispatch, matching, airport queue, and fairness

### 6.1 Ring, hop, and fairness
- 5-second ring, auto-hop if not accepted.
- ETA-aware selection; bounded skip logic with cooldown and compensation.

### 6.2 GrabBoard
- Conflict-safe claiming of offers; atomic claim; real-time updates.

### 6.3 Airport Queue 2.0
- Prequeue tokens and active tokens.
- Inner/outer zones; anti-abuse heuristics; fairness metrics.

### 6.4 Destination-aware matching
- Prefer rides aligned with driver destination only when fairness and ETA constraints satisfied.
- Policy precedence: driver override → region policy → tenant default → global default.

### 6.5 Preferred driver/vehicle prioritization (configurable by geography and tenant)
The system must support configurable dispatch prioritization based on verified driver credentials and vehicle class, with region-specific rule packs.

Minimum required rule set (Chicagoland example):
- **Tier 1 (highest priority):** Verified Professional Chauffeur license + vehicle qualifies as Large Luxury Sport Utility Vehicle (SUV) (“black car” class).
- **Tier 2:** Vehicle qualifies as Large Luxury SUV (black car class), even if not chauffeur-licensed.
- **Tier 3:** All other eligible drivers/vehicles.

Additional constraints:
- “Preferred status” must be configurable per region and per tenant (weights, enable/disable, and quotas/caps to avoid starvation).
- “Preferred status” must never violate safety, compliance gating, or fairness constraints.
- If a preferred driver is too far (ETA beyond threshold), the system must consider the next tier.

**Acceptance:**
- Given a Tier 1 and Tier 2 driver are both eligible and within ETA bounds, when matching a new ride in that region, then Tier 1 is offered first.
- Given Tier 1 driver is outside ETA threshold, when matching, then Tier 2 or Tier 3 may be selected.

### 6.6 Blacklists and mutual-block pairing prevention
- Tenant ops and platform ops can block a driver from matching with a specific rider (mutual-block rule).
- Rider can optionally block a driver after a trip (tenant policy controls).
- Block rules are enforced during matching.

### 6.7 Scheduled ride dispatch and confirmation exceptions
- Scheduled rides are matched early; driver confirmation required.
- If not confirmed or driver becomes non-compliant, ride is re-offered; tenant dispatch board is alerted.

---

## 7. Pricing, surge, fees, and policy precedence

### 7.1 Base pricing
- Zone/time/vehicle rules, minimum fares, airport fees, taxes.

### 7.2 Surge pricing
- Demand/supply surge multipliers per zone/product.
- Feature gate: if surge disabled for tenant, multipliers resolve to 1.0.

### 7.3 Surge policy controls and precedence
- Region overrides: caps, disable, kill switch.
- Precedence: region override → tenant surge toggle → global default.
- Propagation within 60 seconds.

### 7.4 Cancellation, no-show, wait-time, luggage, stops, gratuity
- Configurable policies for: cancellation/no-show, wait-time, luggage fees, multi-stop fees, gratuity presets.

---

## 8. Payments, ledger, payouts, and PaySurity integration

### 8.1 Orchestration model
- RideShare calls PaySurity for tokenization, authorization, capture, refund, void.
- PaySurity routes to Fluidpay or Argyle Payments (black box).

### 8.2 Ledger integrity
- Ledger ensures no drift; daily reconciliation with alerts.

### 8.3 Driver payouts (tenant-managed)
- Tenant configures payout schedule and eligibility.
- Drivers see unpaid balance and payout history under tenant branding.
- Early payout requests supported with platform-configurable fees.

---

## 9. Consoles (tenant + platform)

### 9.1 Tenant dispatcher and operations console
- Live operations map: open/assigned/enroute trips; soon-to-be-free drivers; airport queue.
- Manual assignment/reassignment; exception handling; scheduled ride alerts.
- CRUD drivers/vehicles; compliance status; document approvals.
- Pricing and policy controls allowed at tenant scope.
- Disputes/refunds; incident logs; blacklist controls.

### 9.2 Tenant owner console
- Business settings, branding, microsite, policy configuration.
- Fleet management and staff management.
- Reports and analytics (revenue, utilization, cancellations, surge impact, payout totals).

### 9.3 Platform super-admin console
- Seed/CRUD tenants; CRUD/bulk CRUD tenant drivers/vehicles.
- Feature gates and subscription controls per tenant.
- Global policies (destination mode defaults, surge constraints, payout fee tiers, preferred tier weights).
- Kill-switch console for tenant/driver/vehicle.
- Trigger and view automated tests (single or grouped).
- System health dashboard (metrics/logs/alerts) and root-cause surfacing.

---

## 10. Public-facing website (platform marketing) — tenant acquisition

Purpose: attract passenger fleet owners and dispatch companies to become tenants.

Minimum pages (placeholders allowed but must be wired):
- Home (value proposition, CTA)
- Features (dispatch, driver app, rider experience, payments)
- Pricing (tiers, feature gates)
- Industries/Regions (geo landing pages; SEO)
- Case studies/testimonials (placeholder)
- Contact / Request demo (lead form; calendar booking)
- Security & Compliance (high-level)
- Terms/Privacy

Lead capture:
- “Become a Tenant” form collects: company name, fleet size, service area, contact, desired launch date.
- Leads enter platform pipeline (Customer Relationship Management (CRM) stub acceptable but must store in DB and notify platform team).

---

## 11. Observability, monitoring, analytics, and Service Level Objectives (SLOs)

- Health and metrics endpoints: `/health`, `/metrics`.
- Service Level Objectives (SLOs): quote p95 < 300 milliseconds (ms); match p95 < 20 seconds; error rate < 0.5%.
- Centralized logs with correlation identifiers; audit viewer in platform console.
- Google Analytics (GA) on public site and tenant microsites.

---

## 12. Data model (semantic; migrations must implement)

Minimum entities include:
- tenant, tenant_features, users/roles
- rider_profile, payment_methods
- driver_profile, driver_documents, driver_background_checks, driver_credentials
- vehicle, vehicle_documents, vehicle_classification
- trip, trip_stops, trip_events, trip_state_transitions
- offers, grabboard_claims, offer_state_transitions
- policies: region policies, driver overrides, pricing rules, cancellation policies, preferred tier weights
- airport queue tokens and events
- messaging: trip_messages
- ratings: trip_ratings
- payments: payment intents, transactions, refunds, ledger entries, payouts, payout requests

---

## 13. State machines, timers, and contracts (authoritative)

- Trip state machine with allowed transitions and actor permissions.
- Offer state machine: Created → Ringing → Accepted | Expired → Hopped → Claimed → Assigned → Cancelled.
- Airport queue token state machine: Prequeue → Active → Paused → Removed/Expired.
- Timer registry in `timers.json` used by code and versioned.

---

## 14. Application Programming Interface (API) contracts

- OpenAPI (OpenAPI) specification is canonical for endpoints; CI fails if endpoints change without spec updates.
- Admin endpoints for: tenant management, policies, compliance actions, tests, effective policy lookup.

---

## 15. Release management and upgrades

- Web: versioned deployments and cache busting; ability to force refresh for critical updates.
- Native (if used): store release pipeline; backend compatibility via feature flags.

---

## 16. Testing strategy (mandatory)

- Unit tests: pricing/policies/state machines.
- Integration tests: dispatch, PaySurity stubs, OCR pipeline, compliance gating + notifications.
- End-to-end (E2E) tests: rider booking, driver acceptance, trip completion, payouts, messaging, ratings.
- Platform console can trigger tests and display results.

---

## 17. Acceptance test catalog (minimum)
- Compliance expiry gating blocks go-online/accepting; D-14 and D-1 notifications delivered and logged.
- OCR auto-fills doc fields; driver confirms; tenant approves.
- After assignment, rider sees driver live location and ETA refresh every 60 seconds.
- Arrival detection starts wait timer; fees apply per configuration.
- Scheduled ride requires driver confirmation; missing confirmation triggers re-offer and dispatch alert.
- Luggage fee and fit warning + upgrade suggestion operate correctly.
- Split-pay settles correctly and refunds allocate proportionally.
- Surge disable forces multiplier=1.0; regional cap clamps multiplier.
- Destination mode region disable suppresses bias; per-driver override can re-enable.
- Preferred tiering prioritizes Professional Chauffeur + Large Luxury SUV over others (within ETA bounds).
- Kill switches deactivate tenant/driver/vehicle within 60 seconds with audit.
- Mutual-block pairing prevents a blocked driver/rider match.

---

## 18. Non-functional requirements
- Availability 99.9%.
- Accessibility: Web Content Accessibility Guidelines (WCAG) 2.1 AA.
- Privacy: masked contact info; flight details never shown to drivers.
- Security: audit trails for policy and administrative actions.

---

## 19. Flight awareness (privacy)
- Track flight ETA and adjust pickup; never expose flight details to drivers.
- Provider calls cached and rate-limited; PII redacted in driver payloads.

---

## 20. Hard anti-drift rule
If a missing timer/state transition/policy precedence is discovered during build, it must be added to this document before implementation proceeds.
