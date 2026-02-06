# Rideoo-RideShare Platform — Canonical Requirements (v6.1)

**Timestamp (America/Chicago): 2026-02-05 21:16:45**  

**Tenant1 (to be seeded as a test tenant right during the build) Brand:** goldravenia.com  
**Scope:**
**targrt market: posh/ high end/ corporate/ Luxury passengers
**Merged sources (semantic):** `RideShare-chat1-requirements.txt` + `rideshare context.txt`
 Passenger rides first. Multi-tenant, white-label Software as a Service (SaaS) platform with tenant-branded microsites and per-tenant feature gating.  
**Database:** PostgreSQL (PostgreSQL) — **PostgreSQL-only canonical datastore; no Supabase**  
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
- **As-is first (mandatory):** Before implementing any change, the agentic Artificial Intelligence (AI) must run `as_is_scan.md`, populate `requirements_status.md` with evidence links, and update this document with any implemented-but-not-documented requirements (see §1.3 and §1.7).

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

### 1.4 Production readiness gates (GO / NO-GO) (hard gates)
- A release is permitted only if the **GO / NO-GO** evaluation exits successfully in Continuous Integration (CI) (Continuous Integration) and produces deterministic outputs.
- The platform must include a deterministic gate evaluator (e.g., `scripts/go-no-go-gates.js`) that:
  - Reads `out/k6.json`, `out/chaos.json`, and `out/dlq.json` (or equivalent artifacts),
  - Evaluates each gate, emits a human-readable report `out/go-no-go.md`,
  - Exits `0` for GO and `1` for NO-GO so it can block deployments.

**Hard gates (minimum set):**
1) k6 (load test) failure rate < **0.5%**  
2) k6 p95 (95th percentile) latency < **300 milliseconds (ms)**  
3) **Zero** double assignments (no rider assigned to two drivers; no driver assigned two active trips)  
4) **Zero** invalid queue states (airport queue and offer queue state machines must not violate allowed transitions)  
5) Recovery ≤ **5 seconds** after chaos (intentional component failure)  
6) Dead Letter Queue (DLQ) replay projected success ≥ **70%** (dry-run validation)  

### 1.5 Safe deployment automation (canary + rollback) (mandatory)
- Deployments must support canary rollout stages: **25% → 50% → 100%**.
- Automatic rollback must be triggered on any GO / NO-GO gate failure.
- Each deployment must:
  - Tag the release (Git tag),
  - Snapshot runtime configuration (feature flags, policy versions) as deployment proof,
  - Store the GO / NO-GO report artifact in CI.

### 1.6 Reliability validation pipeline (as-is → to-be) (mandatory)
The platform must support and document an end-to-end validation pipeline that can be executed in CI:

- Load test: dispatch storm and quote storm via k6.
- Chaos test: intentionally kill/disable dispatch + notifications for a short interval; validate recovery.
- DLQ analysis: classify transient failures and estimate replay success; provide replay tooling.

### 1.7 Agentic AI audit outputs (required)
In addition to the artifacts in §1.3, the agentic Artificial Intelligence (AI) must be able to produce (and refresh on demand):

- `AS-IS-REPORT.md` — what exists now (features, endpoints, migrations, screens) vs this document.
- `COVERAGE-TABLE.md` — requirement-by-requirement semantic coverage table.
- `coverage.json` — machine-readable coverage output.
- `GAPS-TODO.md` — ordered gap list (P0/P1/P2) with owners and dependencies.
- `PLAN-TO-100.md` — sequenced plan to reach 100% Launch-ready per Definition of Done (DoD).

**Mental model (non-negotiable):** Requirements → Evidence → Gates → Canary → Cutover

---


### 1.8 Milestones and progress reporting (mandatory)

A **milestone** is considered **Completed** only when **all** in-scope requirements are marked **Shippable** (or **Launch-ready**) in `requirements_status.md` **with evidence** per §1.3, and the applicable GO / NO-GO gates in §1.4 pass for the release candidate. Milestones must be reported when they transition to **Completed** and must include links to the evidence artifacts.

