# UrWay Dispatch Production Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the UrWay Dispatch platform to production environment.

## Prerequisites

### 1. Environment Setup
- Google Cloud Platform project: `rideoo-487904`
- GCP CLI installed and authenticated
- Docker installed
- Node.js 20+ installed
- Required permissions:
  - Cloud Run Admin
  - Cloud Build Editor
  - Secret Manager Admin
  - Service Account User

### 2. External Services Setup
- **Supabase**: Production database and auth
- **FluidPay**: Production payment processing
- **Twilio**: Production SMS service
- **SendGrid**: Production email service
- **Firebase**: Production push notifications
- **AWS S3**: Production file storage
- **Redis**: Production cache (or Memorystore)

### 3. Domain and SSL
- Production domain: `urwaydispatch.com`
- SSL certificates configured
- DNS records pointing to Cloud Run

## Phase 1: Environment Configuration

### 1.1 Clone Repository
```bash
git clone https://github.com/your-org/rideshare.git
cd rideshare
```

### 1.2 Setup Production Secrets
```bash
# Make the secrets setup script executable
chmod +x scripts/setup-production-secrets.sh

# Run the secrets setup script
./scripts/setup-production-secrets.sh
```

### 1.3 Configure GitHub Actions Secrets
Navigate to your GitHub repository settings and add the following secrets:

#### Required Secrets
- `GCP_PROJECT_ID`: `rideoo-487904`
- `GCP_SA_EMAIL`: Your service account email
- `WIF_PROVIDER`: Workload Identity Federation provider
- `SUPABASE_URL`: Production Supabase URL
- `SUPABASE_ANON_KEY`: Production Supabase anonymous key
- `SUPABASE_SERVICE_KEY`: Production Supabase service role key
- `FLUIDPAY_API_KEY`: Production FluidPay API key
- `FLUIDPAY_WEBHOOK_SECRET`: FluidPay webhook secret
- `TWILIO_ACCOUNT_SID`: Production Twilio account SID
- `TWILIO_AUTH_TOKEN`: Production Twilio auth token
- `SENDGRID_API_KEY`: Production SendGrid API key
- `VERCEL_TOKEN`: Vercel deployment token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID
- `SLACK_WEBHOOK_URL`: Slack webhook for notifications

## Phase 2: Database Setup

### 2.1 Supabase Production Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Link to production project
supabase link --project-ref your-production-project-ref

# Apply all migrations
supabase db push

# Verify database schema
supabase db diff --schema public
```

### 2.2 Database Configuration
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Configure connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';

-- Reload configuration
SELECT pg_reload_conf();
```

### 2.3 RLS Policies Verification
```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true;

-- Test RLS policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

## Phase 3: Backend Deployment

### 3.1 Build Docker Image
```bash
cd services/gateway

# Build and test locally
npm ci
npm run build
npm run test

# Build Docker image
docker build -t rideshare-gateway:latest .

# Test container locally
docker run -p 8080:8080 --env-file .env.production rideshare-gateway:latest
```

### 3.2 Deploy to Cloud Run
```bash
# Deploy to Cloud Run
gcloud run deploy rideshare-gateway \
  --image us-central1-docker.pkg.dev/rideoo-487904/rideshare-gateway:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --max-instances 100 \
  --min-instances 2 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300s \
  --set-env-vars NODE_ENV=production \
  --set-secrets SUPABASE_URL=rideshare-supabase-url:latest \
  --set-secrets SUPABASE_SERVICE_ROLE_KEY=rideshare-supabase-service-key:latest \
  --set-secrets FLUIDPAY_API_KEY=rideshare-fluidpay-api-key:latest \
  --set-secrets FLUIDPAY_WEBHOOK_SECRET=rideshare-fluidpay-webhook-secret:latest \
  --set-secrets JWT_SECRET=rideshare-jwt-secret:latest \
  --set-secrets ENCRYPTION_KEY=rideshare-encryption-key:latest
