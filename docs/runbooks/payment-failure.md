# Runbook: Payment Failure

**Severity:** P1  
**SLA:** Acknowledge within 5 min, mitigate within 15 min  
**Owner:** Payments Team  

## Detection

- FluidPay/PaySurity webhook returns non-200
- `payment.service.ts` logs `PAYMENT_FAILED` events
- Dispute count spikes in admin dashboard
- Driver payout queue grows without processing

## Triage Steps

1. **Check FluidPay API status**
   ```bash
   curl -s https://api.fluidpay.com/api/health
   ```

2. **Check recent payment errors in logs**
   ```bash
   gcloud logging read "jsonPayload.message=~\"payment.*failed\" AND resource.type=cloud_run_revision" \
     --limit 20 --project rideoo-487904
   ```

3. **Check circuit breaker state**
   - Query `GET /admin/circuit-breakers` for `fluidpay` circuit status

4. **Check idempotency — are retries creating duplicates?**
   - Query `idempotency_keys` table for recent duplicates

## Mitigation

### If FluidPay is down:
- Circuit breaker should auto-trip (threshold: 5 consecutive failures)
- Payments queue to `job_queue` with `status=pending` for retry
- Notify affected tenants via `push-notification.service.ts`

### If API key expired:
```bash
gcloud secrets versions add FLUIDPAY_API_KEY --data-file=new-key.txt --project rideoo-487904
# Restart service to pick up new secret
gcloud run services update rideshare-gateway-production --region us-central1
```

### If duplicate charges detected:
- Use `refund.service.ts` to issue batch refunds
- Log in `ledger_entries` as `refund` type

## Post-Incident

- [ ] Reconcile ledger entries against FluidPay dashboard
- [ ] Verify all pending payouts processed after recovery
- [ ] Notify affected riders/drivers of refund status
- [ ] Review circuit breaker thresholds