**Milestone reporting (required):**
- Update: `progress_report.md` (what changed, what evidence was produced, what is blocked).
- Update: `requirements_status.md` (status + evidence links per requirement).
- If a milestone uncovers implemented-but-not-documented capabilities, update `implemented_not_documented.md` and insert the new requirement text into the relevant section (see §1.7).

**Milestones (minimum set, ordered):**
1) **Platform Foundations completed**
   - Repository structure, environment configuration, feature flags, migrations, seed data, base CI.
   - Core DB schemas for tenants, users, roles, audit logs.

2) **Identity, security, and auditability completed**
   - Authentication (AuthN) (Authentication), authorization (AuthZ) (Authorization), RBAC, rate limiting, kill switches.
   - Audit log viewer + immutable financial audit trail.

3) **Policy Center completed**
   - Draft → validate → publish → rollback; precedence; caching; schema validation; audit diff/history.

4) **Dispatch & real-time system completed**
   - Ring/hop, atomic assignment guarantees (no double assignment), WebSocket/SSE real-time updates, notification fanout.
   - GrabBoard + Airport Queue state machines validated (zero invalid transitions).

5) **Pricing & quoting completed**
   - Vehicle/product pricing rules; surge; upfront quote generation; taxes/fees; precedence rules.
   - Quote storm and dispatch storm load tests wired (k6).

6) **Payments, ledger, and reconciliation completed**
   - PaySurity orchestration; gateway abstraction; capture/refund; double-entry ledger.
   - Daily reconciliation + exception alerts; DLQ handling for payment side effects.

7) **Driver App completed**
   - Onboarding (OCR), compliance expiry tracking, online/offline, offer/accept flows, in-trip flows, proof capture, earnings.
   - Fleet/leased vehicle workflows (if feature-enabled).

8) **Rider App completed**
   - Booking (now/scheduled/hourly), tracking, messaging, ratings, receipts, support intake, consent gates.

9) **Tenant Ops Console completed**
   - Live map, dispatch oversight, reassign, compliance approvals, refunds/adjustments, support queue.

10) **Tenant Owner / Admin Console completed**
   - Branding, user management, policies, pricing toggles within constraints, analytics, payout scheduling controls.

11) **Platform Admin Console completed**
   - Tenant provisioning, feature gating, global policies, test runner, system health, observability dashboards.

12) **Observability, reliability, and safe deployment completed**
   - SLOs, DLQ + replay tooling, chaos tests, k6, GO / NO-GO evaluator, canary + rollback automation.

13) **Public website + tenant microsites completed**
   - SEO, sitemap/robots, lead capture, conversion tracking, compliance pages; white-label microsites.

14) **Feature-gated expansions completed (optional)**
   - Marketplace/ads placements, Chicagoland events ingestion/forecasting (only if enabled).


## 2. Personas, roles, and tenancy model

### 2.1 Personas
- **Rider (End Customer)**: books rides, pays, tracks driver, rates driver/vehicle, manages trip history and receipts.
- **Driver**: completes onboarding/compliance, goes online, accepts offers, navigates, chats, completes trips, views earnings/unpaid balance/payout history.
- **Tenant Dispatcher / Operations Staff (Tenant Ops)**: monitors live operations, intervenes on assignments, manages drivers/vehicles, handles disputes.
- **Tenant Owner / Fleet Operator (Tenant Owner)**: manages business settings, policies, fleet, analytics, staff.
- **Fleet Owner (Fleet Owner)**: owns ≥2 vehicles under a tenant; assigns drivers to vehicles; manages leased vehicle inventory and access.
- **Customer Support Representative (CSR) (Tenant CSR)**: handles rider and driver support cases, refunds, disputes, and incident intake.
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

