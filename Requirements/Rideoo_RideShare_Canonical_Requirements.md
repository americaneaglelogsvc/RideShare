# Rideoo-RideShare Platform â€” Canonical Requirements (v6.1, rev v10)

**Timestamp (America/Chicago): 2026-02-17 21:45**  

**Repo:** `PaySurity-Biz/RideShare` (https://github.com/PaySurity-Biz/RideShare)
**Canonical location in repo:** `Requirements/Rideoo_RideShare_Canonical_Requirements.md` (copy also at repo root for tooling)


**Seed tenants (test data during build):**  
- **GoldRavenia** (sample tenant): goldravenia.com  
- **BlackRavenia** (sample tenant): blackravenia.com  

**Scope:** Passenger rides first. Multi-tenant, white-label SaaS. **Rideoo is the software provider; tenants are the service providers** (ops/compliance/insurance are tenant responsibilities).  

**Target market:** Posh / high-end / corporate / luxury passenger transportation (tenant-configurable to support any passenger vehicle/fleet).  

**Merged sources (semantic):** `RideShare-chat1-requirements.txt` + `rideshare context.txt`  
**Database:** PostgreSQL-only canonical datastore; no Supabase.  
**Maps & Infrastructure:** GCP-first (GCS, Cloud SQL, Maps, FCM, GA, Workspace).  
**Payments:** PaySurity (internal) as orchestration layer; Fluidpay and Argyle Payments are treated as black-box gateways for tenants and drivers (white-labeled under PaySurity).  
**Optional future integration:** American Eagle Logistics (AEL) for package/courier opportunities (feature-gated; passenger rides remain the primary product).

> **Single requirements authority:** This document is the ONLY build authority.  
> **Semantic matching:** The agentic AI must evaluate â€œas-isâ€ status by meaning and end-to-end coverage, not by Requirement Identifier (REQ ID) matching.

---

## 0. Requirements Index (req_id â†’ DoD)

This index is the parsing surface for traceability and DoD gating.

| req_id | title | scope | DoD |
|---|---|---|---|
| TEN-BASE-0001 | Tenant provisioning + isolation | platform | DOD-API;DOD-DB;DOD-TEST;DOD-AUDIT |
| TEN-BASE-0002 | Tenant RBAC + roles | platform | DOD-UI;DOD-API;DOD-TEST;DOD-AUDIT |
| CFG-TEN-0001 | Tenant config schema + versioning | tenant | DOD-UI;DOD-API;DOD-TEST;DOD-AUDIT |
| CFG-PLAT-0001 | Platform config schema + versioning | platform | DOD-UI;DOD-API;DOD-TEST;DOD-AUDIT |
| TEN-POL-0001 | Policy Center enable-only | tenant | DOD-UI;DOD-API;DOD-TEST;DOD-AUDIT |
| TEN-POL-0002 | Templates disclaimer + ack + audit | tenant | DOD-UI;DOD-API;DOD-TEST;DOD-AUDIT |
| MIC-WGT-0001 | Tenant microsite booking + quote widget | tenant | DOD-UI;DOD-API;DOD-TEST |
| MIC-PUB-0001 | Static-first microsite publish + CDN | platform | DOD-INFRA;DOD-OPS;DOD-TEST |
| RID-WEB-0001 | Rider web booking flow (tenant-scoped) | rider | DOD-UI;DOD-API;DOD-TEST |
| RID-MOB-0001 | Rider mobile booking flow (tenant-scoped) | rider | DOD-UI;DOD-API;DOD-TEST |
| DRV-WEB-0001 | Driver web core flows (tenant-scoped) | driver | DOD-UI;DOD-API;DOD-TEST |
| DRV-MOB-0001 | Driver mobile core flows (tenant-scoped) | driver | DOD-UI;DOD-API;DOD-TEST |
| DIS-REAL-0001 | WS realtime primary + SSE/poll fallback | platform | DOD-REALTIME;DOD-OPS;DOD-TEST |
| DIS-OFR-0001 | Offer lifecycle state machine | tenant | DOD-API;DOD-DB;DOD-TEST;DOD-AUDIT |
| TRP-STM-0001 | Trip state machine + transitions | tenant | DOD-API;DOD-DB;DOD-TEST;DOD-AUDIT |
| PAY-FLOW-0100 | Tenant-wide funds routing when platform-paid payouts enabled | tenant | DOD-MONEY;DOD-API;DOD-DB;DOD-TEST;DOD-AUDIT |
| PAY-SETL-0001 | Payout gating by bank_settled when platform-paid | tenant | DOD-MONEY;DOD-API;DOD-TEST;DOD-AUDIT |
| PAY-ADJ-0001 | Adjustments + clawbacks + recovery | tenant | DOD-MONEY;DOD-API;DOD-DB;DOD-TEST;DOD-AUDIT |
| BILL-INV-0001 | Invoices + pricing plans + fees (platform-controlled) | platform | DOD-MONEY;DOD-UI;DOD-API;DOD-TEST;DOD-AUDIT |
| BILL-AUTO-0001 | Billing autopull (as-needed + scheduled) + dunning | platform | DOD-MONEY;DOD-API;DOD-JOBS;DOD-TEST;DOD-OPS |
| JOB-QUE-0001 | DB-backed job queue + DLQ + replay tooling | platform | DOD-JOBS;DOD-OPS;DOD-TEST |
| NOT-PUSH-0001 | Push notifications interface + FCM provider | platform | DOD-OPS;DOD-TEST |
| DOC-STO-0001 | Object storage for uploads + retention | platform | DOD-API;DOD-OPS;DOD-TEST |
| AUD-EVT-0001 | Audit event taxonomy (money + state changes) | platform | DOD-AUDIT;DOD-API;DOD-DB;DOD-TEST |
| OBS-DASH-0001 | Ops dashboards (realtime, dispatch, payments, jobs) | platform | DOD-OPS;DOD-TEST |
| TAX-1099-0001 | Driver earnings summary + export 1099 layout | tenant | DOD-MONEY;DOD-UI;DOD-API;DOD-TEST;DOD-AUDIT |
| UI-FAQ-0001 | Public FAQs page + bot training dataset | platform | DOD-UI;DOD-TEST |
| API-IDEM-0001 | Idempotency keys for all writes | platform | DOD-API;DOD-DB;DOD-TEST |
| API-ERR-0001 | Standard error codes + version conflicts | platform | DOD-API;DOD-TEST |
| MAP-GEO-0001 | Geo calc + rounding + units | platform | DOD-API;DOD-TEST |
| TIME-TZ-0001 | Timezone rules (UTC storage; tenant-local display) | platform | DOD-API;DOD-TEST |
| GCP-ARCH-0001 | GCP hosting baseline (Cloud Run + Cloud SQL + GCS + CDN) | platform | DOD-INFRA;DOD-OPS |
| GCP-ARCH-0002 | Tenant microsite domains + TLS + canonical behavior | platform | DOD-INFRA;DOD-OPS;DOD-TEST |
| DRV-MULT-0001 | Driver can accept multiple trips; no platform overlap enforcement | driver | DOD-API;DOD-DB;DOD-TEST;DOD-AUDIT |

**DoD tokens (authoritative):** DOD-UI, DOD-API, DOD-DB, DOD-TEST, DOD-AUDIT, DOD-MONEY, DOD-OPS, DOD-INFRA, DOD-REALTIME, DOD-JOBS.

---

## 1. Product governance, anti-drift guardrails, and evidence-based progress

### 1.1 Canonical build rules (strict)
- The build must be implemented against the semantics in this document.
- No capability can be marked â€œImplementedâ€ or â€œTestedâ€ without evidence links.
- **As-is first (mandatory):** Before implementing any change, the agentic AI must run `as_is_scan.md`, populate `requirements_status.md` with evidence links, and update this document with any implemented-but-not-documented requirements (see Â§1.3 and Â§1.7).

### 1.2 DoD (strict by default)
For each capability in this document:

- **Designed**: screen(s) and flow(s) exist in `screen_index.md`, and relevant state machine/timers are specified.
- **Implemented**: end-to-end path exists: UI â†’ API â†’ DB â†’ side effects (notifications, policy propagation, ledger entries).
- **Tested**: automated tests exist and pass in CI for happy-path and key negative-paths.
- **Shippable**: deployed to staging with smoke tests passing; observability signals visible (metrics/logs/alerts).
- **Launch-ready**: shippable + operational playbooks + tenant onboarding + compliance workflows + incident response runbooks.

### 1.3 Required build artifacts (must be produced by agentic AI)
The agentic AI must generate and maintain:

1) `as_is_scan.md` â€” deterministic scan: stack, services, endpoints, migrations, tests, workflows.  
2) `requirements_status.md` â€” semantic checklist mapping each capability to Not Started / In Progress / Implemented / Tested / Blocked, with evidence links.  
3) `progress_report.md` â€” time-stamped deltas since last scan + risks + next actions, all evidence-linked.  
4) `implemented_not_documented.md` â€” implemented code not covered in this document, with evidence.

