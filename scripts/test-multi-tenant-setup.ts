#!/usr/bin/env tsx

/**
 * Multi-Tenant Setup Integration Test
 * Validates the complete Firebase project and app generation workflow
 */

import { FirebaseManagementClient, TenantConfig } from './firebase-management-client';
import { TenantAppGenerator } from './generate-tenant-apps';
import { promises as fs } from 'fs';
import path from 'path';

interface TestResult {
  success: boolean;
  tenant: string;
  tests: {
    firebaseProject: boolean;
    androidApps: boolean;
    configFiles: boolean;
    appGeneration: boolean;
    brandingStructure: boolean;
  };
  errors: string[];
  duration: number;
}

class MultiTenantTester {
  private testResults: TestResult[] = [];
  private outputDir = './test-output';

  async runFullIntegrationTest(): Promise<void> {
    console.log('🧪 Starting Multi-Tenant Integration Test...\n');
    
    const startTime = Date.now();
    
    // Test tenants
    const tenants: TenantConfig[] = [
      {
        tenantId: 'test-goldravenia',
        tenantName: 'Test GoldRavenia',
        domain: 'test-goldravenia.com',
        riderBundleId: 'com.testgoldravenia.rider',
        driverBundleId: 'com.testgoldravenia.driver',
      },
      {
        tenantId: 'test-blackravenia',
        tenantName: 'Test BlackRavenia',
        domain: 'test-blackravenia.com',
        riderBundleId: 'com.testblackravenia.rider',
        driverBundleId: 'com.testblackravenia.driver',
      },
    ];

    // Clean up previous test output
    await this.cleanupTestOutput();
    
    for (const tenant of tenants) {
      const result = await this.testTenantSetup(tenant);
      this.testResults.push(result);
    }

    const duration = Date.now() - startTime;
    await this.generateTestReport(duration);
  }

  private async cleanupTestOutput(): Promise<void> {
    try {
      await fs.rm(this.outputDir, { recursive: true, force: true });
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      // Directory might not exist, that's fine
    }
  }

