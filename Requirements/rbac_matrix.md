# RBAC Matrix (FOUNDATION)
req_id: TEN-BASE-0002

## Canonical roles
- PLATFORM_SUPER_ADMIN
- PLATFORM_SUB_SUPER_ADMIN
- TENANT_OWNER
- TENANT_OPS_ADMIN
- TENANT_CSR
- FLEET_OWNER
- DRIVER
- RIDER

## Notes
- Platform roles can access cross-tenant (audited).
- Tenant roles limited to tenant_id scope.