**Evidence gates (non-negotiable):**
- â€œImplementedâ€ requires: file paths + API routes/endpoints + DB migrations/queries.  
- â€œTestedâ€ requires: test file paths + CI proof (workflow + run output reference).  
- â€œShippableâ€ requires: staging deployment reference + smoke test evidence.

### 1.4 Production readiness gates (GO / NO-GO) (hard gates)
- A release is permitted only if the **GO / NO-GO** evaluation exits successfully in CI and produces deterministic outputs.
- The platform must include a deterministic gate evaluator (e.g., `scripts/go-no-go-gates.js`) that:
  - Reads `out/k6.json`, `out/chaos.json`, and `out/dlq.json` (or equivalent artifacts),
  - Evaluates each gate, emits a human-readable report `out/go-no-go.md`,
  - Exits `0` for GO and `1` for NO-GO so it can block deployments.

**Hard gates (minimum set):**
1) k6 (load test) failure rate < **0.5%**  
2) k6 p95 latency < **300 milliseconds (ms)**  
3) **Zero** double assignments (no rider assigned to two drivers; no driver assigned two active trips)  
4) **Zero** invalid queue states (airport queue and offer queue state machines must not violate allowed transitions)  
5) Recovery â‰¤ **5 seconds** after chaos (intentional component failure)  
6) DLQ replay projected success â‰¥ **70%** (dry-run validation)  

### 1.5 Safe deployment automation (canary + rollback) (mandatory)
- Deployments must support canary rollout stages: **25% â†’ 50% â†’ 100%**.
- Automatic rollback must be triggered on any GO / NO-GO gate failure.
- Each deployment must:
  - Tag the release (Git tag),
  - Snapshot runtime configuration (feature flags, policy versions) as deployment proof,
  - Store the GO / NO-GO report artifact in CI.

### 1.6 Reliability validation pipeline (as-is â†’ to-be) (mandatory)
The platform must support and document an end-to-end validation pipeline that can be executed in CI:

- Load test: dispatch storm and quote storm via k6.
- Chaos test: intentionally kill/disable dispatch + notifications for a short interval; validate recovery.
- DLQ analysis: classify transient failures and estimate replay success; provide replay tooling.

### 1.7 Agentic AI audit outputs (required)
In addition to the artifacts in Â§1.3, the agentic AI must be able to produce (and refresh on demand):

- `AS-IS-REPORT.md` â€” what exists now (features, endpoints, migrations, screens) vs this document.
- `COVERAGE-TABLE.md` â€” requirement-by-requirement semantic coverage table.
- `coverage.json` â€” machine-readable coverage output.
- `GAPS-TODO.md` â€” ordered gap list (P0/P1/P2) with owners and dependencies.
- `PLAN-TO-100.md` â€” sequenced plan to reach 100% Launch-ready per DoD.

**Mental model (non-negotiable):** Requirements â†’ Evidence â†’ Gates â†’ Canary â†’ Cutover

---


### 1.8 Milestones and progress reporting (mandatory)

A **milestone** is considered **Completed** only when **all** in-scope requirements are marked **Shippable** (or **Launch-ready**) in `requirements_status.md` **with evidence** per Â§1.3, and the applicable GO / NO-GO gates in Â§1.4 pass for the release candidate. Milestones must be reported when they transition to **Completed** and must include links to the evidence artifacts.

**Milestone reporting (required):**
- Update: `progress_report.md` (what changed, what evidence was produced, what is blocked).
- Update: `requirements_status.md` (status + evidence links per requirement).
- If a milestone uncovers implemented-but-not-documented capabilities, update `implemented_not_documented.md` and insert the new requirement text into the relevant section (see Â§1.7).

**Milestones (minimum set, ordered):**
1) **Platform Foundations completed**
   - Repository structure, environment configuration, feature flags, migrations, seed data, base CI.
   - Core DB schemas for tenants, users, roles, audit logs.

2) **Identity, security, and auditability completed**
   - AuthN, AuthZ, RBAC, rate limiting, kill switches.
   - Audit log viewer + immutable financial audit trail.

3) **Policy Center completed**
   - Draft â†’ validate â†’ publish â†’ rollback; precedence; caching; schema validation; audit diff/history.

4) **Dispatch & real-time system completed**
   - Ring/hop, single-assignment integrity (no double assignment), WebSocket real-time updates (primary) with SSE fallback and short-poll fallback, notification fanout.
   - GrabBoard + Airport Queue state machines validated (zero invalid transitions).

5) **Pricing & quoting completed**
   - Vehicle/product pricing rules; surge; upfront quote generation; taxes/fees; precedence rules.
   - Quote storm and dispatch storm load tests wired (k6).

6) **Payments, ledger, and reconciliation completed**
   - PaySurity orchestration; gateway abstraction; capture/refund; double-entry ledger.
   - Daily reconciliation + exception alerts; DLQ handling for payment side effects.

7) **Driver App completed**
   - Onboarding OCR, compliance expiry tracking, online/offline, offer/accept flows, in-trip flows, proof capture, earnings.
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


## 1.9 Hosting, environments, and GCP target architecture (mandatory)

**ENV-0001 â€” Environments**
- Must support `dev`, `staging`, `prod` with isolated configs and credentials.
- `staging` must be production-like and used for GO / NO-GO gates.

**GCP-ARCH-0001 â€” Required GCP services (baseline)**
- Compute: Cloud Run (services + workers) OR GKE (optional later)
- DB: Cloud SQL (PostgreSQL)
- Object storage: GCS (documents, images, receipts, exports)
- CDN + static hosting: GCS static site + Cloud CDN (platform web + tenant microsites)
- Network/WAF: Cloud Load Balancing + Cloud Armor
- Secrets: Secret Manager
- Observability: Cloud Logging + Cloud Monitoring
- Jobs: Cloud Tasks and/or Pub/Sub with dead-letter topic(s) DLQ
- Push notifications: FCM (Android/web) + APNs via FCM (iOS)
- Analytics: GA (platform site + tenant microsites)

