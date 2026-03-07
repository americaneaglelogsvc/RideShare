#!/bin/bash

# ============================================================================
# UrWay Dispatch - Production Secrets Setup Script
# This script sets up all required secrets for production deployment
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="rideoo-487904"
REGION="us-central1"
SECRET_PREFIX="rideshare"

echo -e "${BLUE}Setting up production secrets for UrWay Dispatch${NC}"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Function to create or update a secret
create_or_update_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local description="$3"
    
    echo -e "${YELLOW}Creating secret: $secret_name${NC}"
    
    # Check if secret exists
    if gcloud secrets describe "$secret_name" --quiet 2>/dev/null; then
        echo "Secret already exists, updating..."
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=-
    else
        echo "Creating new secret..."
        echo -n "$secret_value" | gcloud secrets create "$secret_name" --data-file=-
        gcloud secrets update "$secret_name" --description="$description" --quiet
    fi
    
    echo -e "${GREEN}✓ Secret $secret_name created/updated${NC}"
}

# Function to prompt for secret value
prompt_secret() {
    local secret_name="$1"
    local description="$2"
    local default_value="${3:-}"
    
    echo -e "${BLUE}Enter value for $secret_name${NC}"
    echo "Description: $description"
    
    if [[ -n "$default_value" ]]; then
        echo "Default: $default_value"
        read -p "Value (press Enter to use default): " value
        value="${value:-$default_value}"
    else
        read -s -p "Value: " value
        echo
    fi
    
    echo "$value"
}

