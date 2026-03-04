# UrWay Dispatch — Pre-Launch Checklist

**Version**: 1.0  
**Date**: 2026-03-03  
**Coverage**: 70/74 CANONICAL req_ids ✅ (94.6%)

---

## 1. Environment & Configuration

- [ ] `.env` populated with production Supabase URL, anon key, and service role key
- [ ] Fluidpay production merchant API key configured
- [ ] SendGrid production API key configured
- [ ] Twilio production SID, auth token, and phone number configured
- [ ] FCM server key configured for push notifications
- [ ] `NODE_ENV=production` set on all services
- [ ] GCP project `rideoo-487904` fully provisioned
- [ ] `GCP_PROJECT_NUMBER` set as GitHub repo secret

## 2. Database

- [ ] All 26 migrations (999–1021) applied to production Supabase instance
- [ ] RLS policies verified on all tables
- [ ] PostgreSQL extensions enabled: `postgis`, `uuid-ossp`, `pgcrypto`
- [ ] Database connection pooling configured (Supabase PgBouncer)
- [ ] Backup verified: PITR enabled, RPO ≤ 15 min, RTO ≤ 4 hours
- [ ] Materialized views refreshed (`refresh_dashboard_materialized_views`)

## 3. Security

- [ ] JWT signing keys rotated for production
- [ ] HMAC webhook secrets configured for Fluidpay/PaySurity
- [ ] Cloud Armor WAF policy deployed and verified
- [ ] Rate limiting thresholds tuned for production traffic
- [ ] CORS origins restricted to production domains only
- [ ] SSL/TLS certificate provisioned and verified
- [ ] `x-powered-by` header stripped (confirmed by e2e test)
- [ ] PII retention policy cron job (`mask_old_trip_pii`) scheduled

## 4. DNS & Networking

- [ ] Production domain DNS records configured
- [ ] SSL certificate auto-renewal configured
- [ ] Tenant microsite subdomain routing verified
- [ ] CDN configured for static assets (public website, microsites)

## 5. CI/CD & Deployment

- [ ] GitHub Actions secrets configured for production
- [ ] Canary deployment pipeline tested with staging
- [ ] OIDC/WIF identity federation verified with GCP
- [ ] Cloud Run service deployed and healthy
- [ ] Blue/green rollback procedure documented and tested
- [ ] Docker images tagged and pushed to production registry

## 6. Testing Sign-Off

- [ ] Unit tests: 37 pass (`npx jest --verbose` in gateway)
- [ ] E2E tests: 18 pass (`npx jest --testPathPattern=e2e`)
- [ ] Acceptance tests: 38 pass (`npx jest --testPathPattern=acceptance`)
- [ ] k6 load test: p95 < 2s at 100 VUs (`tests/k6/load-test.js`)
- [ ] Chaos tests: 5 scenarios pass (`tests/chaos/chaos-tests.yaml`)
- [ ] GO/NO-GO evaluator: PASS verdict (`tests/go-no-go/evaluator.ts`)
- [ ] Requirements validation: pass (`npm run test:requirements`)

## 7. Monitoring & Alerting

- [ ] Observability dashboards deployed (MetricsService, GlobalMonitorService)
- [ ] Health check endpoint `/health` responding 200
- [ ] Alert thresholds configured (error rate, latency, memory)
- [ ] Dead letter queue (DLQ) monitoring enabled
- [ ] Circuit breaker service thresholds tuned

## 8. Legal & Compliance

- [ ] Terms of Service published (legal-consent.service.ts)
- [ ] Privacy Policy published (consent.service.ts)
- [ ] DSAR processing pipeline tested end-to-end
- [ ] Cookie consent banner deployed on public website
- [ ] Transportation authority license/permits obtained for Chicago
- [ ] Commercial insurance requirements documented and verified

## 9. Payment Gateway

- [ ] Fluidpay production account activated
- [ ] Webhook endpoint reachable from Fluidpay production
- [ ] Test transaction processed and refunded successfully
- [ ] Dunning sequence (D0→D2→D5) verified in staging
- [ ] Tax document generation tested (1099-K output)

## 10. Application Readiness

- [ ] Rider app builds without errors
- [ ] Driver app builds without errors
- [ ] Admin portal builds without errors
- [ ] Public website pages all accessible (10 pages)
- [ ] Microsite creation and publishing verified
- [ ] FAQ system populated with initial content

## 11. Deferred Items

- [ ] LAUNCH_WAIVER.md signed for Phase 16 native mobile (4 req_ids)
- [ ] Web apps confirmed as functional MVP for launch

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering Lead | | | |
| Product Owner | | | |
| QA Lead | | | |
| Security Officer | | | |
| Operations | | | |