**GCP-ARCH-0002 â€” Tenant microsites hosting cost policy**
- Tenant microsites are hosted under Rideooâ€™s umbrella (shared GCP infra).
- Cost impact is primarily bandwidth + storage; static-first + CDN keeps marginal cost low per tenant.
- Per-tenant domain mappings must be automated (primary domain + aliases).

**GCP-AUTH-0001 â€” GitHub Actions â†” GCP auth (pinned)**
- CI/CD must use **OIDC + WIF** (no long-lived SA key JSON in GitHub secrets).
- A repo-scoped CI identity (SA) must be impersonated by GitHub Actions via WIF.
- Repo Variables required: `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WIF_PROVIDER`, `GCP_SA_EMAIL`.

**GCP-CD-0001 â€” Deploy pipeline (pinned)**
- GitHub Actions is the primary CD engine.
- `main` deploys to `staging` by default; `prod` deploy requires GO/NO-GO gate.
- Deploys target Cloud Run services; public exposure is explicit per service (default deny).

**DoD Evidence**
- IaC (Terraform) or scripted provisioning exists for baseline resources.
- Secrets are stored only in Secret Manager; no secrets in repo.

---

## 2. Personas, roles, and tenancy model

### 2.1 Personas
- **Rider (End Customer)**: books rides, pays, tracks driver, rates driver/vehicle, manages trip history and receipts.
- **Driver**: completes onboarding/compliance, goes online, accepts offers, navigates, chats, completes trips, views earnings/unpaid balance/payout history.
- **Tenant Dispatcher / Operations Staff (Tenant Ops)**: monitors live operations, intervenes on assignments, manages drivers/vehicles, handles disputes.
- **Tenant Owner / Fleet Operator (Tenant Owner)**: manages business settings, policies, fleet, analytics, staff.
- **Fleet Owner (Fleet Owner)**: owns â‰¥2 vehicles under a tenant; assigns drivers to vehicles; manages leased vehicle inventory and access.
- **Customer Support Representative (CSR) (Tenant CSR)**: handles rider and driver support cases, refunds, disputes, and incident intake.
- **Platform Super Admin (Platform Owner)**: seeds/CRUD tenants, global policies, feature gates, pricing constraints, monitoring, kill switches, test execution.
- **Platform Sub-Super Admin (Platform Staff)**: delegated platform ops, support, compliance review, incident response.

### 2.2 Tenancy and data isolation
- Every relevant row includes `tenant_id`.
- Tenants see only their own riders, drivers, vehicles, trips, payouts, messages, ratings, policies, analytics.
- Platform Super Admin (and authorized platform staff) can view all tenant data for operations, compliance, auditing, and support.

**Acceptance:**
- Given Tenant A and Tenant B exist, when a Tenant A user queries trips, then only Tenant A trips are returned.


### 2.2A Platform config + tenant config objects (authoritative)

**CFG-PLAT-0001 â€” platform_config (platform-scoped; Super Admin only)**
- The platform must store a single versioned `platform_config` object that defines:
  - platform fee catalog (fee_code, basis, limits)
  - billing autopull policy (schedules, retries, dunning states)
  - platform safety caps (max limits tenants cannot exceed)
  - feature gates (per plan + per tenant override)
  - required disclosure text blocks (immutable core text + versioned updates)
  - global reference data seeds (optional; tenants may override locally)

**CFG-TEN-0001 â€” tenant_config (tenant-scoped; tenant admin within platform caps)**
- Each tenant must store a versioned `tenant_config` object that defines:
  - branding + microsite settings (template, tokens, domains, SEO)
  - pricing + quote rules (service classes, pricing params)
  - airport rules (FIFO vs pre-entry, thresholds)
  - dispatch config (ring timers, queue logic, manual/auto toggles)
  - policy_center link (current `tenant_policy_config` version id)
  - driver/rider UX toggles (within platform caps)

**CFG-JSON-0001 â€” JSON schema requirement**
- `platform_config`, `tenant_config`, and `tenant_policy_config` must be JSON-schema validated on:
  - save (draft)
  - publish (active)
- Each publish must be an explicit action that:
  - persists a full immutable snapshot
  - records an audit event with diff summary
  - supports rollback to a prior version

**CFG-JSON-0002 â€” Minimum keys (non-exhaustive)**
```json
{
  "platform_config": {
    "schema_version": "1.0",
    "plans": [],
    "fee_catalog": [],
    "billing_policy": { "autopull": { "enabled": true }, "dunning": {} },
    "caps": {},
    "feature_flags": {},
    "required_disclosures": {}
  },
  "tenant_config": {
    "schema_version": "1.0",
    "branding": {},
    "microsite": { "template_id": "", "domains": { "primary": "" }, "booking_widget": { "enabled": true } },
    "dispatch": {},
    "airports": {},
    "pricing": {},
    "policy_center": { "active_policy_version_id": "" }
  }
}
```

### 2.3 White-label branding

- Rider and Driver experiences are branded per tenant (colors, logo, copy, domains, microsites).
- **Tenant-scoped driver UX:** drivers only see data for the tenant they are currently authenticated into. There is **no consolidated multi-tenant driver dashboard** (no aggregated earnings/trips/payouts across tenants).
- Drivers may work with multiple tenants by authenticating separately into each tenantâ€™s driver experience (separate sessions; tenant data isolation preserved).
- **Money presentation rule:** driver receipts and payout history must show:
  - `Paid by: {TenantName}`
  - `Processed via: Rideoo`
  - Support-only/internal details may show payout rail funding truth (Rideoo/PaySurity).
- Platform records the financial truth via ledger; external gateway identities remain abstracted behind PaySurity rails unless explicitly required for support/audit.

### 2.4 Role taxonomy RBAC (authoritative)
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



### 3.X Legal pack + liability positioning (required)

**RIDE-LEGAL-010 â€” Required legal documents (versioned + signed acceptance)**
- Tenant SaaS agreement + autopay authorization (ACH debit consent + fallback)
- Tenant admin T&Cs, Driver T&Cs, Rider T&Cs
- Privacy policy + data processing terms (tenant vs platform responsibilities)
- Dispute routing policy: tenant handles rider/driver disputes; platform provides logs + tooling

**RIDE-LEGAL-020 â€” Indemnity + defense**
- Tenants must indemnify and defend the platform (and owners/affiliates) for claims arising from rides, driver conduct, vehicle compliance, insurance, and local regulatory compliance.
- Platform is a SaaS provider; tenant is responsible for operations, compliance, insurance, and dispute resolution.

### 3.1 Authentication and authorization
- Authentication: JSON Web Token (JWT) sessions.
- Authorization: RBAC with least privilege.
- Audit logs for admin/policy/financial actions: who/what/when/where (tenant, user, IP).

### 3.2 Rate limiting and abuse prevention
- WAF + throttling for login, trip creation, payment attempts, messaging.
- 429 responses include Retry-After.



**RIDE-BOOK-ANTI-010 â€” Cross-tenant â€œshoppingâ€ is not blocked (pinned)**
- The platform must not detect-and-block a rider from placing similar bookings across multiple tenants.
- The platform must not disclose cross-tenant booking activity to tenants.
- Tenant-local duplicate booking controls may exist only within the same tenant, if tenant enables them via Policy Center.

