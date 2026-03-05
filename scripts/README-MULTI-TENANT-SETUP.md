# Multi-Tenant Firebase Setup Automation

This directory contains scripts to automate the creation of Firebase projects and mobile apps for each tenant in your multi-tenant rideshare platform.

## 🎯 What This Does

Following Firebase Gemini's recommendations, this automation creates:
- **Separate Firebase projects per tenant** (complete data isolation)
- **Tenant-branded mobile apps** (rider + driver per tenant)
- **Automated config file generation** (google-services.json)
- **Branding structure** (colors, assets, themes)
- **Zero manual Firebase Console work**

## 📋 Prerequisites

### 1. Google Cloud SDK
```bash
# Install gcloud CLI
# Visit: https://cloud.google.com/sdk/docs/install
```

### 2. Authentication
```bash
# Authenticate with Google Cloud
gcloud auth login
gcloud config set project rideoo-487904-18dff
```

### 3. Install Dependencies
```bash
cd scripts
npm install
```

## 🚀 Quick Start

### Step 1: Set Up Service Account
```bash
# Run the service account setup script
./setup-firebase-service-account.sh

# Or manually:
gcloud iam service-accounts create firebase-automation \
  --display-name="Firebase Automation Service Account"

gcloud projects add-iam-policy-binding rideoo-487904-18dff \
  --member="serviceAccount:firebase-automation@rideoo-487904-18dff.iam.gserviceaccount.com" \
  --role="roles/firebase.managementAdmin"

gcloud iam service-accounts keys create firebase-service-account.json \
  --iam-account="firebase-automation@rideoo-487904-18dff.iam.gserviceaccount.com"
```

### Step 2: Generate Tenant Apps
```bash
# Generate apps for all configured tenants
npx tsx generate-tenant-apps.ts

# Or specify output directory:
OUTPUT_DIR=./my-apps npx tsx generate-tenant-apps.ts
```

### Step 3: Test the Setup
```bash
# Run integration tests
npx tsx test-multi-tenant-setup.ts
```

## 📁 Generated Structure

After running the generator, you'll get:

```
generated-apps/
├── rider-app-goldraveniacom/
│   ├── app.json              # Updated with tenant branding
│   ├── eas.json              # Tenant-specific build config
│   ├── package.json          # Tenant app metadata
│   └── google-services.json  # Firebase config
├── driver-app-goldraveniacom/
│   ├── app.json
│   ├── eas.json
│   ├── package.json
│   └── google-services.json
├── rider-app-blackraveniacom/
├── driver-app-blackraveniacom/
└── branding/
    ├── goldravenia.com/
    │   ├── branding.json      # Colors, theme, assets
    │   ├── icons/
    │   ├── splash/
    │   └── images/
    └── blackravenia.com/
        ├── branding.json
        ├── icons/
        ├── splash/
        └── images/
```

## 🔧 Configuration

### Adding New Tenants

Edit `generate-tenant-apps.ts` and add your tenant configuration:

```typescript
const tenants: TenantConfig[] = [
  // Existing tenants...
  {
    tenantId: 'a1b2c3d4-0003-4000-8000-000000000003',
    tenantName: 'YourTenant',
    domain: 'yourtenant.com',
    riderBundleId: 'com.yourtenant.rider',
    driverBundleId: 'com.yourtenant.driver',
  },
];
```

### Custom Branding

Each tenant gets a `branding.json` file:

```json
{
  "tenant": { ... },
  "colors": {
    "primary": "#your-brand-color",
    "secondary": "#your-secondary-color",
    "accent": "#your-accent-color"
  },
  "theme": "luxury" | "premium" | "standard",
  "assets": {
    "icon": "./icons/app-icon.png",
    "splash": "./splash/splash.png",
    "logo": "./images/logo.png"
  }
}
```

## 📱 Building the Apps

### Prerequisites
```bash
# Install Expo CLI
npm install -g @expo/cli eas-cli

# Install app dependencies
cd generated-apps/rider-app-goldraveniacom
npm install
```

### Build Commands
```bash
# Preview build (internal testing)
eas build --platform all --profile preview

# Production build (for app stores)
eas build --platform all --profile production

# Local development
eas build --platform all --profile development
```

## 🔍 Testing

### Integration Tests
```bash
# Run full integration test suite
npx tsx test-multi-tenant-setup.ts

# Test specific components
npx tsx firebase-management-client.ts  # Test Firebase API
npx tsx generate-tenant-apps.ts       # Test app generation
```

### Manual Testing Checklist
- [ ] Firebase projects created in console
- [ ] Android apps registered with correct bundle IDs
- [ ] Config files contain valid API keys
- [ ] Apps build without errors
- [ ] Push notifications work (test with real device)
- [ ] Tenant branding applied correctly

## 🛠️ Troubleshooting

### Common Issues

**"Permission denied" errors**
```bash
# Check service account permissions
gcloud projects get-iam-policy rideoo-487904-18dff

# Ensure Firebase Management Admin role is granted
gcloud projects add-iam-policy-binding rideoo-487904-18dff \
  --member="serviceAccount:firebase-automation@rideoo-487904-18dff.iam.gserviceaccount.com" \
  --role="roles/firebase.managementAdmin"
```

**"Project already exists"**
- This is normal - the script will reuse existing projects
- Check the Firebase Console to verify

**"Bundle ID already in use"**
- The bundle ID is already registered in another Firebase project
- Choose a different bundle ID or check existing projects

**Build failures**
```bash
# Check app.json syntax
cat generated-apps/rider-app-*/app.json | jq .

# Verify Firebase config
cat generated-apps/rider-app-*/google-services.json | jq .

# Check EAS configuration
eas build:list
```

### Debug Mode

Set environment variable for verbose logging:
```bash
export DEBUG=firebase:*
npx tsx generate-tenant-apps.ts
```

## 📚 API Reference

### FirebaseManagementClient

```typescript
const client = new FirebaseManagementClient('./firebase-service-account.json');

// Create project
const project = await client.createProject(tenantConfig);

// Create Android app
const app = await client.createAndroidApp(projectId, packageName, displayName);

// Download config
const config = await client.getAndroidAppConfig(appName);
```

### TenantAppGenerator

```typescript
const generator = new TenantAppGenerator();

// Generate apps
await generator.generateTenantApps({
  tenantConfig,
  firebaseProjectId,
  outputDir: './generated-apps'
});

// Create branding structure
await generator.createBrandingStructure(tenantConfig, outputDir);
```

## 🔐 Security Notes

- Keep `firebase-service-account.json` secure and never commit to Git
- Add to `.gitignore`: `firebase-service-account.json`
- Use environment variables in production
- Regularly rotate service account keys
- Monitor Firebase project usage and costs

## 📞 Support

If you encounter issues:

1. Check the Firebase Console for project status
2. Verify Google Cloud IAM permissions
3. Run integration tests for detailed error reports
4. Check the test output in `test-output/test-report.json`

## 🚀 Next Steps

After generating the apps:

1. **Add branding assets** to `branding/{tenant}/icons/`, `splash/`, `images/`
2. **Test builds** with `eas build --profile preview`
3. **Set up app store accounts** (Apple Developer, Google Play)
4. **Submit for review** when ready
5. **Monitor Firebase usage** and set up billing alerts

## 📈 Scaling

This automation supports unlimited tenants:
- Each tenant gets their own Firebase project (recommended by Gemini)
- Complete data and billing isolation
- Automated onboarding for new tenants
- Zero manual Firebase Console work required

Perfect for B2B SaaS scaling! 🎉
