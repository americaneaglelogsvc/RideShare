# Runbook: Compliance Breach

**Severity:** P1  
**SLA:** Acknowledge within 5 min, contain within 1h, report within 24h  
**Owner:** Compliance Officer + Legal  

## Detection

- D-14 / D-1 compliance cron flags expired documents
- Driver operating without valid insurance/license
- Tenant operating without valid business license
- Manual audit finds non-compliant driver

## Triage Steps

1. **Identify affected driver(s) and tenant(s)**
   ```bash
   curl https://GATEWAY_URL/admin/compliance/expired?days=0
   ```

2. **Check notification history**
   - Verify D-14 and D-1 notifications were sent
   - Check `compliance_notifications` table for delivery status

3. **Assess scope**
   - How many trips completed with expired documents?
   - Which riders were affected?
   - What jurisdiction applies?

## Mitigation

### Immediate — contain:
- **Suspend driver from dispatch** immediately
  ```bash
  curl -X POST https://GATEWAY_URL/admin/drivers/{driverId}/suspend \
    -H "Content-Type: application/json" \
    -d '{"reason": "compliance_breach", "compliance_doc_id": "..."}'
  ```
- This requires **maker-checker approval** via `ApprovalService`

### If multiple drivers affected:
- Run bulk compliance scan across all active drivers
- Auto-expire and suspend all with expired critical documents

### Regulatory notification:
- If Illinois: notify IDOT within 24h for commercial vehicle violations
- If Chicago TNC: notify City of Chicago BACP
- Document all actions in audit trail via `audit.service.ts`

## Post-Incident

- [ ] Root cause: why did D-14 notification not prevent this?
- [ ] Strengthen compliance cron to auto-suspend at D+0
- [ ] Verify all active drivers have valid documentation
- [ ] File regulatory reports as required by jurisdiction
- [ ] Update compliance policies if gaps found
