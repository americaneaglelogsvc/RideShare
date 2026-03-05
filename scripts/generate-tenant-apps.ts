#!/usr/bin/env tsx

/**
 * Tenant App Generator
 * Creates tenant-specific mobile apps from templates with proper branding and configuration
 */

import { FirebaseManagementClient, TenantConfig } from './firebase-management-client';
import { promises as fs } from 'fs';
import path from 'path';

interface AppGenerationConfig {
  tenantConfig: TenantConfig;
  firebaseProjectId: string;
  outputDir: string;
}

class TenantAppGenerator {
  /**
   * Generate tenant-specific mobile apps from templates
   */
  async generateTenantApps(config: AppGenerationConfig): Promise<void> {
    const { tenantConfig, firebaseProjectId, outputDir } = config;
    
    console.log(`\n🏗️  Generating ${tenantConfig.tenantName} mobile apps...`);
    
    // Create tenant-specific directories
    const riderDir = path.join(outputDir, `rider-app-${tenantConfig.domain.replace('.', '')}`);
    const driverDir = path.join(outputDir, `driver-app-${tenantConfig.domain.replace('.', '')}`);
    
    await fs.mkdir(riderDir, { recursive: true });
    await fs.mkdir(driverDir, { recursive: true });
    
    // Copy template apps
    await this.copyTemplateApp('apps/rider-app-native', riderDir, tenantConfig, 'rider');
    await this.copyTemplateApp('apps/driver-app-native', driverDir, tenantConfig, 'driver');
    
    // Update app configurations
    await this.updateAppJson(riderDir, tenantConfig, 'rider', firebaseProjectId);
    await this.updateAppJson(driverDir, tenantConfig, 'driver', firebaseProjectId);
    
    // Update EAS configuration
    await this.updateEasJson(riderDir, tenantConfig);
    await this.updateEasJson(driverDir, tenantConfig);
    
    // Update package.json
    await this.updatePackageJson(riderDir, tenantConfig, 'rider');
    await this.updatePackageJson(driverDir, tenantConfig, 'driver');
    
    console.log(`✅ Generated apps for ${tenantConfig.tenantName}`);
  }
  
  /**
   * Copy template app to tenant directory
   */
  private async copyTemplateApp(
    templateDir: string,
    targetDir: string,
    tenantConfig: TenantConfig,
    appType: 'rider' | 'driver'
  ): Promise<void> {
    try {
      await fs.cp(templateDir, targetDir, { recursive: true });
      console.log(`📁 Copied ${appType} template to ${targetDir}`);
    } catch (error: any) {
      throw new Error(`Failed to copy ${appType} template: ${error.message}`);
    }
  }
  
  /**
   * Update app.json with tenant-specific configuration
   */
  private async updateAppJson(
    appDir: string,
    tenantConfig: TenantConfig,
    appType: 'rider' | 'driver',
    firebaseProjectId: string
  ): Promise<void> {
    const appJsonPath = path.join(appDir, 'app.json');
    const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf-8'));
    
    const displayName = appType === 'rider' 
      ? `${tenantConfig.tenantName} Rider`
      : `${tenantConfig.tenantName} Driver`;
    
    const bundleId = appType === 'rider'
      ? tenantConfig.riderBundleId
      : tenantConfig.driverBundleId;
    
    // Update basic app info
    appJson.expo.name = displayName;
    appJson.expo.slug = `${appType}-app-${tenantConfig.domain.replace('.', '')}`;
    
    // Update iOS configuration
    appJson.expo.ios.bundleIdentifier = bundleId;
    if (appType === 'driver') {
      // Driver app needs background location
      appJson.expo.ios.infoPlist.UIBackgroundModes = ['location', 'fetch', 'remote-notification'];
      appJson.expo.ios.infoPlist.NSLocationAlwaysAndWhenInUseUsageDescription = 
        `We need your location to match you with nearby ride requests.`;
      appJson.expo.ios.infoPlist.NSLocationWhenInUseUsageDescription = 
        `We need your location to show your position on the map.`;
    }
    
    // Update Android configuration
    appJson.expo.android.package = bundleId;
    
    // Update Firebase configuration
    appJson.expo.ios.googleServicesFile = `./GoogleService-Info.plist`;
    appJson.expo.android.googleServicesFile = `./google-services.json`;
    
    // Update deep linking
    appJson.expo.scheme = `urway-${appType}-${tenantConfig.domain.replace('.', '')}`;
    
    // Write updated app.json
    await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log(`📝 Updated app.json for ${appType} app`);
  }
  
  /**
   * Update eas.json with tenant-specific build configuration
   */
  private async updateEasJson(
    appDir: string,
    tenantConfig: TenantConfig
  ): Promise<void> {
    const easJsonPath = path.join(appDir, 'eas.json');
    const easJson = JSON.parse(await fs.readFile(easJsonPath, 'utf-8'));
    
    // Update environment variables for tenant
    easJson.build.preview.env['EXPO_PUBLIC_TENANT_ID'] = tenantConfig.tenantId;
    easJson.build.production.env['EXPO_PUBLIC_TENANT_ID'] = tenantConfig.tenantId;
    
    // Update app names for submission
    easJson.submit.production.ios.appName = `${tenantConfig.tenantName} Rider`;
    easJson.submit.production.android.name = `${tenantConfig.tenantName} Rider`;
    
    await fs.writeFile(easJsonPath, JSON.stringify(easJson, null, 2));
    console.log(`📝 Updated eas.json for ${tenantConfig.tenantName}`);
  }
  
