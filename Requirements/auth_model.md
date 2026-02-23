req_id: BRRS-3.1
# Auth Model (FOUNDATION)

## Sessions
- JWT sessions.
- Tenant context is derived from auth + route scope (not user input).

## Authorization
- RBAC with least privilege.
- Platform roles can operate cross-tenant (audited).
- Tenant roles are tenant-scoped via tenant_id.