### 3.3 PII minimization
- Data retention policies for sensitive fields.
- Export/delete tooling for tenant data, subject to legal retention.
- Data privacy compliance baseline:
  - Support **California Consumer Privacy Act (CCPA)**-style rights: access, deletion, portability (export).
  - Support **General Data Protection Regulation (GDPR)** data-subject rights where applicable (non-blocking if the business is US-only, but the platform must be capable).
  - Consent capture for analytics/marketing is explicit, logged, and revocable.
- Data Subject Access Request (DSAR) workflow (tenant + platform):
  - Rider and driver can request: export, delete, correct.
  - Requests are logged, status-tracked, and require an authorized admin approval step RBAC.
  - Deletion is implemented as: irreversible erasure where permitted, and legal-hold redaction where required; all actions are auditable.
### 3.4 Masked communications and messaging retention
- Riders and drivers must not see each otherâ€™s phone or email.
- In-app messaging is required; optional voice is feature-gated.
- Messages retained for industry-standard period (default 180 days), configurable per tenant and platform policy.

### 3.5 Driver compliance gating (expiry + notifications)
- Driver cannot go online or accept trips if any required compliance item is expired:
  - driverâ€™s license,
  - vehicle insurance,
  - vehicle registration.
- Optional strict mode: block login (default: allow login but restrict to compliance remediation + earnings views).
- Notifications at D-14 and D-1 before expiry to driver and tenant operations contacts; delivery is logged.
- Tenant-configurable compliance item types (in addition to the defaults): vehicle safety inspection / emissions certificate / city permit; each can be marked required with expiry gating and notification windows.
### 3.6 Document capture with OCR auto-population
- Driver/vehicle document screens allow in-app camera capture.
- OCR parses documents to prefill fields (document number, expiry, name, plate, VIN (Vehicle Identification Number)).
- Driver must review and confirm extracted data; edits are audited.

### 3.7 License status validation and background checks (pluggable)
- Pluggable provider model for:
  - license status (active/suspended/revoked) and Motor Vehicle Record (MVR),
  - background screening,
  - re-screening intervals (configurable) and incident-triggered re-checks.
- Minimum viable: driver attestation + tenant review + scheduled reminders; provider integration is strongly recommended.

### 3.8 Optional specialized credentials for preferred dispatch status (feature-gated)
- Driver profile includes optional section: â€œAlso open to Package/Courier Opportunities.â€
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
- Given a driver has an active â€œService Standards Violationâ€ hold, when they attempt to go online, then policy determines whether they are blocked or permitted with reduced priority.


---

## 4. Rider application (Web + mobile required; seamless sync) â€” end-to-end experience

**RIDE-APP-SYNC-010 â€” Rider Web + mobile parity + sync (mandatory)**
- Rider experience must be available as:
  - Rideoo Rider Web App (responsive, latest web tech)
  - Rideoo Rider Mobile App (iOS + Android)
- Core flows must be feature-parity across web and mobile (booking, tracking, chat, receipts, support).
- Cross-device state must remain consistent (same rider logged in on multiple devices):
  - real-time updates for trip state, driver location, and messages,
  - idempotency keys for all rider actions that change state (book, cancel, tip, support).
- Tenant branding must apply consistently across all rider surfaces (tenant domains/microsite widget, web app, mobile app).



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
- Cancellation/no-show policies are tenant-configurable via Policy Center (enable-only; OFF until tenant enables) and disclosed before confirmation. Platform constraints apply only for system integrity/safety.
- Support case tracking: issue types, attachments, status, resolution, potential SLA credits.
- Support case tracking must include incident and insurance claim initiation:
  - Case types include: rider safety incident, vehicle accident, property damage, fare dispute, payment dispute/chargeback, and lost item.
  - Attachments: photos, video, police report reference, witness statement (optional), and trip ID binding.
  - Case lifecycle: open â†’ triage â†’ in-review â†’ resolved/denied â†’ archived; SLA timers and audit trail.
### 4.5 Ratings and feedback
- Rider can rate: driver, vehicle, cleanliness, friendliness (1â€“5) + optional textual feedback (max length configurable).
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

## 5. Driver application (Web + mobile required; seamless sync; tenant-scoped) â€” end-to-end experience

**DRV-APP-SYNC-010 â€” Driver Web + mobile parity + sync (mandatory)**
- Driver experience must be available as:
  - Rideoo Driver Web App (responsive)
  - Rideoo Driver Mobile App (iOS + Android)
- Core flows must be feature-parity across web and mobile (onboarding, offers, navigation deep-link, trip execution, earnings, receipts, support).
- **Tenant-scoped UX:** driver sees only the currently authenticated tenant context; no consolidated cross-tenant stats or payouts UI.
- Cross-device state must remain consistent:
  - offer updates + trip state + chat are real-time,
  - idempotency keys for state-changing driver actions (accept, arrive, start, complete, cancel).



### 5.1 Onboarding and compliance
- Driver profile form + vehicle form(s).
- In-app photo capture for documents; OCR auto-population; driver confirmation.
- Tenant review/approval and status tracking.
- Compliance expiries are recorded and surfaced. If tenant enables gating in Policy Center, go-online/accept can be blocked; otherwise platform is enable-only.

### 5.2 Going online and offers
- No trip handoff/transfer feature exists in Rideoo. Any off-platform delegation is outside scope; Rideoo records only the in-app driver actions and trip state timeline.
- Driver status is tenant-local: offline/online/busy (busy is not global across tenants).
- Offer flow parameters are tenant-configurable via Policy Center (ring duration, offer expiry, hop strategy, GrabBoard use). No tenant business defaults are imposed by platform.
- Real-time earnings + accumulated unpaid balance visible to the driver within tenant context; tenant staff see tenant-scoped views; platform staff see cross-tenant views RBAC.

### 5.3 Navigation and pickup workflow
- Driver sees rider details , not the passenger contact info and vice versa. (industry standard): rider first name + initial, pickup pin, pickup notes, passenger count, luggage count.
- Google Maps deep-link navigation to pickup and destination (no platform routing cost requirement).
- Arrival detection and wait timer behavior are tenant-configurable (geo radius, stationary time, manual override). OFF until tenant enables automated timers.
- Wait-time fees accrue only if tenant enables and configures them in Policy Center; platform provides enable/automation capability only.

### 5.4 Trip completion, payouts, and early payout
- Trip completion triggers payment capture and ledger entry.
- Payout scheduling is tenant-configurable. If platform-triggered payouts are enabled for the tenant, eligibility is gated by Completely Settled (bank_settled) and driver sees pending/eligible/paid states.
- Early payout requests supported; fee tiers configurable by platform (lower fee for longer hold, higher for instant).

### 5.5 Destination mode, airport queueing, chat/voice
- Voice interface is feature-gated and must support:
  - Driver voice intents (accept/decline, navigate, â€œarrivedâ€, â€œstart tripâ€, â€œend tripâ€),
  - Rider voice intents (book, status, support intake),
  - Ops voice intents (search trip, reassign, incident note).
- Push-to-talk fallback is required.
- Voice transcripts must be logged and retention must be controlled via Policy Center.

- Destination Mode: no daily cap; policy controls are tenant-configured (driver preferences honored only if tenant enables); templates are optional and non-authoritative.
- Airport prequeue and activation with fairness caps.
- In-app chat required; voice optional and feature-gated.

### 5.6 Scheduled ride confirmation workflow
- Scheduled rides require explicit driver confirmation within a configurable window.
- Confirmation must consider driver location and travel time to arrive on time.
- If not confirmed: system re-offers and alerts tenant dispatcher board.

### 5.7 Driverâ†”rider messaging and ratings