  /**
   * Update package.json with tenant-specific information
   */
  private async updatePackageJson(
    appDir: string,
    tenantConfig: TenantConfig,
    appType: 'rider' | 'driver'
  ): Promise<void> {
    const packageJsonPath = path.join(appDir, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    const displayName = appType === 'rider' 
      ? `${tenantConfig.tenantName} Rider`
      : `${tenantConfig.tenantName} Driver`;
    
    packageJson.name = `${appType}-app-${tenantConfig.domain.replace('.', '')}`;
    packageJson.displayName = displayName;
    packageJson.description = `${displayName} mobile application for ${tenantConfig.tenantName}`;
    
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`📝 Updated package.json for ${appType} app`);
  }
  
  /**
   * Create branding assets directory structure
   */
  async createBrandingStructure(
    tenantConfig: TenantConfig,
    outputDir: string
  ): Promise<void> {
    const brandingDir = path.join(outputDir, 'branding', tenantConfig.domain);
    
    await fs.mkdir(brandingDir, { recursive: true });
    await fs.mkdir(path.join(brandingDir, 'icons'), { recursive: true });
    await fs.mkdir(path.join(brandingDir, 'splash'), { recursive: true });
    await fs.mkdir(path.join(brandingDir, 'images'), { recursive: true });
    
    // Create branding configuration file
    const brandingConfig = {
      tenant: tenantConfig,
      colors: {
        primary: tenantConfig.domain === 'goldravenia.com' ? '#d4a017' : '#1a1a1a',
        secondary: tenantConfig.domain === 'goldravenia.com' ? '#0f172a' : '#ffffff',
        accent: tenantConfig.domain === 'goldravenia.com' ? '#f59e0b' : '#3b82f6',
      },
      assets: {
        icon: `./icons/app-icon.png`,
        splash: `./splash/splash.png`,
        logo: `./images/logo.png`,
      },
      theme: tenantConfig.domain === 'goldravenia.com' ? 'luxury' : 'premium',
    };
    
    await fs.writeFile(
      path.join(brandingDir, 'branding.json'),
      JSON.stringify(brandingConfig, null, 2)
    );
    
    console.log(`🎨 Created branding structure for ${tenantConfig.tenantName}`);
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const outputDir = process.env.OUTPUT_DIR || './generated-apps';
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || './firebase-service-account.json';
  
  const tenants: TenantConfig[] = [
    {
      tenantId: 'a1b2c3d4-0001-4000-8000-000000000001',
      tenantName: 'GoldRavenia',
      domain: 'goldravenia.com',
      riderBundleId: 'com.goldravenia.rider',
      driverBundleId: 'com.goldravenia.driver',
    },
    {
      tenantId: 'a1b2c3d4-0002-4000-8000-000000000002',
      tenantName: 'BlackRavenia',
      domain: 'blackravenia.com',
      riderBundleId: 'com.blackravenia.rider',
      driverBundleId: 'com.blackravenia.driver',
    },
  ];
  
  async function main() {
    try {
      const generator = new TenantAppGenerator();
      const firebaseClient = new FirebaseManagementClient(serviceAccountKey);
      
      for (const tenant of tenants) {
        // 1. Setup Firebase project and apps
        const firebaseResult = await firebaseClient.setupTenant(tenant);
        
        // 2. Generate mobile apps
        await generator.generateTenantApps({
          tenantConfig: tenant,
          firebaseProjectId: firebaseResult.project.projectId,
          outputDir,
        });
        
        // 3. Create branding structure
        await generator.createBrandingStructure(tenant, outputDir);
        
        // 4. Save Firebase config files
        const riderDir = path.join(outputDir, `rider-app-${tenant.domain.replace('.', '')}`);
        const driverDir = path.join(outputDir, `driver-app-${tenant.domain.replace('.', '')}`);
        
        await fs.writeFile(
          path.join(riderDir, 'google-services.json'),
          firebaseResult.riderConfig.configContents
        );
        
        await fs.writeFile(
          path.join(driverDir, 'google-services.json'),
          firebaseResult.driverConfig.configContents
        );
        
        console.log(`\n🎉 ${tenant.tenantName} setup complete!`);
        console.log(`📁 Rider app: ${riderDir}`);
        console.log(`📁 Driver app: ${driverDir}`);
      }
      
      console.log('\n🚀 All tenant apps generated successfully!');
      console.log('\nNext steps:');
      console.log('1. Review generated apps in ./generated-apps/');
      console.log('2. Add branding assets to ./branding/{tenant}/');
      console.log('3. Test builds with: eas build --platform all --profile preview');
      
    } catch (error: any) {
      console.error('❌ Generation failed:', error.message);
      process.exit(1);
    }
  }
  
  main();
}

export { TenantAppGenerator, AppGenerationConfig };
