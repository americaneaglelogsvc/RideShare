# Runbook: Service Outage

**Severity:** P1  
**SLA:** Acknowledge within 5 min, mitigate within 30 min, resolve within 4h  
**Owner:** Platform Engineering  

## Detection

- Cloud Run health check fails (`/health` returns non-200)
- Uptime check alert fires (GCP Monitoring)
- Error rate > 5% on Grafana dashboard

## Triage Steps

1. **Check Cloud Run status**
   ```bash
   gcloud run services describe rideshare-gateway-production --region us-central1 --project rideoo-487904
   ```

2. **Check recent revisions**
   ```bash
   gcloud run revisions list --service rideshare-gateway-production --region us-central1 --limit 5
   ```

3. **Check logs for errors**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit 50 --project rideoo-487904
   ```

4. **Check Supabase status** — https://status.supabase.com

## Mitigation

### If bad deployment:
```bash
gcloud run services update-traffic rideshare-gateway-production \
  --to-revisions=LAST_KNOWN_GOOD_REVISION=100 \
  --region us-central1
```

### If Supabase outage:
- Switch `DB_MODE=pg` if standby PostgreSQL is available
- Enable circuit breaker for non-critical DB calls

### If resource exhaustion:
```bash
gcloud run services update rideshare-gateway-production \
  --max-instances 20 --memory 2Gi --region us-central1
```

## Post-Incident

- [ ] Write incident report within 24h
- [ ] Update runbook if new failure mode discovered
- [ ] Review and adjust autoscaling thresholds
- [ ] Schedule blameless post-mortem within 48h