```

### 3.3 Configure Cloud Armor WAF
```bash
# Apply WAF policy
gcloud compute security-policies create rideshare-waf-production \
  --description "Production WAF policy for UrWay Dispatch" \
  --file infra/gcp/cloud-armor-production.yaml

# Attach WAF to Cloud Run service
gcloud compute backend-services add-backend-rules rideshare-gateway \
  --global \
  --security-policy rideshare-waf-production
```

### 3.4 Verify Backend Deployment
```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe rideshare-gateway \
  --region us-central1 \
  --format='value(status.url)')

echo "Backend URL: $SERVICE_URL"

# Health checks
curl -f "$SERVICE_URL/health"
curl -f "$SERVICE_URL/health/ready"
curl -f "$SERVICE_URL/api/v1/health"
```

## Phase 4: Frontend Deployment

### 4.1 Rider Web App
```bash
cd apps/rider-app

# Install dependencies
npm ci

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### 4.2 Driver Web App
```bash
cd apps/driver-app

# Install dependencies
npm ci

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### 4.3 Admin Portal
```bash
cd apps/admin-portal

# Install dependencies
npm ci

# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### 4.4 Public Website
```bash
# Deploy public website to Netlify or Vercel
cd public

# Using Vercel
vercel --prod

# Or using Netlify
netlify deploy --prod --dir=. --site=your-site-name.netlify.app
```

## Phase 5: Testing and Validation

### 5.1 Load Testing
```bash
# Install k6
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Update load test with production URL
sed -i "s|http://localhost:8080|$SERVICE_URL|g" tests/k6/load-test.js

# Run load test
k6 run --vus 100 --duration 5m tests/k6/load-test.js
```

### 5.2 Security Testing
```bash
# Security audit
npm audit --audit-level high

# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t $SERVICE_URL

# SSL/TLS check
curl -I $SERVICE_URL | grep -i "strict-transport-security"
```

### 5.3 End-to-End Testing
```bash
cd services/gateway

# Run E2E tests
npm run test:e2e

# Run acceptance tests
npm run test:acceptance

# Run requirements validation
npm run test:requirements
```

## Phase 6: Monitoring Setup

### 6.1 Configure Monitoring
```bash
# Deploy monitoring stack (if using self-hosted)
kubectl apply -f infra/monitoring/

# Or configure cloud monitoring
gcloud monitoring services create rideshare-gateway

# Set up alerting policies
gcloud alpha monitoring policies create --policy-from-file=infra/monitoring/alerts.yaml
```

### 6.2 Configure Logging
```bash
# Enable Cloud Logging
gcloud logging sinks create rideshare-logs \
  bigquery.googleapis.com/projects/rideoo-487904/datasets/rideshare_logs \
  --log-filter='resource.type="cloud_run_revision"'

# Configure log retention
gcloud logging buckets update _Default \
  --retention-days=30
```

### 6.3 Set up Dashboards
```bash
# Import Grafana dashboards
curl -X POST \
  http://grafana-url/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @infra/monitoring/dashboards/system-overview.json
```

## Phase 7: DNS and SSL Configuration

### 7.1 DNS Configuration
```bash
# Get Cloud Run service URL
SERVICE_URL=$(gcloud run services describe rideshare-gateway \
  --region us-central1 \
  --format='value(status.url)')

# Extract domain from service URL
DOMAIN=$(echo $SERVICE_URL | sed 's|https://||' | sed 's|/.*||')

# Update DNS records
# A record: api.urwaydispatch.com -> $DOMAIN
# CNAME record: app.urwaydispatch.com -> Vercel
# CNAME record: admin.urwaydispatch.com -> Vercel
# CNAME record: www.urwaydispatch.com -> Netlify/Vercel
```

### 7.2 SSL Certificate
```bash
# Request SSL certificate (if using self-managed)
gcloud compute ssl-certificates create rideshare-ssl \
  --domains=urwaydispatch.com,www.urwaydispatch.com,api.urwaydispatch.com

# Attach SSL certificate to load balancer
gcloud compute target-https-proxies create rideshare-https-proxy \
  --ssl-certificates=rideshare-ssl \
  --url-map=rideshare-url-map
```