### 2.4 Role taxonomy (Role-Based Access Control (RBAC)) (authoritative)
**Canonical roles (minimum):**
- PLATFORM_SUPER_ADMIN
- PLATFORM_SUB_SUPER_ADMIN
- TENANT_OWNER
- TENANT_OPS_ADMIN
- TENANT_CSR
- FLEET_OWNER
- DRIVER
- RIDER

**Role mapping rule:**
- Platform roles can operate across tenants (audited).
- Tenant roles are tenant-scoped via `tenant_id`.
- A user may hold multiple roles across tenants only if explicitly granted (audited).

**Acceptance:**
- Given a TENANT_CSR, when they view a support case, then they can only access cases within their tenant.
- Given a PLATFORM_SUB_SUPER_ADMIN, when they perform a kill switch action, then it is audited and visible platform-wide.


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
- Data privacy compliance baseline:
  - Support **California Consumer Privacy Act (CCPA)**-style rights: access, deletion, portability (export).
  - Support **General Data Protection Regulation (GDPR)** data-subject rights where applicable (non-blocking if the business is US-only, but the platform must be capable).
  - Consent capture for analytics/marketing is explicit, logged, and revocable.
- Data Subject Access Request (DSAR) workflow (tenant + platform):
  - Rider and driver can request: export, delete, correct.
  - Requests are logged, status-tracked, and require an authorized admin approval step (Role-Based Access Control (RBAC)).
  - Deletion is implemented as: irreversible erasure where permitted, and legal-hold redaction where required; all actions are auditable.
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
- Tenant-configurable compliance item types (in addition to the defaults): vehicle safety inspection / emissions certificate / city permit; each can be marked required with expiry gating and notification windows.
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

### 3.10 Luxury service standards (mandatory for BlackRavenia tenants unless feature-gated)
The platform must support service-standard enforcement as compliance policy and operational scoring:

- Driver dress code policy (e.g., suit & tie) with attestation + spot-check workflow.
- Vehicle cleanliness policy (interior/exterior) with rider rating signals + ops review.
- Amenities policy (e.g., water bottles stocked) with rider feedback capture.
- Violations:
  - Logged as incidents,
  - Affect driver tiering and dispatch priority (policy-controlled),
  - Can trigger temporary suspension pending review.

**Acceptance:**
- Given a driver has an active “Service Standards Violation” hold, when they attempt to go online, then policy determines whether they are blocked or permitted with reduced priority.


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
- Support case tracking must include incident and insurance claim initiation:
  - Case types include: rider safety incident, vehicle accident, property damage, fare dispute, payment dispute/chargeback, and lost item.
  - Attachments: photos, video, police report reference, witness statement (optional), and trip ID binding.
  - Case lifecycle: open → triage → in-review → resolved/denied → archived; SLA timers and audit trail.
### 4.5 Ratings and feedback
- Rider can rate: driver, vehicle, cleanliness, friendliness (1–5) + optional textual feedback (max length configurable).
- Rider can report safety/quality incidents tied to a trip.

### 4.6 In-app messaging


- Rider and assigned driver can text-chat live; masked identities; retention policy applies.

### 4.7 Consent gates and post-ride requirements (mandatory)
- Cookie consent is a hard gate on web experiences where legally required (policy-controlled by jurisdiction).
- Strong tracking consent is required; no bypass (policy-controlled by jurisdiction).
- Mutual ratings:
  - Rider and driver must both provide a rating after each trip.
  - A comment may be required with reasonable minimum/maximum length (tenant policy within platform constraints).


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
- Driver sees rider details , not the passenger contact info and vice versa. (industry standard): rider first name + initial, pickup pin, pickup notes, passenger count, luggage count.
- Google Maps deep-link navigation to pickup and destination (no platform routing cost requirement).
- Arrival detection: within 50 feet + stationary 60 seconds triggers “Arrived” and starts wait timer.
- Wait-time fees accrue per tenant-configured rates (bounded by platform).

