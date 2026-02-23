req_id: BRRS-2.2
# Tenancy & Data Isolation (FOUNDATION)

## Purpose
Defines tenant boundary rules and evidence gates for tenant isolation.

## Rules
- All tenant-scoped rows include tenant_id.
- Tenant users only access their tenant_id scope.
- Platform cross-tenant access is RBAC-gated and audited.

## Acceptance
- Given Tenant A and Tenant B exist,
  when Tenant A user queries trips,
  then only Tenant A trips are returned.
