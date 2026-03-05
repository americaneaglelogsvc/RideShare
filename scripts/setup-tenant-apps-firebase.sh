#!/bin/bash

# Automated Firebase app setup for tenant-specific mobile apps
# Usage: ./setup-tenant-apps-firebase.sh

set -e

PROJECT_ID="rideoo-487904-18dff"
SERVICE_ACCOUNT_KEY="./google-service-account.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Tenant-Specific Firebase App Setup ===${NC}"

# Install Firebase CLI if not present
if ! command -v firebase &> /dev/null; then
    echo -e "${YELLOW}Installing Firebase CLI...${NC}"
    npm install -g firebase-tools
fi

# Login to Firebase
echo -e "${YELLOW}Logging into Firebase...${NC}"
firebase login --no-localhost

# Tenant configurations
declare -a TENANTS=(
    "goldravenia:goldravenia.com:a1b2c3d4-0001-4000-8000-000000000001:com.goldravenia.rider:com.goldravenia.driver:GoldRavenia Rider:GoldRavenia Driver"
    "blackravenia:blackravenia.com:a1b2c3d4-0002-4000-8000-000000000002:com.blackravenia.rider:com.blackravenia.driver:BlackRavenia Rider:BlackRavenia Driver"
)

# Create tenant-specific app directories
for tenant_config in "${TENANTS[@]}"; do
    IFS=':' read -r name domain tenant_id rider_bundle driver_bundle rider_display driver_display <<< "$tenant_config"
    
    echo -e "${BLUE}Creating tenant-specific app directories...${NC}"
    echo -e "  - apps/rider-app-$name${NC}"
    echo -e "  - apps/driver-app-$name${NC}"
    
    # Copy template apps if they exist
    if [ -d "apps/rider-app-native" ]; then
        cp -r "apps/rider-app-native" "apps/rider-app-$name"
    fi
    if [ -d "apps/driver-app-native" ]; then
        cp -r "apps/driver-app-native" "apps/driver-app-$name"
    fi
done

# Setup Firebase apps for each tenant
for tenant_config in "${TENANTS[@]}"; do
    IFS=':' read -r name domain tenant_id rider_bundle driver_bundle rider_display driver_display <<< "$tenant_config"
    
    echo -e "\n${GREEN}=== Setting up Firebase apps for $name ===${NC}"
    
    rider_dir="apps/rider-app-$name"
    driver_dir="apps/driver-app-$name"
    
    # Update app.json files with tenant-specific bundle IDs
    echo -e "${YELLOW}Updating app configurations...${NC}"
    
    # Update rider app.json
    jq --arg name "$rider_display" \
       --arg slug "rider-app-$name" \
       --arg bundle "$rider_bundle" \
       '.expo.name = $name | .expo.slug = $slug | .expo.ios.bundleIdentifier = $bundle | .expo.android.package = $bundle' \
       "$rider_dir/app.json" > "$rider_dir/app.json.tmp" && mv "$rider_dir/app.json.tmp" "$rider_dir/app.json"
    
    # Update driver app.json
    jq --arg name "$driver_display" \
       --arg slug "driver-app-$name" \
       --arg bundle "$driver_bundle" \
       '.expo.name = $name | .expo.slug = $slug | .expo.ios.bundleIdentifier = $bundle | .expo.android.package = $bundle' \
       "$driver_dir/app.json" > "$driver_dir/app.json.tmp" && mv "$driver_dir/app.json.tmp" "$driver_dir/app.json"
    
    # Update eas.json with tenant-specific configuration
    jq --arg tenant_id "$tenant_id" \
       '.build.preview.env."EXPO_PUBLIC_TENANT_ID" = $tenant_id | .build.production.env."EXPO_PUBLIC_TENANT_ID" = $tenant_id' \
       "$rider_dir/eas.json" > "$rider_dir/eas.json.tmp" && mv "$rider_dir/eas.json.tmp" "$rider_dir/eas.json"
    
    jq --arg tenant_id "$tenant_id" \
       '.build.preview.env."EXPO_PUBLIC_TENANT_ID" = $tenant_id | .build.production.env."EXPO_PUBLIC_TENANT_ID" = $tenant_id' \
       "$driver_dir/eas.json" > "$driver_dir/eas.json.tmp" && mv "$driver_dir/eas.json.tmp" "$driver_dir/eas.json"
    
    echo -e "${GREEN}✅ Updated app configurations for $name${NC}"
    
    # Create Firebase apps using CLI
    echo -e "${YELLOW}Creating Firebase apps...${NC}"
    
    # Create Android apps
    firebase apps:create android "$rider_bundle" --display-name="$rider_display Android" --project="$PROJECT_ID" || echo -e "${RED}Android app creation failed for $rider_bundle${NC}"
    firebase apps:create android "$driver_bundle" --display-name="$driver_display Android" --project="$PROJECT_ID" || echo -e "${RED}Android app creation failed for $driver_bundle${NC}"
    
    # Download config files
    echo -e "${YELLOW}Downloading Firebase config files...${NC}"
    firebase apps:sdkconfig android "$rider_dir" --project="$PROJECT_ID" || echo -e "${RED}Config download failed for rider${NC}"
    firebase apps:sdkconfig android "$driver_dir" --project="$PROJECT_ID" || echo -e "${RED}Config download failed for driver${NC}"
    
    echo -e "${GREEN}✅ Firebase setup complete for $name${NC}"
done

echo -e "\n${MAGENTA}=== Summary ===${NC}"
echo -e "${WHITE}Created tenant-specific apps:${NC}"
for tenant_config in "${TENANTS[@]}"; do
    IFS=':' read -r name domain tenant_id rider_bundle driver_bundle rider_display driver_display <<< "$tenant_config"
    echo -e "  - $rider_display: $rider_bundle${NC}"
    echo -e "  - $driver_display: $driver_bundle${NC}"
done

echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "${WHITE}1. Review downloaded Firebase config files${NC}"
echo -e "${WHITE}2. Test builds with: eas build --platform all --profile preview${NC}"
echo -e "${WHITE}3. Update branding assets for each tenant${NC}"
echo -e "${WHITE}4. Run: eas init in each app directory${NC}"
