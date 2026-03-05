#!/usr/bin/env tsx

/**
 * Firebase Management API Client for Multi-Tenant Setup
 * Automates creation of Firebase projects and apps per tenant
 */

import { GoogleAuth } from 'google-auth-library';
import axios, { AxiosInstance } from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

interface TenantConfig {
  tenantId: string;
  tenantName: string;
  domain: string;
  riderBundleId: string;
  driverBundleId: string;
}

interface FirebaseProject {
  projectId: string;
  displayName: string;
  projectNumber: string;
  state: 'ACTIVE' | 'DELETED';
}

interface FirebaseApp {
  name: string;
  appId: string;
  displayName: string;
  platform: 'ANDROID' | 'IOS' | 'WEB';
  packageName?: string;
  bundleId?: string;
}

interface AppConfig {
  configFilename: string;
  configContents: string;
}

class FirebaseManagementClient {
  private auth: GoogleAuth;
  private api: AxiosInstance;
  private base_url = 'https://firebase.googleapis.com/v1beta1';

  constructor(serviceAccountKeyPath: string) {
    this.auth = new GoogleAuth({
      keyFile: serviceAccountKeyPath,
      scopes: ['https://www.googleapis.com/auth/firebase.management'],
    });

    this.api = axios.create({
      baseURL: this.base_url,
      timeout: 30000,
    });

    // Add auth interceptor
    this.api.interceptors.request.use(async (config) => {
      const client = await this.auth.getClient();
      const headers = await client.getRequestHeaders();
      config.headers = { ...config.headers, ...headers } as any;
      return config;
    });
  }

  /**
   * Create a new Firebase project for a tenant
   */
  async createProject(config: TenantConfig): Promise<FirebaseProject> {
    const projectId = `rideshare-${config.domain.replace('.', '-')}`;
    
    try {
      console.log(`Creating Firebase project: ${projectId}`);
      
      const response = await this.api.post('/projects', {
        projectId,
        displayName: `${config.tenantName} RideShare`,
      });

      const project = response.data;
      console.log(`✅ Project created: ${project.projectId}`);
      
      // Wait for project to be ready
      await this.waitForProjectActivation(projectId);
      
      return project;
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log(`⚠️  Project ${projectId} already exists, fetching...`);
        return await this.getProject(projectId);
      }
      throw new Error(`Failed to create project: ${error.message}`);
    }
  }

  /**
   * Get existing Firebase project
   */
  async getProject(projectId: string): Promise<FirebaseProject> {
    const response = await this.api.get(`/projects/${projectId}`);
    return response.data;
  }

  /**
   * Wait for project to become active
   */
  private async waitForProjectActivation(projectId: string): Promise<void> {
    console.log(`Waiting for project ${projectId} to become active...`);
    
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max
    
    while (attempts < maxAttempts) {
      try {
        const project = await this.getProject(projectId);
        if (project.state === 'ACTIVE') {
          console.log(`✅ Project ${projectId} is active`);
          return;
        }
      } catch (error) {
        // Project might not be ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
      attempts++;
    }
    
    throw new Error(`Project ${projectId} did not become active in time`);
  }

  /**
   * Create Android app for a project
   */
  async createAndroidApp(projectId: string, packageName: string, displayName: string): Promise<FirebaseApp> {
    try {
      console.log(`Creating Android app: ${packageName}`);
      
      const response = await this.api.post(`/projects/${projectId}/androidApps`, {
        displayName,
        packageName,
      });

      const app = response.data;
      console.log(`✅ Android app created: ${app.appId}`);
      
      return app;
    } catch (error: any) {
      if (error.response?.status === 409) {
        console.log(`⚠️  Android app ${packageName} already exists, fetching...`);
        return await this.getAndroidApp(projectId, packageName);
      }
      throw new Error(`Failed to create Android app: ${error.message}`);
    }
  }

  /**
   * Get existing Android app
   */
  async getAndroidApp(projectId: string, packageName: string): Promise<FirebaseApp> {
    const response = await this.api.get(`/projects/${projectId}/androidApps`, {
      params: { packageName }
    });
    
    const apps = response.data.apps;
    if (!apps || apps.length === 0) {
      throw new Error(`Android app ${packageName} not found`);
    }
    
    return apps[0];
  }

  /**
   * Download Firebase config file for Android app
   */
  async getAndroidAppConfig(appName: string): Promise<AppConfig> {
    try {
      console.log(`Downloading config for: ${appName}`);
      
      const authClient = await this.auth.getClient();
      const token = await authClient.getAccessToken();
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      
      const response = await this.api.get(`${appName}/config`, { headers });
      const config = response.data;
      
      return {
        configFilename: 'google-services.json',
        configContents: JSON.stringify(config, null, 2),
      };
    } catch (error: any) {
      throw new Error(`Failed to download Android config: ${error.message}`);
    }
  }

  /**
   * Complete tenant setup: project + 2 Android apps + configs
   */
  async setupTenant(config: TenantConfig): Promise<{
    project: FirebaseProject;
    riderApp: FirebaseApp;
    driverApp: FirebaseApp;
    riderConfig: AppConfig;
    driverConfig: AppConfig;
  }> {
    console.log(`\n🚀 Setting up Firebase for ${config.tenantName} (${config.domain})`);
    
    // 1. Create project
    const project = await this.createProject(config);
    
    // 2. Create Android apps
    const riderApp = await this.createAndroidApp(
      project.projectId,
      config.riderBundleId,
      `${config.tenantName} Rider`
    );
    
    const driverApp = await this.createAndroidApp(
      project.projectId,
      config.driverBundleId,
      `${config.tenantName} Driver`
    );
    
    // 3. Download config files
    const riderConfig = await this.getAndroidAppConfig(riderApp.name);
    const driverConfig = await this.getAndroidAppConfig(driverApp.name);
    
    console.log(`✅ Firebase setup complete for ${config.tenantName}`);
    
    return {
      project,
      riderApp,
      driverApp,
      riderConfig,
      driverConfig,
    };
  }
}

// Export for use in automation scripts
export { FirebaseManagementClient, TenantConfig };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
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
      const client = new FirebaseManagementClient(serviceAccountKey);
      
      for (const tenant of tenants) {
        const result = await client.setupTenant(tenant);
        
        // Save config files
        
        const riderDir = `apps/rider-app-${tenant.domain.replace('.', '')}`;
        const driverDir = `apps/driver-app-${tenant.domain.replace('.', '')}`;
        
        await fs.mkdir(riderDir, { recursive: true });
        await fs.mkdir(driverDir, { recursive: true });
        
        await fs.writeFile(
          path.join(riderDir, 'google-services.json'),
          result.riderConfig.configContents
        );
        
        await fs.writeFile(
          path.join(driverDir, 'google-services.json'),
          result.driverConfig.configContents
        );
        
        console.log(`📁 Config files saved to ${riderDir} and ${driverDir}`);
      }
      
      console.log('\n🎉 All tenant Firebase setups complete!');
    } catch (error: any) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }
  
  main();
}
