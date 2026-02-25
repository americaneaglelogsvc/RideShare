# PII Minimization (FOUNDATION)
req_id: PII-BASE-0001

## Purpose
Defines baseline data minimization and retention expectations for personally identifiable information (PII) in the RideShare platform.

## Principles
- Collect only PII required for core flows and compliance.
- Retain PII only for as long as necessary for legal, operational, and accounting needs.
- Make DSAR (Data Subject Access Request) workflows feasible (export, delete, correct) per CANONICAL §3.3.

## Evidence gates (FOUNDATION)
To consider PII minimization requirements In Progress/Implemented at this layer, evidence must include:
- A machine-readable catalog of PII fields by entity (see `pii_catalog.json`).
- Retention categories (e.g., short, medium, long, legal-hold) mapped to PII fields.
- Documentation of how DSAR/export/delete would conceptually operate (even before runtime wiring).