- In-app messaging with rider; masked identities; retention policy applies.
- Driver can rate rider (1â€“5) with optional feedback.

### 5.8 Driver types, fleet ownership, and leased vehicle workflows (mandatory)
**Driver types (minimum):**
1) Owner-Operator (driver owns vehicle)
2) Leased Vehicle Driver (lease documents required)

**Fleet Owner rule:**
- A Fleet Owner is defined as an entity with **â‰¥2 vehicles** under a tenant.
- Fleet Owners can:
  - Add/remove drivers per vehicle,
  - Disable a driverâ€™s access to a vehicle instantly (immediate ride ineligibility, unless a ride is already in progress),
  - Mark a vehicle as â€œAvailable for leaseâ€ (policy-gated).

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
- Per trip (within a tenant): **first accept wins**; all later accept attempts must fail with **409 Conflict**.
- Driver is allowed to accept **multiple trips**; platform must not apply overlap rejection or duty-hour enforcement unless tenant explicitly enables it.
- Implementation must use one of:
  - PostgreSQL transactional locking (e.g., `SELECT ... FOR UPDATE`),
  - PostgreSQL advisory locks,
  - Optional Redis + Lua as a locking primitive (canonical data remains in PostgreSQL).

**Acceptance:**
- Under a dispatch storm test, the system produces zero double assignments and zero invalid queue states.

- Conflict-safe claiming of offers; atomic claim; real-time updates.


### 6.2 GrabBoard

### 6.3 Airport Queue 2.0
- Prequeue tokens and active tokens.
- Inner/outer zones; anti-abuse heuristics; fairness metrics.

### 6.4 Destination-aware matching
- Prefer rides aligned with driver destination only when fairness and ETA constraints satisfied.
- Policy precedence: tenant-configured policy â†’ driver preferences (only if tenant enables) â†’ optional templates (non-authoritative).

### 6.5 Preferred driver/vehicle prioritization (configurable by geography and tenant)
The system must support configurable dispatch prioritization based on verified driver credentials and vehicle class, with region-specific rule packs.

Minimum required rule set (Chicagoland example):
- **Tier 1 (highest priority):** Verified Professional Chauffeur license + vehicle qualifies as Large Luxury Sport Utility Vehicle (SUV) (â€œblack carâ€ class).
- **Tier 2:** Vehicle qualifies as Large Luxury SUV (black car class), even if not chauffeur-licensed.
- **Tier 3:** All other eligible drivers/vehicles.

Additional constraints:
- â€œPreferred statusâ€ must be configurable per region and per tenant (weights, enable/disable, and quotas/caps to avoid starvation).
- â€œPreferred statusâ€ must never violate safety, compliance gating, or fairness constraints.
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
- Precedence: region override â†’ tenant surge toggle â†’ seed template.
- Propagation within 60 seconds.

### 7.4 Cancellation, no-show, wait-time, luggage, stops, gratuity
- Enable-only tenant-config policies (no auto-applied platform defaults).
- Each policy module starts **disabled** until tenant publishes an enabled version in Policy Center.
- Tenant can define any rules for: cancellation/no-show, wait-time, luggage, multi-stop, gratuity presets, and surcharges (tolls, airport fees, regulated add-ons) as separate line items.
- Rider UI must always show any enabled fees/surcharges before booking confirmation.
- Driver UI must show an earnings breakdown by line item and policy version id.
- Precedence is tenant-configurable; platform may ship seed templates as non-authoritative starting points (tenant ack + audit required).

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

**Precedence:** tenant-configurable (stored in Policy Center); if unset, treat as tenant-only

**Lifecycle:**
- Draft â†’ Validate â†’ Publish (version increment)
- Rollback to prior version (audited)
- Diff view (who changed what)

**Validation:**
- JSON Schema validation (e.g., Ajv or equivalent)
- CI must fail if invalid schemas or invalid policy instances are committed.

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


### 8.X Hybrid payment routing (tenant-direct default)


### 8.Y Rider disclosure panel (required)

**RIDE-DISC-010 â€” Disclosure panel (rider-accessible)**
- Rider-accessible **disclosure panel** must be available on: booking confirmation, live trip screen, and receipt.
- Must show tenant-provided disclosures (including insurance/compliance statements) in a â€œwho covers whatâ€ clarity format by ride phase/status.
- Must explicitly state: platform is SaaS provider and does not insure rides; tenant is responsible for operations, compliance, insurance, and dispute resolution.
- Disclosure content must be tenant-versioned (version_id + timestamp) and stored for audit; edits require tenant admin confirmation.



**RIDE-PAY-010 â€” Tenant Direct Settlement (default)**
- Default mode: rider funds settle to the tenantâ€™s merchant account/bank (tenant is merchant of record).
- Tenant may use PaySurity merchant services (preferred) or an external processor (if allowed by super admin policy).
- Platform does **not** hold tenant funds in this mode; platform fees are collected via automated billing (below).

**RIDE-PAY-020 â€” PaySurity Settlement (optional)**
- Optional mode (tenant opt-in): funds route through PaySurity settlement rails; PaySurity nets fees and remits tenant net on a tenant-configured schedule.
- This mode must be explicitly disclosed to the tenant during onboarding and recorded as signed acceptance.

**RIDE-PAY-030 â€” Billing + autopull (invoices + schedule + as-needed triggers)**
- In all payment operating modes, the platform must be able to collect Rideoo fees from the tenant:
  - via tenant bank account (ACH debit mandate), and/or
  - via tenant wallet balance (if wallet enabled).
- System must generate invoices and execute autopull:
  - **on schedule** (platform-configurable; default monthly invoice + daily autopull), and
  - **as-needed** (platform-configurable triggers): before enabling premium features (platform-triggered payouts, tax docs generation), and when fees exceed a threshold.
- **Dunning defaults (platform-configurable):**
  - retry cadence: Day 0 / Day 2 / Day 5,
  - at `past_due`: disable premium features (platform-triggered payouts, tax docs generation) but preserve historical access and reporting,
  - at `collections_hold` (optional): restrict tenant from going online / creating new trips (platform-controlled; OFF by default).
- Billing events (invoice issued, autopull attempt, success/fail, retries, holds) must be auditable and visible in tenant console.

- PaySurity Settlement modes may net platform fees automatically at settlement, but autopull must still exist as fallback.



**RIDE-PAY-040 â€” Default fee schedule (configurable; super admin can change)**
- Subscription (per tenant org) â€” defaults:
  - Starter: $299/month
  - Pro: $799/month
  - Enterprise: $1,499/month
- Per completed ride platform fee (tenant pays) â€” default:
  - max($0.75, 2.0% of fare), with configurable min/max caps.
- Instant cash-out fee (driver cash-out at will; tenant can disable per-driver/per-group):
  - default: 1.5% of payout, minimum $1.99, maximum configurable.
  - fee beneficiary: PaySurity (must be ledgered + reconcilable vs gateway/provider statements).

**RIDE-PAY-050 â€” Payout controls (prevent â€œautonomous chaosâ€)**
- Bulk payouts must be user-triggered (tenant admin / designated staff), with:
  - system-calculated amounts (config formulas) + editable adjustments
  - preview + confirm + export
  - optional maker-checker approval (recommended for high-volume tenants)
  - full audit log + immutable payout ledger entries


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

<!-- EBT_PATCH:PAYOUTS_V2_START -->

### 8.3A Driver payouts + cash-out (enable-only; tenant-configurable; platform fees configurable)

