# Runbook: Dispatch Storm

**Severity:** P2  
**SLA:** Acknowledge within 10 min, mitigate within 30 min  
**Owner:** Dispatch Engineering  

## Detection

- Dispatch queue depth > 500 pending jobs
- Airport queue response time > 2s (normally < 200ms)
- Double-assignment alerts from GO/NO-GO evaluator
- Driver heartbeat timeouts spike

## Triage Steps

1. **Check dispatch queue depth**
   ```bash
   # Via admin API
   curl -H "x-tenant-id: ADMIN" https://GATEWAY_URL/admin/jobs/stats
   ```

2. **Check for event-driven surge** (concerts, sports, weather)
   ```bash
   # Query events engine
   curl https://GATEWAY_URL/admin/events/active
   ```

3. **Check driver availability**
   ```bash
   # Real-time driver count
   curl https://GATEWAY_URL/admin/drivers/online-count
   ```

4. **Check for double assignments**
   ```sql
   SELECT trip_id, COUNT(driver_id)
   FROM trip_assignments
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY trip_id HAVING COUNT(driver_id) > 1;
   ```

## Mitigation

### Immediate — reduce load:
- Increase surge pricing via `pricing-policy.service.ts` to reduce demand
- Expand dispatch radius to include more available drivers
- Enable GrabBoard for overflow trips

### If double assignments occurring:
- Pause dispatch temporarily
- Run de-duplication: cancel duplicate assignments, keep earliest
- Verify trip state machine integrity

### If airport queue is jammed:
- Clear stale queue entries (> 4h old)
- Re-sort by FIFO with priority override

## Post-Incident

- [ ] Review dispatch algorithm performance metrics
- [ ] Adjust autoscaling for high-demand events
- [ ] Update surge pricing thresholds if needed
- [ ] Verify zero double assignments via GO/NO-GO gate