  private async testTenantSetup(tenant: TenantConfig): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      success: true,
      tenant: tenant.tenantName,
      tests: {
        firebaseProject: false,
        androidApps: false,
        configFiles: false,
        appGeneration: false,
        brandingStructure: false,
      },
      errors: [],
      duration: 0,
    };

    console.log(`🔍 Testing ${tenant.tenantName}...`);

    try {
      // Test 1: Firebase Project Creation
      await this.testFirebaseProjectCreation(tenant, result);
      
      // Test 2: Android App Creation
      await this.testAndroidAppCreation(tenant, result);
      
      // Test 3: Config File Generation
      await this.testConfigFileGeneration(tenant, result);
      
      // Test 4: App Generation
      await this.testAppGeneration(tenant, result);
      
      // Test 5: Branding Structure
      await this.testBrandingStructure(tenant, result);
      
    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    }

    result.duration = Date.now() - startTime;
    
    if (result.success) {
      console.log(`✅ ${tenant.tenantName} - PASSED (${result.duration}ms)`);
    } else {
      console.log(`❌ ${tenant.tenantName} - FAILED`);
      result.errors.forEach(error => console.log(`   - ${error}`));
    }

    return result;
  }

  private async testFirebaseProjectCreation(tenant: TenantConfig, result: TestResult): Promise<void> {
    try {
      const client = new FirebaseManagementClient('./firebase-service-account.json');
      const project = await client.createProject(tenant);
      
      if (project.projectId && project.state === 'ACTIVE') {
        result.tests.firebaseProject = true;
      } else {
        throw new Error('Project not created or not active');
      }
    } catch (error: any) {
      result.errors.push(`Firebase project creation failed: ${error.message}`);
      throw error;
    }
  }

  private async testAndroidAppCreation(tenant: TenantConfig, result: TestResult): Promise<void> {
    try {
      const client = new FirebaseManagementClient('./firebase-service-account.json');
      const projectId = `rideshare-${tenant.domain.replace('.', '-')}`;
      
      const riderApp = await client.createAndroidApp(
        projectId,
        tenant.riderBundleId,
        `${tenant.tenantName} Rider`
      );
      
      const driverApp = await client.createAndroidApp(
        projectId,
        tenant.driverBundleId,
        `${tenant.tenantName} Driver`
      );
      
      if (riderApp.appId && driverApp.appId) {
        result.tests.androidApps = true;
      } else {
        throw new Error('Android apps not created properly');
      }
    } catch (error: any) {
      result.errors.push(`Android app creation failed: ${error.message}`);
      throw error;
    }
  }

  private async testConfigFileGeneration(tenant: TenantConfig, result: TestResult): Promise<void> {
    try {
      const client = new FirebaseManagementClient('./firebase-service-account.json');
      const projectId = `rideshare-${tenant.domain.replace('.', '-')}`;
      
      const riderApp = await client.getAndroidApp(projectId, tenant.riderBundleId);
      const driverApp = await client.getAndroidApp(projectId, tenant.driverBundleId);
      
      const riderConfig = await client.getAndroidAppConfig(riderApp.name);
      const driverConfig = await client.getAndroidAppConfig(driverApp.name);
      
      if (riderConfig.configContents && driverConfig.configContents) {
        // Validate JSON structure
        const riderJson = JSON.parse(riderConfig.configContents);
        const driverJson = JSON.parse(driverConfig.configContents);
        
        if (riderJson.project_info && driverJson.project_info) {
          result.tests.configFiles = true;
        } else {
          throw new Error('Config files missing required fields');
        }
      } else {
        throw new Error('Config files not generated');
      }
    } catch (error: any) {
      result.errors.push(`Config file generation failed: ${error.message}`);
      throw error;
    }
  }

  private async testAppGeneration(tenant: TenantConfig, result: TestResult): Promise<void> {
    try {
      const generator = new TenantAppGenerator();
      const projectId = `rideshare-${tenant.domain.replace('.', '-')}`;
      
      await generator.generateTenantApps({
        tenantConfig: tenant,
        firebaseProjectId: projectId,
        outputDir: this.outputDir,
      });
      
      // Verify generated app directories
      const riderDir = path.join(this.outputDir, `rider-app-${tenant.domain.replace('.', '')}`);
      const driverDir = path.join(this.outputDir, `driver-app-${tenant.domain.replace('.', '')}`);
      
      const riderExists = await fs.access(riderDir).then(() => true).catch(() => false);
      const driverExists = await fs.access(driverDir).then(() => true).catch(() => false);
      
      if (riderExists && driverExists) {
        // Verify app.json files
        const riderAppJson = JSON.parse(await fs.readFile(path.join(riderDir, 'app.json'), 'utf-8'));
        const driverAppJson = JSON.parse(await fs.readFile(path.join(driverDir, 'app.json'), 'utf-8'));
        
        if (riderAppJson.expo.name.includes(tenant.tenantName) && 
            driverAppJson.expo.name.includes(tenant.tenantName)) {
          result.tests.appGeneration = true;
        } else {
          throw new Error('App names not updated correctly');
        }
      } else {
        throw new Error('App directories not created');
      }
    } catch (error: any) {
      result.errors.push(`App generation failed: ${error.message}`);
      throw error;
    }
  }

  private async testBrandingStructure(tenant: TenantConfig, result: TestResult): Promise<void> {
    try {
      const generator = new TenantAppGenerator();
      await generator.createBrandingStructure(tenant, this.outputDir);
      
      const brandingDir = path.join(this.outputDir, 'branding', tenant.domain);
      const brandingExists = await fs.access(brandingDir).then(() => true).catch(() => false);
      
      if (brandingExists) {
        const brandingConfig = JSON.parse(
          await fs.readFile(path.join(brandingDir, 'branding.json'), 'utf-8')
        );
        
        if (brandingConfig.tenant && brandingConfig.colors && brandingConfig.assets) {
          result.tests.brandingStructure = true;
        } else {
          throw new Error('Branding configuration incomplete');
        }
      } else {
        throw new Error('Branding structure not created');
      }
    } catch (error: any) {
      result.errors.push(`Branding structure creation failed: ${error.message}`);
      throw error;
    }
  }

  private async generateTestReport(totalDuration: number): Promise<void> {
    const passedTests = this.testResults.filter(r => r.success).length;
    const totalTests = this.testResults.length;
    
    console.log('\n' + '='.repeat(60));
    console.log('🧪 MULTI-TENANT INTEGRATION TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`📊 Summary: ${passedTests}/${totalTests} tests passed`);
    console.log(`⏱️  Total duration: ${totalDuration}ms`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL TESTS PASSED! Multi-tenant setup is working correctly.');
    } else {
      console.log('\n❌ SOME TESTS FAILED:');
      this.testResults.filter(r => !r.success).forEach(result => {
        console.log(`\n📋 ${result.tenant}:`);
        result.errors.forEach(error => console.log(`   - ${error}`));
      });
    }
    
    console.log('\n📋 Detailed Results:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${result.tenant} (${result.duration}ms)`);
      console.log(`      Firebase Project: ${result.tests.firebaseProject ? '✅' : '❌'}`);
      console.log(`      Android Apps: ${result.tests.androidApps ? '✅' : '❌'}`);
      console.log(`      Config Files: ${result.tests.configFiles ? '✅' : '❌'}`);
      console.log(`      App Generation: ${result.tests.appGeneration ? '✅' : '❌'}`);
      console.log(`      Branding Structure: ${result.tests.brandingStructure ? '✅' : '❌'}`);
    });
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        duration: totalDuration,
      },
      results: this.testResults,
    };
    
    await fs.writeFile(
      path.join(this.outputDir, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log(`\n📄 Detailed report saved to: ${path.join(this.outputDir, 'test-report.json')}`);
    console.log('='.repeat(60));
    
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MultiTenantTester();
  tester.runFullIntegrationTest().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}

export { MultiTenantTester };