**RIDE-PAYOUT-100 â€” Payout modes (tenant-managed vs platform-triggered)**
- The platform must support both payout operating modes per tenant:
  - **Tenant-managed payouts:** tenant pays drivers outside Rideoo; Rideoo tracks earnings and provides statements/reports only.
  - **Platform-triggered payouts (PaySurity rail):** Rideoo executes payouts on behalf of the tenant.
- **Pinned PAY-FLOW-0100:** If a tenant enables platform-triggered driver payouts, the tenant automatically agrees that funds for **ALL rides** for that tenant flow through Rideoo first (PaySurity rail). Rideoo executes driver payouts from Rideooâ€™s account and applies platform-controlled configurable fees. Tenant consent must be captured, versioned, and auditable.

**RIDE-PAYOUT-101 â€” â€œCompletely Settledâ€ truth (bank_settled)**
- When platform-triggered payouts are enabled, a driver payout (including on-demand cash-out) must be permitted only when the related ride funds are in **Completely Settled** state.
- Default Completely Settled threshold: `bank_settled`.
- Driver UI must show per-trip and/or per-earning line status:
  - `pending` (not settled)
  - `eligible` (settled)
  - `paid` (payout executed)
- Tenant may configure business-facing policies (wait/cancel/no-show) via Tenant Policy Center; Rideoo does not impose any tenantâ†”rider or tenantâ†”driver business rules by default.

**RIDE-PAYOUT-102 â€” On-demand cash-out request UX (request anytime; pay only eligible)**
- Driver must be able to **request cash-out at any time**.
- System must compute **eligible** cash-out amount based on:
  - payment settlement state (bank_settled for platform-triggered payouts),
  - disputes/chargebacks/adjustments,
  - tenant-configured reserves/holdbacks (if tenant enables),
  - platform-configured fees (if applicable).
- If tenant enables cash-out controls, system enforces tenant-configurable limits at request time (default OFF):
  - max cash-outs per day/week,
  - max instant amount per interval,
  - minimum time between cash-outs,
  - minimum reserve/holdback (percent or fixed).
- If eligible amount is zero, driver UI must show â€œNot eligible yetâ€ with reasons (e.g., pending settlement).

**RIDE-PAYOUT-103 â€” Fee model (platform-controlled; tenant-visible)**
- All Rideoo platform fees (subscription + per-ride fees + payout fees + optional doc-gen fees) are configurable by platform Super Admin (and designated sub super admins).
- When platform-triggered payouts are enabled:
  - payout execution fee(s) are platform-configurable,
  - fees are charged to the tenant (not silently netted from driver without disclosure),
  - driver receipt must still **appear as paid by tenant** (see RIDE-PAYOUT-110).
- Tenants can configure their own driver-facing fees only if platform policy allows; otherwise the tenant UI exposes these as read-only.

**RIDE-PAYOUT-104 â€” Payout status + receipts (driver + tenant views)**
- Driver view per payout: `queued` â†’ `processing` â†’ `paid` OR `failed` (with retry guidance).
- Tenant view: payout queue + history + export.
- Each payout receipt must include:
  - `Paid by: {TenantName}`
  - `Processed via: Rideoo`
  - Support-only/internal details may show: `Funded by: Rideoo (PaySurity rail)`.

**RIDE-PAYOUT-105 â€” Adjustments, reversals, and recovery (drivers + tenants)**
- System must support an **adjustment object** that adds/subtracts from driver earnings ledger.
- Recovery mechanisms must exist for both drivers and tenants:
  - wallet debit (if wallet exists),
  - ACH debit (if mandate exists),
  - repayment plan scheduling.
- Recovery requires explicit consent capture (versioned, logged) and platform-configurable caps (per event, per day/week).
- Tenants must be able to view recovery events affecting their drivers; drivers must see recovery notices and receipts in tenant context.

**RIDE-PAYOUT-106 â€” Ledger linkage + reconciliation**
- Every payout/cash-out must create linked ledger entries for:
  - gross amount, fees, net payout, reserves/holdbacks (if enabled),
  - source earnings ids (trip + adjustment),
  - payout execution ids.
- Reconciliation must detect mismatches between ledger totals and PaySurity rail records and create exceptions visible to tenant admins and platform ops.

**RIDE-PAYOUT-108 â€” Regular payout schedule (tenant-configurable)**
- Tenant may configure payout cadence (daily/weekly/biweekly/monthly) and cutoff window.
- When enabled, scheduled payouts include all eligible balances not already paid/cashed-out, respecting settlement gating and reserves/holdbacks (if enabled).

**RIDE-PAYOUT-110 â€” â€œPaid by tenantâ€ presentation + receipt truth**
- Driver-facing payout artifacts must include:
  - `Paid by: {TenantName}`
  - `Processed via: Rideoo`
- Support/internal view must retain:
  - `Funded by: Rideoo (PaySurity rail)`
  - pointer to the captured tenant consent for PAY-FLOW-0100 (version + timestamp + actor).

### 8.3B Bulk payout runs (enable-only; tenant + platform roles)

**RIDE-PAYOUT-111 â€” Bulk payout preview + edit + confirm**
- Authorized tenant roles and/or platform roles can create a Bulk Payout Run scoped to tenant, date range, and eligibility filters.
- Bulk Payout Run must support:
  1) Preview (line-item breakdown + totals),
  2) Edit (amounts/line-items with required reason codes),
  3) Confirm (actor + timestamp + checksum of totals).

**RIDE-PAYOUT-112 â€” Bulk payout execution + audit**
- Execution must be idempotent and emit per-item statuses: `queued` â†’ `processing` â†’ `paid` OR `failed`.
- Retries must reuse the same idempotency key; partial failures must produce an exception list; no silent drops.
- Full audit trail required for create/edit/confirm/execute actions, including reasons and checksums.

**DoD Evidence (payouts)**
- Automated tests cover:
  - bank_settled gating for platform-triggered payouts,
  - pending vs eligible calculations (incl. tenant controls when enabled),
  - adjustment + recovery ledger correctness,
  - ledger linkage + reconciliation exception creation,
  - scheduled payout window behavior when enabled,
  - bulk payout preview/edit/confirm + checksum + idempotent execution when enabled,
  - receipt strings (Paid by Tenant / Processed via Rideoo),
  - audit log emission for payout + recovery + bulk payout actions.
<!-- EBT_PATCH:PAYOUTS_V2_END -->



### 8.4 QR code attribution, bonuses, and wallet-based incentives (mandatory)
- Each branded vehicle must support a unique Quick Response (QR) code:
  - Attribution tracking (which vehicle/tenant generated the lead),
  - Scan â†’ ride â†’ bonus workflow (policy-controlled),
  - Bonus funding source and settlement recorded in the ledger.
- Branded vehicles can receive dispatch priority boosts (policy-controlled; bounded by fairness).
- Incentives must be represented as ledger entries (double-entry) to avoid drift.

**Acceptance:**
- Given a QR scan generates a new rider booking, when the trip completes, then the configured bonus is created as a ledger entry and is auditable end-to-end.

- Tenant configures payout schedule and eligibility.
- Drivers see unpaid balance and payout history under tenant branding.
- Early payout requests supported with platform-configurable fees.

---

### 8.5 Tax docs generation for drivers (fee-gated; export-first) (mandatory)

**TAX-1099-010 â€” Earnings statements (tenant-scoped; driver-scoped)**
- System must compute per-driver annual earnings summaries per tenant from the ledger.
- Must support exports per tenant:
  - per driver (PDF + CSV),
  - bulk export (ZIP of PDFs + summary CSV).
