# Runbook: Data Breach / DSAR Response

**Severity:** P0 (breach) / P2 (DSAR)  
**SLA:** Breach: contain within 1h, notify within 72h (GDPR). DSAR: fulfill within 30 days.  
**Owner:** DPO (Data Protection Officer) + Engineering  

## Part A: Data Breach Response

### Detection
- Unauthorized access detected in audit logs
- Supabase RLS bypass or credential leak
- Customer reports unauthorized account activity
- Security scanner flags exposed data

### Triage Steps

1. **Assess scope of breach**
   ```bash
   # Check audit logs for anomalous access patterns
   curl https://GATEWAY_URL/admin/audit?action=data_access&from=TIMESTAMP
   ```

2. **Identify affected data subjects**
   - Which tenants? Which riders/drivers?
   - What PII was exposed? (name, email, phone, TIN, payment info)

3. **Check TIN vault**
   - Were any full TINs exposed? Check `tax.service.ts` purge status
   - Verify TIN hashing is intact

### Containment

1. **Rotate all compromised credentials immediately**
   ```bash
   # Rotate Supabase key
   gcloud secrets versions add SUPABASE_SERVICE_KEY --data-file=new-key.txt
   # Rotate FluidPay key
   gcloud secrets versions add FLUIDPAY_API_KEY --data-file=new-key.txt
   # Force service restart
   gcloud run services update rideshare-gateway-production --region us-central1
   ```

2. **Revoke compromised API keys**
   ```sql
   UPDATE tenant_api_keys SET revoked_at = NOW() WHERE tenant_id = 'AFFECTED_TENANT';
   ```

3. **Enable enhanced logging**
   - Set log level to DEBUG temporarily
   - Enable full request body logging for affected endpoints

### Notification (within 72h for GDPR)
- Notify supervisory authority (if EU data subjects)
- Notify affected data subjects with: what happened, what data, what we're doing
- Notify affected tenants

---

## Part B: DSAR (Data Subject Access Request)

### Detection
- Request received via `POST /rider/dsar` or `POST /driver/dsar`
- Email to privacy@urwaydispatch.com or dpo@urwaydispatch.com
- `data-subject-request.service.ts` creates DSR record

### Processing Steps

1. **Verify identity of requester**
   - Match email/phone to account
   - Require re-authentication for sensitive requests

2. **Determine request type**
   - **Access (export):** Compile all PII into downloadable format
   - **Deletion (erasure):** Remove PII, retain anonymized business records
   - **Rectification:** Update incorrect data

3. **Execute via DSR service**
   ```bash
   # Check DSR status
   curl https://GATEWAY_URL/admin/dsar/{requestId}
   
   # Process export
   curl -X POST https://GATEWAY_URL/admin/dsar/{requestId}/execute
   ```

4. **For deletion requests:**
   - Purge PII from: users, trip_ratings, trip_messages, consent records
   - Retain anonymized: ledger entries, trip records (for tax/audit)
   - Purge TIN via `tax.service.ts` → `purgeTin()`
   - Purge message history via `message-retention.service.ts`

5. **Respond within 30 days** with:
   - Complete data export (for access requests)
   - Confirmation of deletion (for erasure requests)
   - Explanation of any retained data and legal basis

## Post-Incident

- [ ] Log all actions in audit trail
- [ ] Update privacy impact assessment if new data types discovered
- [ ] Review and strengthen RLS policies
- [ ] Schedule security review within 30 days
