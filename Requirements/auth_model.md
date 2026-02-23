# Auth Model (FOUNDATION)
req_id: TEN-BASE-0002

## Sessions
- JWT sessions.
- Tenant context is derived from auth + route scope (not user input).

## Authorization
- RBAC with least privilege.
- Platform roles can operate cross-tenant (audited).
- Tenant roles are tenant-scoped via tenant_id.