# Function to generate random secret
generate_random_secret() {
    local length="${1:-32}"
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

echo -e "${BLUE}=== Authentication & Security Secrets ===${NC}"

# JWT Secret
JWT_SECRET=$(prompt_secret "JWT_SECRET" "JWT signing secret (minimum 32 characters)" "$(generate_random_secret 32)")
create_or_update_secret "${SECRET_PREFIX}-jwt-secret" "$JWT_SECRET" "JWT signing secret for authentication"

# Encryption Key
ENCRYPTION_KEY=$(prompt_secret "ENCRYPTION_KEY" "Encryption key for sensitive data (minimum 32 characters)" "$(generate_random_secret 32)")
create_or_update_secret "${SECRET_PREFIX}-encryption-key" "$ENCRYPTION_KEY" "Encryption key for sensitive data"

# Session Secret
SESSION_SECRET=$(prompt_secret "SESSION_SECRET" "Session secret for cookie signing" "$(generate_random_secret 32)")
create_or_update_secret "${SECRET_PREFIX}-session-secret" "$SESSION_SECRET" "Session secret for cookie signing"

echo -e "${BLUE}=== Database Secrets ===${NC}"

# Supabase Configuration
SUPABASE_URL=$(prompt_secret "SUPABASE_URL" "Production Supabase URL")
create_or_update_secret "${SECRET_PREFIX}-supabase-url" "$SUPABASE_URL" "Production Supabase database URL"

SUPABASE_SERVICE_ROLE_KEY=$(prompt_secret "SUPABASE_SERVICE_ROLE_KEY" "Production Supabase service role key")
create_or_update_secret "${SECRET_PREFIX}-supabase-service-key" "$SUPABASE_SERVICE_ROLE_KEY" "Production Supabase service role key"

SUPABASE_ANON_KEY=$(prompt_secret "SUPABASE_ANON_KEY" "Production Supabase anonymous key")
create_or_update_secret "${SECRET_PREFIX}-supabase-anon-key" "$SUPABASE_ANON_KEY" "Production Supabase anonymous key"

echo -e "${BLUE}=== Payment Processing Secrets ===${NC}"

# FluidPay Configuration
FLUIDPAY_API_KEY=$(prompt_secret "FLUIDPAY_API_KEY" "FluidPay production API key")
create_or_update_secret "${SECRET_PREFIX}-fluidpay-api-key" "$FLUIDPAY_API_KEY" "FluidPay production API key"

FLUIDPAY_WEBHOOK_SECRET=$(prompt_secret "FLUIDPAY_WEBHOOK_SECRET" "FluidPay webhook secret" "$(generate_random_secret 32)")
create_or_update_secret "${SECRET_PREFIX}-fluidpay-webhook-secret" "$FLUIDPAY_WEBHOOK_SECRET" "FluidPay webhook secret"

PAYSURITY_WEBHOOK_SECRET=$(prompt_secret "PAYSURITY_WEBHOOK_SECRET" "PaySurity webhook secret" "$(generate_random_secret 32)")
create_or_update_secret "${SECRET_PREFIX}-paysurity-webhook-secret" "$PAYSURITY_WEBHOOK_SECRET" "PaySurity webhook secret"

echo -e "${BLUE}=== Cloud Storage Secrets ===${NC}"

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=$(prompt_secret "AWS_ACCESS_KEY_ID" "AWS S3 access key ID")
create_or_update_secret "${SECRET_PREFIX}-aws-access-key-id" "$AWS_ACCESS_KEY_ID" "AWS S3 access key ID"

AWS_SECRET_ACCESS_KEY=$(prompt_secret "AWS_SECRET_ACCESS_KEY" "AWS S3 secret access key")
create_or_update_secret "${SECRET_PREFIX}-aws-secret-access-key" "$AWS_SECRET_ACCESS_KEY" "AWS S3 secret access key"

AWS_S3_BUCKET=$(prompt_secret "AWS_S3_BUCKET" "AWS S3 bucket name" "uwd-production-assets")
create_or_update_secret "${SECRET_PREFIX}-aws-s3-bucket" "$AWS_S3_BUCKET" "AWS S3 bucket name"

echo -e "${BLUE}=== Communication Services Secrets ===${NC}"

# Twilio Configuration
TWILIO_ACCOUNT_SID=$(prompt_secret "TWILIO_ACCOUNT_SID" "Twilio account SID")
create_or_update_secret "${SECRET_PREFIX}-twilio-account-sid" "$TWILIO_ACCOUNT_SID" "Twilio account SID"

TWILIO_AUTH_TOKEN=$(prompt_secret "TWILIO_AUTH_TOKEN" "Twilio auth token")
create_or_update_secret "${SECRET_PREFIX}-twilio-auth-token" "$TWILIO_AUTH_TOKEN" "Twilio auth token"

TWILIO_FROM_NUMBER=$(prompt_secret "TWILIO_FROM_NUMBER" "Twilio phone number")
create_or_update_secret "${SECRET_PREFIX}-twilio-from-number" "$TWILIO_FROM_NUMBER" "Twilio phone number"

# SendGrid Configuration
SENDGRID_API_KEY=$(prompt_secret "SENDGRID_API_KEY" "SendGrid API key")
create_or_update_secret "${SECRET_PREFIX}-sendgrid-api-key" "$SENDGRID_API_KEY" "SendGrid API key"

echo -e "${BLUE}=== Firebase & Push Notifications ===${NC}"

# Firebase Configuration
FIREBASE_PROJECT_ID=$(prompt_secret "FIREBASE_PROJECT_ID" "Firebase project ID")
create_or_update_secret "${SECRET_PREFIX}-firebase-project-id" "$FIREBASE_PROJECT_ID" "Firebase project ID"

FIREBASE_PRIVATE_KEY=$(prompt_secret "FIREBASE_PRIVATE_KEY" "Firebase private key (multi-line)")
create_or_update_secret "${SECRET_PREFIX}-firebase-private-key" "$FIREBASE_PRIVATE_KEY" "Firebase private key for push notifications"

FIREBASE_CLIENT_EMAIL=$(prompt_secret "FIREBASE_CLIENT_EMAIL" "Firebase client email")
create_or_update_secret "${SECRET_PREFIX}-firebase-client-email" "$FIREBASE_CLIENT_EMAIL" "Firebase client email"

echo -e "${BLUE}=== External API Keys ===${NC}"

# Google Maps Configuration
GOOGLE_MAPS_API_KEY=$(prompt_secret "GOOGLE_MAPS_API_KEY" "Google Maps API key")
create_or_update_secret "${SECRET_PREFIX}-google-maps-api-key" "$GOOGLE_MAPS_API_KEY" "Google Maps API key"

GOOGLE_GEOCODING_API_KEY=$(prompt_secret "GOOGLE_GEOCODING_API_KEY" "Google Geocoding API key")
create_or_update_secret "${SECRET_PREFIX}-google-geocoding-api-key" "$GOOGLE_GEOCODING_API_KEY" "Google Geocoding API key"

echo -e "${BLUE}=== Monitoring & Alerting Secrets ===${NC}"

# Monitoring Configuration
PAGERDUTY_ROUTING_KEY=$(prompt_secret "PAGERDUTY_ROUTING_KEY" "PagerDuty routing key")
create_or_update_secret "${SECRET_PREFIX}-pagerduty-routing-key" "$PAGERDUTY_ROUTING_KEY" "PagerDuty routing key for alerts"

SLACK_WEBHOOK_URL=$(prompt_secret "SLACK_WEBHOOK_URL" "Slack webhook URL")
create_or_update_secret "${SECRET_PREFIX}-slack-webhook-url" "$SLACK_WEBHOOK_URL" "Slack webhook URL for notifications"

SPLUNK_TOKEN=$(prompt_secret "SPLUNK_TOKEN" "Splunk HTTP event collector token")
create_or_update_secret "${SECRET_PREFIX}-splunk-token" "$SPLUNK_TOKEN" "Splunk token for log forwarding"

echo -e "${BLUE}=== Cache & Database Connection ===${NC}"

# Redis Configuration
REDIS_URL=$(prompt_secret "REDIS_URL" "Redis connection URL" "redis://production-redis-cluster:6379")
create_or_update_secret "${SECRET_PREFIX}-redis-url" "$REDIS_URL" "Redis connection URL"

echo -e "${BLUE}=== Backup & Compliance ===${NC}"

# Backup Configuration
BACKUP_ENCRYPTION_KEY=$(prompt_secret "BACKUP_ENCRYPTION_KEY" "Backup encryption key" "$(generate_random_secret 32)")
create_or_update_secret "${SECRET_PREFIX}-backup-encryption-key" "$BACKUP_ENCRYPTION_KEY" "Encryption key for database backups"

echo -e "${BLUE}=== Granting Service Account Access ===${NC}"

# Get the service account email
SERVICE_ACCOUNT_EMAIL=$(gcloud iam service-accounts list --filter="displayName:Cloud Run Service Account" --format="value(email)" --limit=1)

if [[ -z "$SERVICE_ACCOUNT_EMAIL" ]]; then
    echo -e "${YELLOW}Creating Cloud Run service account...${NC}"
    gcloud iam service-accounts create "rideshare-sa" --display-name="Cloud Run Service Account"
    SERVICE_ACCOUNT_EMAIL="rideshare-sa@${PROJECT_ID}.iam.gserviceaccount.com"
fi

# Grant access to all secrets
echo "Granting service account access to secrets..."
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-jwt-secret" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-encryption-key" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-session-secret" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-supabase-url" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-supabase-service-key" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-supabase-anon-key" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-fluidpay-api-key" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-fluidpay-webhook-secret" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-paysurity-webhook-secret" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-aws-access-key-id" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-aws-secret-access-key" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-aws-s3-bucket" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-twilio-account-sid" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-twilio-auth-token" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-twilio-from-number" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-sendgrid-api-key" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-firebase-project-id" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-firebase-private-key" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-firebase-client-email" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-google-maps-api-key" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-google-geocoding-api-key" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-pagerduty-routing-key" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-slack-webhook-url" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-splunk-token" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-redis-url" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet
gcloud secrets add-iam-policy-binding "${SECRET_PREFIX}-backup-encryption-key" --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor" --quiet

echo -e "${GREEN}✓ Service account access granted to all secrets${NC}"

echo -e "${BLUE}=== Secrets Summary ===${NC}"
echo "Total secrets created: $(gcloud secrets list --filter="name~${SECRET_PREFIX}" --format="value(name)" | wc -l)"
echo "All secrets are now ready for production deployment"

echo -e "${GREEN}=== Production Secrets Setup Complete ===${NC}"
echo ""
echo "Next steps:"
echo "1. Update GitHub Actions secrets with the same values"
echo "2. Run the production deployment workflow"
echo "3. Verify all services are healthy"
echo ""
echo -e "${YELLOW}IMPORTANT: Keep all secret values secure and never commit them to version control${NC}"