### 5.4 Trip completion, payouts, and early payout
- Trip completion triggers payment capture and ledger entry.
- Payout schedule is tenant-managed (weekly/biweekly/monthly) and visible to driver.
- Early payout requests supported; fee tiers configurable by platform (lower fee for longer hold, higher for instant).

### 5.5 Destination mode, airport queueing, chat/voice
- Voice interface is feature-gated and must support:
  - Driver voice intents (accept/decline, navigate, “arrived”, “start trip”, “end trip”),
  - Rider voice intents (book, status, support intake),
  - Ops voice intents (search trip, reassign, incident note).
- Push-to-talk fallback is required.
- Voice transcripts must be logged and retention must be controlled via Policy Center.

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

### 5.8 Driver types, fleet ownership, and leased vehicle workflows (mandatory)
**Driver types (minimum):**
1) Owner-Operator (driver owns vehicle)
2) Leased Vehicle Driver (lease documents required)

**Fleet Owner rule:**
- A Fleet Owner is defined as an entity with **≥2 vehicles** under a tenant.
- Fleet Owners can:
  - Add/remove drivers per vehicle,
  - Disable a driver’s access to a vehicle instantly (immediate ride ineligibility, unless a ride is already in progress),
  - Mark a vehicle as “Available for lease” (policy-gated).

**Leased vehicle workflows (minimum):**
- Driver can request to lease a listed vehicle (lease request).
- Fleet Owner and/or Tenant Ops can approve/deny with terms (dates, deposit, fees) (all audited).
- Co-driving proposal: driver can propose adding a second driver to the same vehicle.
- Shift exchange: drivers can propose shift exchanges with a driver-defined exchange location/time window.

**Acceptance:**
- When a Fleet Owner removes a driver from a vehicle, then that driver cannot be dispatched rides for that vehicle immediately.


---

## 6. Dispatch, matching, airport queue, and fairness

### 6.1 Ring, hop, and fairness
- 5-second ring, auto-hop if not accepted.
- ETA-aware selection; bounded skip logic with cooldown and compensation.


### 6.1.1 Dispatch guarantees (no double assignment) (mandatory)
- The dispatch engine must guarantee **no double assignment** under concurrency.
- Offer acceptance and trip assignment must be **atomic**.
- Implementation must use one of:
  - PostgreSQL (PostgreSQL) transactional locking (e.g., `SELECT ... FOR UPDATE`),
  - PostgreSQL advisory locks,
  - Optional Redis (Redis) with Lua (Lua) scripts (only as a locking primitive; canonical data remains in PostgreSQL).
- On stale or conflicting acceptance attempts, the system must return HTTP (Hypertext Transfer Protocol) **409 Conflict**.

**Acceptance:**
- Under a dispatch storm test, the system produces zero double assignments and zero invalid queue states.

- Conflict-safe claiming of offers; atomic claim; real-time updates.


### 6.2 GrabBoard

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
- Given a Tier 1 and Tier 2 driver are both eligible and within ETA bounds, when matching a new ride in that region, then Tier 1 is offered first. If more than 1 tier 1 drivers are availble, the driver who has been emptty/ unassigned for the longest duration, gets offered the ride first. samr with lower tier drivers, i.e. if more than 1 tier 2 drivers are available, the driver who has been emptty/ unassigned for the longest duration, gets offered the ride first.
- Given Tier 1 driver is outside ETA threshold, when matching, then Tier 2 or Tier 3 may be selected.

