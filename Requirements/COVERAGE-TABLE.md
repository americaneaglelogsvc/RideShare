# Coverage Table (Canonical Requirements → Evidence)

req_id: GOV-COVERAGE-0001

> This table is a human-readable companion to `coverage.json` and `requirements_status.jsonl`. It will be refined as more domains are implemented and tested.

## 1. Foundations (tenancy, config, PII, messaging, audit)

| req_id         | title                                           | status_hint      | primary artifacts                                                                          |
|----------------|-------------------------------------------------|------------------|-------------------------------------------------------------------------------------------|
| TEN-BASE-0001  | Tenant provisioning + isolation                 | In Progress/Impl | Requirements/tenancy_isolation.md; Requirements/rbac_roles.json                           |
| TEN-BASE-0002  | Tenant RBAC + roles                             | In Progress/Impl | Requirements/auth_model.md; Requirements/rbac_matrix.md; Requirements/rbac_roles.json     |
| CFG-PLAT-0001  | platform_config (platform-scoped)               | In Progress      | Requirements/schemas/platform_config.schema.json; config/platform_config.example.json     |
| CFG-TEN-0001   | tenant_config (tenant-scoped)                   | In Progress      | Requirements/schemas/tenant_config.schema.json; config/tenant_config.example.json         |
| CFG-JSON-0001  | JSON schema requirement                         | In Progress      | Requirements/schemas/*.schema.json; scripts/validate_foundation_artifacts.mjs            |
| CFG-JSON-0002  | Minimum keys (platform_config, tenant_config)   | In Progress      | Requirements/schemas/*.schema.json; config/*.example.json                                |
| PII-BASE-0001  | PII minimization baseline                       | In Progress      | Requirements/pii_minimization.md; Requirements/pii_catalog.json                           |
| MSG-RET-0001   | Masked communications and messaging retention   | In Progress      | Requirements/messaging_masking_and_retention.md; Requirements/messaging_retention_policy.json |
| AUD-EVT-0001   | Audit event taxonomy                            | In Progress      | Requirements/audit_events.md; Requirements/audit_events.json                              |

## 2. Governance and build rules (BRRS-1.x family)

- Governance requirements (canonical build rules, DoD, required artifacts, GO/NO-GO) are partially covered by:
  - Requirements/BUILD_AUTHORITY.md
  - Requirements/CANONICAL.md
  - Requirements/status_taxonomy.json
  - scripts/agentic_scan_runner.py

Detailed canonical → evidence mappings for these ids will be expanded as we implement more of the governance automation (C2-B and later phases).