## Phase 8: Final Verification

### 8.1 Health Check Script
```bash
#!/bin/bash
# health-check.sh

SERVICE_URL="https://api.urwaydispatch.com"
FRONTEND_URL="https://urwaydispatch.com"
ADMIN_URL="https://admin.urwaydispatch.com"

echo "Checking backend health..."
curl -f "$SERVICE_URL/health" || exit 1
curl -f "$SERVICE_URL/health/ready" || exit 1
curl -f "$SERVICE_URL/api/v1/health" || exit 1

echo "Checking frontend..."
curl -f "$FRONTEND_URL" || exit 1

echo "Checking admin portal..."
curl -f "$ADMIN_URL" || exit 1

echo "All health checks passed!"
```

### 8.2 Smoke Test
```bash
# Test critical user flows
# 1. User registration
# 2. Driver registration
# 3. Trip booking
# 4. Payment processing
# 5. Admin dashboard access

echo "Running smoke tests..."
# Add your smoke test commands here
```

## Phase 9: Post-Deployment

### 9.1 Monitor First 24 Hours
- Set up enhanced monitoring
- Watch for error spikes
- Monitor performance metrics
- Check alert delivery

### 9.2 Performance Optimization
- Review query performance
- Optimize caching strategies
- Tune auto-scaling parameters
- Adjust resource allocation

### 9.3 Security Hardening
- Review security headers
- Validate firewall rules
- Test authentication flows
- Verify data encryption

## Troubleshooting

### Common Issues

#### 1. Deployment Fails
```bash
# Check build logs
gcloud builds list --limit=5

# Check service logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50
```

#### 2. Health Check Fails
```bash
# Check service status
gcloud run services describe rideshare-gateway --region us-central1

# Check recent revisions
gcloud run revisions list --service rideshare-gateway --region us-central1
```

#### 3. High Error Rates
```bash
# Check error logs
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit=50

# Check metrics
gcloud monitoring metrics list --filter="metric.type:run.googleapis.com"
```

#### 4. Database Issues
```bash
# Check database connections
supabase db shell --command "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
supabase db shell --command "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

## Rollback Procedures

### 1. Quick Rollback
```bash
# Rollback to previous revision
gcloud run services rollback rideshare-gateway \
  --region us-central1 \
  --quiet
```

### 2. Full Rollback
```bash
# Delete current deployment
gcloud run services delete rideshare-gateway --region us-central1

# Redeploy previous version
gcloud run deploy rideshare-gateway \
  --image us-central1-docker.pkg.dev/rideoo-487904/rideshare-gateway:previous-tag \
  --region us-central1
```

## Maintenance

### 1. Regular Updates
- Update dependencies monthly
- Apply security patches
- Review and rotate secrets
- Update documentation

### 2. Performance Reviews
- Weekly performance metrics review
- Monthly cost optimization
- Quarterly capacity planning
- Annual architecture review

### 3. Security Reviews
- Monthly security scans
- Quarterly penetration testing
- Annual compliance audit
- Regular access reviews

## Support and Escalation

### 1. Incident Response
1. Detect: Automated monitoring alerts
2. Assess: Evaluate impact and severity
3. Respond: Implement immediate fixes
4. Resolve: Complete resolution and recovery
5. Review: Post-incident analysis

### 2. Escalation Contacts
- **Level 1**: On-call Engineer
- **Level 2**: Engineering Lead
- **Level 3**: CTO
- **Level 4**: CEO

### 3. Communication Channels
- **Internal**: Slack #incidents
- **External**: Status page updates
- **Customers**: Email notifications
- **Management**: Executive dashboard

## Conclusion

Following this comprehensive deployment guide will ensure a successful production launch of the UrWay Dispatch platform. The process includes all necessary steps for environment configuration, deployment, testing, monitoring, and maintenance.

Remember to:
- Test thoroughly in staging before production
- Monitor closely during the first 24 hours
- Have rollback procedures ready
- Document any deviations from the guide
- Keep the team informed throughout the process

Good luck with your production deployment!