### 6.6 Blacklists and mutual-block pairing prevention
- Tenant ops and platform ops can block a driver from matching with a specific rider (mutual-block rule).
- Rider can optionally block a driver after a trip (tenant policy controls).
- Block rules are enforced during matching.
- System should allow for promotion (upgrade) and demotion of driver tiers by the dispatcher.

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
- Cancellation, no-show, wait-time, luggage, stops, gratuity rules per region.
- Precedence: region → tenant → global default.
- For tenant Gold Ravenia.co, if a driver is already enroute to a pickup, even if it is few seconds, charge the rider a cancellation fee which should be configurable by the super admin and or desgnated sub super admins/ desipatchers, and Tenants (for their own organization). Add language for the same in the terms and conditions that the rider must accept when onboarding. i.e. Tenants define what charges they want to charge/ display on their own portal (microsite), i.e configurable by the tenant admin. tenant admin also decides when each drier gets paid, how much, how frequently (integration with paysurity digital wallets (employer/ employee digital wallet).

- Configurable policies for: cancellation/no-show, wait-time, luggage fees, multi-stop fees, gratuity presets.
- Pass-through fees:
  - Support tolls, airport fees, and other regulated surcharges as separate line items on receipts and driver earnings breakdowns (policy-controlled).
### 7.5 Policy Center (versioned, auditable policy engine) (mandatory)
The platform must implement a **Policy Center** as the authoritative system for runtime behavior that must be configurable, versioned, and audited.

**Policy types (minimum):**
- Destination Mode
- Airport Queue
- Surge
- Driver Tiering and prioritization
- QR bonuses and referral attribution
- Voice enablement and retention
- Message retention and privacy defaults

**Precedence (authoritative):** driver override → region → tenant → global default

**Lifecycle:**
- Draft → Validate → Publish (version increment)
- Rollback to prior version (audited)
- Diff view (who changed what)

**Validation:**
- JSON Schema (JSON Schema) validation (e.g., Ajv (Another JSON Validator) or equivalent)
- Continuous Integration (CI) must fail if invalid schemas or invalid policy instances are committed.

**Caching:**
- Effective policy lookups must support caching with Entity Tag (ETag) semantics.

**Policy Center APIs (minimum):**
- GET `/policy-center/types`
- GET `/policy-center/:type/effective`
- POST `/policy-center/:type/drafts`
- POST `/policy-center/:type/validate`
- POST `/policy-center/:type/publish`
- DELETE `/policy-center/:type/drafts/:id`


---
- Optional policy (feature-gated): driver duty-hours caps and rest-period enforcement (configurable per tenant and jurisdiction).
## 8. Payments, ledger, payouts, and PaySurity integration

### 8.1 Orchestration model
- RideShare calls PaySurity for tokenization, authorization, capture, refund, void.
- PaySurity routes to Fluidpay or Argyle Payments (black box).
- Payment security and compliance:
  - PaySurity must enforce **Payment Card Industry Data Security Standard (PCI DSS)** scope minimization: RideShare never stores Primary Account Number (PAN) or full card data.
  - Store only token + last4 + brand + expiry month/year + billing ZIP (if needed), and only when required.
  - Chargebacks/disputes: capture dispute reason codes, evidence artifacts, and resolution status; auditable.
  - Fraud detection (policy-controlled, feature-gated): velocity limits, unusual booking patterns, device/IP risk signals; emit alerts and optional auto-holds.
### 8.2 Ledger integrity
- Ledger ensures no drift; daily reconciliation with alerts.

### 8.3 Driver payouts (tenant-managed)

### 8.4 QR code attribution, bonuses, and wallet-based incentives (mandatory)
- Each branded vehicle must support a unique Quick Response (QR) code:
  - Attribution tracking (which vehicle/tenant generated the lead),
  - Scan → ride → bonus workflow (policy-controlled),
  - Bonus funding source and settlement recorded in the ledger.
- Branded vehicles can receive dispatch priority boosts (policy-controlled; bounded by fairness).
- Incentives must be represented as ledger entries (double-entry) to avoid drift.

**Acceptance:**
- Given a QR scan generates a new rider booking, when the trip completes, then the configured bonus is created as a ledger entry and is auditable end-to-end.

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

### 11.1 Dead Letter Queue (DLQ), replay tooling, and failure classification (mandatory)
- The platform must implement a Dead Letter Queue (DLQ) for failed asynchronous jobs (dispatch notifications, payment side effects, document OCR).
- DLQ must support:
  - Classification (transient vs permanent),
  - Dry-run replay estimation (projected success rate),
  - Replay execution with idempotency guarantees,
  - Audit log of replay operations.

### 11.2 Chaos testing harness (mandatory)
- The build must include chaos tests that intentionally disrupt:
  - Dispatch service,
  - Notification delivery,
  - Policy cache,
and validate recovery within the GO / NO-GO gates.

### 11.3 Load testing harness (k6) (mandatory)
- The build must include k6 load test scenarios for:
  - Quote storm,
  - Dispatch storm,
  - Airport queue join/activate,
  - Messaging burst.
- Results must be exported to `out/k6.json` (or equivalent) for gate evaluation.

### 11.4 GO / NO-GO integration (mandatory)
- Observability outputs must feed the GO / NO-GO evaluator (see §1.4).


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

Additional mandatory test classes:
- Load tests (k6) must run in CI on a schedule and on release candidates.
- Chaos tests must run at least on release candidates (or nightly).
- DLQ replay tests must validate idempotency and projected success computations.


- Unit tests: pricing/policies/state machines.
- Integration tests: dispatch, PaySurity stubs, OCR pipeline, compliance gating + notifications.
- End-to-end (E2E) tests: rider booking, driver acceptance, trip completion, payouts, messaging, ratings.
- Platform console can trigger tests and display results.

---

## 17. Acceptance test catalog (minimum)

Additional release gate acceptance tests (minimum):
- GO / NO-GO gates evaluate from `out/k6.json`, `out/chaos.json`, `out/dlq.json` and produce `out/go-no-go.md`.
- k6 failure rate < 0.5% and k6 p95 < 300 ms.
- Chaos recovery ≤ 5 seconds.
- DLQ projected replay success ≥ 70%.
- Zero double assignments and zero invalid queue states under dispatch storm.

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

- Backups and disaster recovery:
  - Automated PostgreSQL backups with point-in-time recovery (PITR) (Point-In-Time Recovery).
  - Recovery Point Objective (RPO): ≤ 15 minutes. Recovery Time Objective (RTO): ≤ 4 hours (configurable; stricter targets allowed for premium tiers).
  - Quarterly restore drills and documented runbooks; failures trigger alerts.

---

## 19. Flight awareness (privacy)
- Track flight ETA and adjust pickup; never expose flight details to drivers.
- Provider calls cached and rate-limited; PII redacted in driver payloads.

---

## 20. Hard anti-drift rule
If a missing timer/state transition/policy precedence is discovered during build, it must be added to this document before implementation proceeds.

## 21. Marketplace, ads, and paid placements (feature-gated)
- Tenant microsites and/or platform site may include a Marketplace section for:
  - Emergency recovery offers,
  - Marketing services,
  - Paid placements.
- Paid placements require:
  - Admin approval workflow,
  - Start/end dates,
  - Disclosure labels,
  - Reporting (impressions, clicks, conversions).


## 22. Chicagoland events engine (demand forecasting) (feature-gated)
- The platform must support automated ingestion of events (weekly minimum cadence):
  - Concerts,
  - Sports,
  - Cultural events.
- Ingestion sources may include web scraping and partner feeds (must be policy-controlled, rate-limited, and legally compliant).
- Normalized event fields (minimum):
  - name, venue, geo, start/end date-time, category/type, expected attendance (optional), source URL.
- Events drive demand forecasting for pricing and driver positioning (never overrides fairness or safety policies).


## 23. Provenance appendix (non-authoritative)
This section is **non-authoritative** and exists only to show source traceability for the semantic merge.

- Source A (target authority): `BlackRavenia_RideShare_Canonical_Requirements_v6_1.md`
- Source B (merged): `RideShare-chat1-requirements.txt`
- Source C (merged context): `rideshare context.txt`

All requirements in Sources B and C have been incorporated into the authoritative sections above. If an omission is discovered, the omission must be added above (not here) per §20 Hard anti-drift rule.