- Output must be suitable for tax preparation, but must include disclaimer that tenant is responsible for review and submission.

**TAX-1099-020 â€” 1099-style output (Mode 1: do not store full TIN/SSN)**
- Mode 1 (pinned): platform must not store full TIN/SSN in its primary DB.
- Allowed storage:
  - last4 + masked display,
  - token/reference to a secure vault (PaySurity rail or equivalent) where full value is stored encrypted.
- If vault is not available in MVP, then:
  - collect TIN/SSN for a one-time â€œgenerateâ€ run,
  - generate output,
  - immediately purge the full value and keep only last4 + hash evidence of consent.
- Provide 1099-style PDF output suitable for tenant filing workflows.
- Include correction output support (amended statements).

**TAX-1099-030 â€” Fee model + autopull**
- Tax docs generation is a fee-gated feature controlled by platform Super Admin.
- Fees must be invoiced and autopulled (see RIDE-PAY-030) before documents are released.

**DoD Evidence (Tax docs)**
- Tests validate:
  - ledger-based earnings aggregation,
  - redaction/masking (no full TIN/SSN persisted),
  - export bundle correctness,
  - audit logs for generation + access.


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

### 9.2A Tenant dashboard information architecture (mandatory)

Tenant console must include modules (RBAC-gated) at minimum:
- Dashboard (KPIs + exceptions)
- Dispatch (map + queues + scheduled)
- Trips (search + timeline + evidence)
- Drivers (directory + onboarding + docs status)
- Riders/Customers (directory + history)
- Corporate/Business accounts (optional feature gate)
- Pricing & quoting (service classes + pricing rules)
- Airports (queue mode + rules)
- Payments & settlement visibility (tenant-scoped)
- Payouts (if tenant uses platform-triggered payouts or tracks payouts)
- Billing to Rideoo (invoices + autopull mandate + status)
- Tax docs generation (fee-gated; export)
- Microsites (templates + theme tokens + on-page booking/quote widget)
- Support/Disputes (tenant-owned workflows)
- Reports/Analytics
- Settings (org profile, RBAC, integrations, policy acknowledgments, exports)

### 9.2B Tenant Policy Center (enable-only; no platform-enforced defaults) (authoritative)

**TEN-POL-0001 â€” Policy Center philosophy (pinned)**
- Rideoo provides tenants the ability to define and optionally automate their own tenantâ†”rider and tenantâ†”driver policies.
- Rideoo does not impose mandatory tenant business rules or defaults. Every policy is **OFF until tenant enables** it (or explicitly adopts a template).
- Baseline platform behavior for tenantâ†”rider/driver is **non-penalizing** (no automatic fees/penalties/blocks) unless tenant enables `auto_apply` in the relevant policy block.
- Templates are labeled as â€œstarting pointsâ€ with unmissable disclaimers; tenant must acknowledge and acceptance is logged.

**TEN-POL-0002 â€” Policy object model (single source of truth)**
- Tenant policy config must be stored as a versioned object (`tenant_policy_config`) with:
  - `policy_version_id`, `schema_version`, `created_at_utc`, `created_by_user_id`,
  - a full JSON snapshot,
  - diff history for UI.
- A policy change requires explicit â€œPublishâ€ action and emits audit events.

**TEN-POL-0003 â€” Policy activation modes**
Each policy block must support:
- `enabled` (bool) â€” OFF by default
- `action_mode` (enum): `manual_only` | `auto_apply`
  - `manual_only`: Rideoo records policy, provides UI/reporting hooks; tenant staff enforces manually.
  - `auto_apply`: Rideoo executes configured actions (fees, holds, workflow steps) on behalf of tenant.

