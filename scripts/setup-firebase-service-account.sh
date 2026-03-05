#!/bin/bash

# Firebase Service Account Setup Script
# Creates service account with Firebase Management Admin role

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="rideoo-487904-18dff"
SERVICE_ACCOUNT_NAME="firebase-automation"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILE="firebase-service-account.json"

echo -e "${BLUE}=== Firebase Service Account Setup ===${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Please install Google Cloud SDK first.${NC}"
    echo -e "${YELLOW}Visit: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}🔐 Please authenticate with Google Cloud:${NC}"
    gcloud auth login
fi

# Set the project
echo -e "${YELLOW}📋 Setting project to: ${PROJECT_ID}${NC}"
gcloud config set project "${PROJECT_ID}"

# Create service account
echo -e "${YELLOW}🔧 Creating service account: ${SERVICE_ACCOUNT_NAME}${NC}"
if gcloud iam service-accounts describe "${SERVICE_ACCOUNT_EMAIL}" &> /dev/null; then
    echo -e "${BLUE}ℹ️  Service account already exists${NC}"
else
    gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
        --display-name="Firebase Automation Service Account" \
        --description="Service account for automated Firebase project and app management"
    echo -e "${GREEN}✅ Service account created${NC}"
fi

# Grant Firebase Management Admin role
echo -e "${YELLOW}👑 Granting Firebase Management Admin role${NC}"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/firebase.managementAdmin"

# Grant additional required roles
echo -e "${YELLOW}🔐 Granting additional required roles${NC}"

# Resource Manager role (to create projects)
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/resourcemanager.projectCreator"

# Service Account User role (to manage service accounts)
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/iam.serviceAccountUser"

# Create and download service account key
echo -e "${YELLOW}🔑 Creating service account key${NC}"
if [ -f "${KEY_FILE}" ]; then
    echo -e "${BLUE}ℹ️  Key file already exists, backing up...${NC}"
    mv "${KEY_FILE}" "${KEY_FILE}.backup.$(date +%s)"
fi

gcloud iam service-accounts keys create "${KEY_FILE}" \
    --iam-account="${SERVICE_ACCOUNT_EMAIL}" \
    --key-file-type=JSON

echo -e "${GREEN}✅ Service account key saved to: ${KEY_FILE}${NC}"

# Test the service account
echo -e "${YELLOW}🧪 Testing service account permissions${NC}"
export GOOGLE_APPLICATION_CREDENTIALS="${KEY_FILE}"

# Try to list Firebase projects (basic test)
if gcloud firebase projects list &> /dev/null; then
    echo -e "${GREEN}✅ Service account has proper Firebase permissions${NC}"
else
    echo -e "${RED}❌ Service account test failed${NC}"
    echo -e "${YELLOW}Please check IAM permissions and try again${NC}"
    exit 1
fi

# Display summary
echo -e "\n${MAGENTA}=== Setup Complete ===${NC}"
echo -e "${WHITE}Service Account:${NC} ${SERVICE_ACCOUNT_EMAIL}"
echo -e "${WHITE}Key File:${NC} ${KEY_FILE}"
echo -e "${WHITE}Roles Granted:${NC}"
echo -e "  - Firebase Management Admin"
echo -e "  - Resource Manager Project Creator"
echo -e "  - IAM Service Account User"

echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "${WHITE}1. Test the Firebase Management client:${NC}"
echo -e "   npx tsx scripts/firebase-management-client.ts"
echo -e "${WHITE}2. Keep the key file secure and commit to .gitignore${NC}"
echo -e "${WHITE}3. Set up environment variable for production:${NC}"
echo -e "   export GOOGLE_APPLICATION_CREDENTIALS=${KEY_FILE}"

echo -e "\n${GREEN}🎉 Firebase service account setup complete!${NC}"
