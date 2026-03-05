#!/usr/bin/env tsx

/**
 * Tenant Asset Sync System
 * Keeps tenant-specific mobile apps and web assets in sync
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TenantConfig {
  tenantId: string;
  tenantName: string;
  domain: string;
  riderBundleId: string;
  driverBundleId: string;
}

interface SyncResult {
  tenantId: string;
  success: boolean;
  syncedAssets: string[];
  errors: string[];
  timestamp: string;
}

class TenantAssetSync {
  private tenants: TenantConfig[] = [
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

  private baseDir = './generated-apps';
  private brandingDir = './branding-assets';

  async syncAllTenants(): Promise<SyncResult[]> {
    console.log('🔄 Starting tenant asset synchronization...');
    const results: SyncResult[] = [];

    for (const tenant of this.tenants) {
      console.log(`\n📱 Syncing ${tenant.tenantName}...`);
      const result = await this.syncTenant(tenant);
      results.push(result);
    }

    await this.generateSyncReport(results);
    return results;
  }

  private async syncTenant(tenant: TenantConfig): Promise<SyncResult> {
    const result: SyncResult = {
      tenantId: tenant.tenantId,
      success: true,
      syncedAssets: [],
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      // Sync branding assets
      await this.syncBrandingAssets(tenant, result);

      // Sync mobile app configurations
      await this.syncMobileAppConfigs(tenant, result);

      // Sync web assets
      await this.syncWebAssets(tenant, result);

      console.log(`✅ ${tenant.tenantName} sync complete`);
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
      console.log(`❌ ${tenant.tenantName} sync failed: ${error.message}`);
    }

    return result;
  }

  private async syncBrandingAssets(tenant: TenantConfig, result: SyncResult): Promise<void> {
    const tenantBrandingDir = path.join(this.brandingDir, tenant.domain);
    
    // Ensure branding directory exists
    await fs.mkdir(tenantBrandingDir, { recursive: true });

    // Sync branding configuration
    const brandingConfig = {
      tenant: tenant.tenantName,
      domain: tenant.domain,
      colors: {
        primary: tenant.domain === 'goldravenia.com' ? '#d4a017' : '#1a1a1a',
        secondary: tenant.domain === 'goldravenia.com' ? '#0f172a' : '#ffffff',
        accent: tenant.domain === 'goldravenia.com' ? '#f59e0b' : '#3b82f6',
      },
      theme: tenant.domain === 'goldravenia.com' ? 'luxury' : 'premium',
      assets: {
        icon: `./icons/${tenant.domain}-app-icon.png`,
        splash: `./splash/${tenant.domain}-splash.png`,
        logo: `./images/${tenant.domain}-logo.png`,
      },
    };

    const brandingConfigPath = path.join(tenantBrandingDir, 'branding.json');
    await fs.writeFile(brandingConfigPath, JSON.stringify(brandingConfig, null, 2));
    result.syncedAssets.push(brandingConfigPath);

    // Copy common branding assets if they exist
    const commonAssetsDir = './branding-assets/common';
    try {
      await fs.access(commonAssetsDir);
      await this.copyDirectory(commonAssetsDir, tenantBrandingDir);
      result.syncedAssets.push(`${tenantBrandingDir}/*`);
    } catch {
      // Common assets directory doesn't exist, skip
    }
  }

  private async syncMobileAppConfigs(tenant: TenantConfig, result: SyncResult): Promise<void> {
    const riderAppDir = path.join(this.baseDir, `rider-app-${tenant.domain.replace('.', '')}`);
    const driverAppDir = path.join(this.baseDir, `driver-app-${tenant.domain.replace('.', '')}`);

    // Update app.json files with latest branding
    for (const [appDir, appType] of [
      [riderAppDir, 'rider'],
      [driverAppDir, 'driver'],
    ] as const) {
      try {
        const appJsonPath = path.join(appDir, 'app.json');
        const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf-8'));

        // Update branding references
        appJson.expo.name = `${tenant.tenantName} ${appType.charAt(0).toUpperCase() + appType.slice(1)}`;
        appJson.expo.slug = `${appType}-app-${tenant.domain.replace('.', '')}`;

        await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
        result.syncedAssets.push(appJsonPath);
      } catch (error) {
        result.errors.push(`Failed to sync ${appType} app.json: ${error}`);
      }
    }
  }

  private async syncWebAssets(tenant: TenantConfig, result: SyncResult): Promise<void> {
    // Sync web branding assets
    const webBrandingDir = path.join('./public/brands', tenant.domain);
    await fs.mkdir(webBrandingDir, { recursive: true });

    // Create web branding CSS
    const cssContent = `
:root {
  --brand-primary: ${tenant.domain === 'goldravenia.com' ? '#d4a017' : '#1a1a1a'};
  --brand-secondary: ${tenant.domain === 'goldravenia.com' ? '#0f172a' : '#ffffff'};
  --brand-accent: ${tenant.domain === 'goldravenia.com' ? '#f59e0b' : '#3b82f6'};
  --brand-theme: '${tenant.domain === 'goldravenia.com' ? 'luxury' : 'premium'}';
}

.brand-${tenant.domain} {
  color: var(--brand-primary);
}
`;

    const cssPath = path.join(webBrandingDir, 'brand.css');
    await fs.writeFile(cssPath, cssContent);
    result.syncedAssets.push(cssPath);
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async generateSyncReport(results: SyncResult[]): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTenants: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        totalAssetsSynced: results.reduce((sum, r) => sum + r.syncedAssets.length, 0),
        totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      },
      results,
    };

    const reportPath = './sync-report.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n' + '='.repeat(60));
    console.log('📊 TENANT SYNC REPORT');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${report.summary.successful}/${report.summary.totalTenants}`);
    console.log(`❌ Failed: ${report.summary.failed}/${report.summary.totalTenants}`);
    console.log(`📁 Assets Synced: ${report.summary.totalAssetsSynced}`);
    console.log(`🚨 Errors: ${report.summary.totalErrors}`);
    console.log(`📄 Report saved to: ${reportPath}`);
    console.log('='.repeat(60));
  }

  async watchForChanges(): Promise<void> {
    console.log('👀 Watching for tenant asset changes...');
    
    // Simple file watcher implementation
    setInterval(async () => {
      try {
        await this.syncAllTenants();
      } catch (error) {
        console.error('Watch sync failed:', error);
      }
    }, 30000); // Sync every 30 seconds
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const sync = new TenantAssetSync();
  
  if (process.argv.includes('--watch')) {
    sync.watchForChanges();
  } else {
    sync.syncAllTenants().catch(error => {
      console.error('❌ Sync failed:', error.message);
      process.exit(1);
    });
  }
}

export { TenantAssetSync };