**TEN-POL-0004 â€” Authoritative JSON schema (minimum)**
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "tenant_policy_config",
  "type": "object",
  "required": ["schema_version", "policy_version_id", "policy", "published_at_utc"],
  "properties": {
    "schema_version": { "type": "string" },
    "policy_version_id": { "type": "string" },
    "published_at_utc": { "type": "string", "format": "date-time" },
    "published_by_user_id": { "type": "string" },
    "policy": {
      "type": "object",
      "properties": {
        "rider_policies": {
          "type": "object",
          "properties": {
            "cancellation": {
              "type": "object",
              "properties": {
                "enabled": { "type": "boolean", "default": false },
                "action_mode": { "type": "string", "enum": ["manual_only", "auto_apply"], "default": "manual_only" },
                "free_cancel_window_sec": { "type": "integer", "minimum": 0 },
                "fee_rules": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": ["phase", "fee_type", "amount"],
                    "properties": {
                      "phase": { "type": "string", "enum": ["pre_assign", "post_assign", "enroute", "arrived", "in_progress"] },
                      "fee_type": { "type": "string", "enum": ["flat", "percent"] },
                      "amount": { "type": "number", "minimum": 0 }
                    }
                  }
                },
                "disclosure_text": { "type": "string" }
              }
            },
            "wait_time": {
              "type": "object",
              "properties": {
                "enabled": { "type": "boolean", "default": false },
                "action_mode": { "type": "string", "enum": ["manual_only", "auto_apply"], "default": "manual_only" },
                "free_wait_sec": { "type": "integer", "minimum": 0 },
                "per_minute_fee": { "type": "number", "minimum": 0 },
                "disclosure_text": { "type": "string" }
              }
            },
            "no_show": {
              "type": "object",
              "properties": {
                "enabled": { "type": "boolean", "default": false },
                "action_mode": { "type": "string", "enum": ["manual_only", "auto_apply"], "default": "manual_only" },
                "no_show_window_sec": { "type": "integer", "minimum": 0 },
                "fee_type": { "type": "string", "enum": ["flat", "percent"] },
                "amount": { "type": "number", "minimum": 0 },
                "disclosure_text": { "type": "string" }
              }
            },
            "refunds": {
              "type": "object",
              "properties": {
                "enabled": { "type": "boolean", "default": false },
                "action_mode": { "type": "string", "enum": ["manual_only", "auto_apply"], "default": "manual_only" },
                "allowed_phases": { "type": "array", "items": { "type": "string" } },
                "disclosure_text": { "type": "string" }
              }
            }
          }
        },
        "driver_policies": {
          "type": "object",
          "properties": {
            "late_to_pickup": {
              "type": "object",
              "properties": {
                "enabled": { "type": "boolean", "default": false },
                "action_mode": { "type": "string", "enum": ["manual_only", "auto_apply"], "default": "manual_only" },
                "sla_sec": { "type": "integer", "minimum": 0 },
                "consequence": { "type": "string" }
              }
            },
            "cancel_after_accept": {
              "type": "object",
              "properties": {
                "enabled": { "type": "boolean", "default": false },
                "action_mode": { "type": "string", "enum": ["manual_only", "auto_apply"], "default": "manual_only" },
                "tracking_only": { "type": "boolean", "default": true }
              }
            }
          }
        },
        "dispatch_policies": {
          "type": "object",
          "properties": {
            "offer_ring_sec": { "type": "integer", "minimum": 0 },
            "offer_expire_sec": { "type": "integer", "minimum": 0 },
            "retry_strategy": { "type": "string" },
            "driver_concurrency": {
              "type": "object",
              "properties": {
                "enabled": { "type": "boolean", "default": false },
                "max_concurrent_accepted_trips": { "type": "integer", "minimum": 1 },
                "notes": { "type": "string" }
              }
            }
          }
        },
        "booking_policies": {
          "type": "object",
          "properties": {
            "duplicate_booking_handling": {
              "type": "object",
              "properties": {
                "enabled": { "type": "boolean", "default": false },
                "action_mode": { "type": "string", "enum": ["manual_only", "auto_apply"], "default": "manual_only" },
                "within_tenant_window_sec": { "type": "integer", "minimum": 0 },
                "behavior": { "type": "string", "enum": ["warn", "block", "require_confirm"], "default": "warn" }
              }
            }
          }
        }
      }
    }
  }
}
```

**TEN-POL-0005 â€” Templates + disclaimers (mandatory)**
- Jurisdiction templates (Chicago/IL, Indiana, etc.) may be shipped as optional starting points.
- Each template must display unmissable disclaimer language:
  - tenant is responsible for ops/compliance/insurance,
  - templates are informational only and not legal advice,
  - tenant must review with counsel/insurance.
- Tenant acknowledgment must be recorded (user, timestamp, template version hash).

**DoD Evidence (Policy Center)**
- UI: Draft â†’ validate â†’ publish â†’ rollback; preview disclosure; feature toggles.
- API: CRUD versioned policy objects; publish endpoint; diff endpoint.
- Tests: schema validation + publish gating + audit emission.


### 9.2C Corporate / Business accounts (feature-gated) (tenant benefit module)

**CORP-ACCT-010 â€” Corporate account entity**
- Tenant can create corporate accounts (companies) with:
  - billing profile (pay method, invoicing preference),
  - authorized riders list (employees/guests),
  - cost centers / departments,
  - spend limits (daily/weekly/monthly) (enable-only; OFF until tenant enables),
  - policy disclosure text (tenant-authored).

**CORP-ACCT-020 â€” Booking controls**
- Tenant can enable controls such as:
  - allowed service classes,
  - pickup/dropoff geo constraints,
  - ride purpose codes,
  - approval flows (manager approval) (manual_only or auto_apply).
- If not enabled, corporate riders behave as normal riders.

**CORP-ACCT-030 â€” Billing + receipts**
- Corporate rides must be attributable to corporate account and cost center.
- Support consolidated billing statements:
  - monthly invoice PDF + CSV exports,
  - per-ride receipt details,
  - audit trail of adjustments/refunds.
- Tenant can choose whether corporate account pays per trip (card on file) or via monthly invoice (if enabled).

**CORP-ACCT-040 â€” Admin UX**
- Tenant admin can:
  - invite/remove corporate riders,
  - set limits,
  - export reports,
  - manage disputes/chargebacks as tenant policy defines.

**DoD Evidence (Corporate accounts)**
- UI + API + tests for CRUD + attribution + export generation.


### 9.3 Platform super-admin console
- Seed/CRUD tenants; CRUD/bulk CRUD tenant drivers/vehicles.
- Cross-tenant driver tracking for platform staff: show where each driver is headed (active trip destination + ETA), across tenants (RBAC + audit).
- Feature gates and subscription controls per tenant.
- Global policies (destination mode defaults, surge constraints, payout fee tiers, preferred tier weights).
- Kill-switch console for tenant/driver/vehicle.
- Trigger and view automated tests (single or grouped).
- System health dashboard (metrics/logs/alerts) and root-cause surfacing.

---

## 10. Public-facing website (platform marketing) â€” tenant acquisition

Purpose: attract passenger fleet owners and dispatch companies to become tenants.

Minimum pages (placeholders allowed but must be wired):
- Home (value proposition, CTA)
- Features (dispatch, driver app, rider experience, payments)
- Pricing (tiers, feature gates)
- Industries/Regions (geo landing pages; SEO)
- Case studies/testimonials (placeholder)
- Contact / Request demo (lead form; calendar booking)
- FAQs (feeds on-site AI bot training data)
- Security & Compliance (high-level)
- Terms/Privacy

Lead capture:
- â€œBecome a Tenantâ€ form collects: company name, fleet size, service area, contact, desired launch date.
- Leads enter platform pipeline (Customer Relationship Management (CRM) stub acceptable but must store in DB and notify platform team).

### 10.A Tenant microsites (white-label) (mandatory)

#### 10.A.1 Microsite domains + SEO canonicalization (pinned)

- Each tenant microsite MUST have exactly one **primary domain**.
- All alias domains MUST 301-redirect to the primary domain.
- If an alias cannot 301 (rare), the microsite MUST emit `<link rel="canonical" href="https://PRIMARY/...">` on every page.
- `robots.txt` and `sitemap.xml` MUST be generated per primary domain and kept consistent across aliases.
- The microsite build pipeline MUST validate there is no â€œsplit-canonicalâ€ (two pages claiming each other as canonical).

**DoD gates:** UI (tenant domain manager) + API + automated tests (redirect/canonical) + deployment smoke test.

- Each tenant must have an auto-provisioned public microsite, hosted by Rideoo on GCP (static-first + CDN).
- Microsite must support tenant-owned domains (primary domain + optional alias domains with 301 redirects or canonical tags).
- Microsite must support theme tokens (logo, colors, typography), page blocks, and SEO metadata (title/description/OG/Twitter cards).
- Microsite must include an **on-page booking + quote widget**:
  - The widget is tenant-branded and embedded in the microsite pages.
  - The widget submits/reads data from the tenant-scoped Rideoo Rider Web App backend and creates bookings for that tenant.
  - Rider experience must feel like dealing with the tenant; Rideoo remains the underlying software.
- Booking widget must support: pickup/dropoff, time, vehicle class, passenger/luggage, notes, quote preview, and submit booking.
- Tenant can choose to allow â€œinstant bookâ€ vs â€œrequest quote / call-backâ€ modes (widget mode is tenant-configurable).


---

## 11. Observability, monitoring, analytics, and SLOs

### 11.1 DLQ, replay tooling, and failure classification (mandatory)
- The platform must implement a DLQ for failed asynchronous jobs (dispatch notifications, payment side effects, document OCR).
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
- Observability outputs must feed the GO / NO-GO evaluator (see Â§1.4).


- Health and metrics endpoints: `/health`, `/metrics`.
- SLOs: quote p95 < 300 milliseconds (ms); match p95 < 20 seconds; error rate < 0.5%.
- Centralized logs with correlation identifiers; audit viewer in platform console.
- GA on public site and tenant microsites.

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
- Offer state machine: Created â†’ Ringing â†’ Accepted | Expired â†’ Hopped â†’ Claimed â†’ Assigned â†’ Cancelled.
- Airport queue token state machine: Prequeue â†’ Active â†’ Paused â†’ Removed/Expired.
- Timer registry in `timers.json` used by code and versioned.

---

## 14. API contracts

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
- Chaos recovery â‰¤ 5 seconds.
- DLQ projected replay success â‰¥ 70%.
- Zero double assignments and zero invalid queue states under dispatch storm.

- If tenant enables compliance gating, go-online/accepting is blocked; D-14 and D-1 notifications delivered and logged.
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
  - Recovery Point Objective (RPO): â‰¤ 15 minutes. Recovery Time Objective (RTO): â‰¤ 4 hours (configurable; stricter targets allowed for premium tiers).
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

- Source A (target authority): `CANONICAL_v6_1.md`
- Source B (merged): `RideShare-chat1-requirements.txt`
- Source C (merged context): `rideshare context.txt`

All requirements in Sources B and C have been incorporated into the authoritative sections above. If an omission is discovered, the omission must be added above (not here) per Â§20 Hard anti-drift rule.
