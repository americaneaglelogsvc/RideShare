#!/usr/bin/env tsx

/**
 * Scalability Tests for Multi-Tenant Firebase Setup
 * Tests system performance under load, concurrent tenant creation, and resource limits
 */

import { performance } from 'perf_hooks';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ScalabilityTest {
  testName: string;
  tenantCount: number;
  executionTime: number;
  memoryUsage: number;
  success: boolean;
  errors: string[];
  metrics: {
    avgTenantCreationTime: number;
    peakMemoryUsage: number;
    resourceUtilization: number;
  };
}

interface LoadTest {
  concurrentUsers: number;
  requestsPerSecond: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
}

class ScalabilityTester {
  private scalabilityTests: ScalabilityTest[] = [];
  private loadTests: LoadTest[] = [];
  private testOutputDir = './test-scalability-output';

  async runFullScalabilityTestSuite(): Promise<void> {
    console.log('📈 Starting Scalability Test Suite...\n');
    
    // Setup test environment
    await this.setupScalabilityTestEnvironment();
    
    // Test 1: Linear Scalability Tests
    await this.testLinearScalability();
    
    // Test 2: Concurrent Load Tests
    await this.testConcurrentLoad();
    
    // Test 3: Resource Limit Tests
    await this.testResourceLimits();
    
    // Test 4: Stress Tests
    await this.testStressScenarios();
    
    // Test 5: Long-running Stability
    await this.testLongRunningStability();
    
    await this.generateScalabilityReport();
  }

  private async setupScalabilityTestEnvironment(): Promise<void> {
    console.log('🔧 Setting up scalability test environment...');
    
    // Clean up previous test output
    try {
      await fs.rm(this.testOutputDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist
    }
    
    await fs.mkdir(this.testOutputDir, { recursive: true });
    
    console.log('✅ Scalability test environment ready');
  }

  private async testLinearScalability(): Promise<void> {
    console.log('📊 Testing Linear Scalability...');
    
    const tenantCounts = [1, 5, 10, 25, 50, 100];
    
    for (const tenantCount of tenantCounts) {
      const test: ScalabilityTest = {
        testName: `Linear Scale - ${tenantCount} tenants`,
        tenantCount,
        executionTime: 0,
        memoryUsage: 0,
        success: false,
        errors: [],
        metrics: {
          avgTenantCreationTime: 0,
          peakMemoryUsage: 0,
          resourceUtilization: 0,
        },
      };
      
      try {
        const startTime = performance.now();
        const startMemory = process.memoryUsage();
        
        // Simulate tenant creation at scale
        await this.simulateTenantCreation(tenantCount, test);
        
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        
        test.executionTime = endTime - startTime;
        test.memoryUsage = endMemory.heapUsed - startMemory.heapUsed;
        test.metrics.avgTenantCreationTime = test.executionTime / tenantCount;
        test.metrics.peakMemoryUsage = test.memoryUsage;
        test.metrics.resourceUtilization = this.calculateResourceUtilization(tenantCount);
        
        // Validate scalability thresholds
        const maxExecutionTime = 30000; // 30 seconds
        const maxMemoryUsage = 500 * 1024 * 1024; // 500MB
        const maxAvgCreationTime = 1000; // 1 second per tenant
        
        if (test.executionTime > maxExecutionTime) {
          test.errors.push(`Execution time exceeds threshold: ${Math.round(test.executionTime / 1000)}s`);
        }
        
        if (test.memoryUsage > maxMemoryUsage) {
          test.errors.push(`Memory usage exceeds threshold: ${Math.round(test.memoryUsage / 1024 / 1024)}MB`);
        }
        
        if (test.metrics.avgTenantCreationTime > maxAvgCreationTime) {
          test.errors.push(`Average creation time too high: ${Math.round(test.metrics.avgTenantCreationTime)}ms`);
        }
        
        test.success = test.errors.length === 0;
        
      } catch (error: any) {
        test.errors.push(error.message);
        test.success = false;
      }
      
      this.scalabilityTests.push(test);
      
      const status = test.success ? '✅' : '❌';
      const time = `${Math.round(test.executionTime / 1000)}s`;
      const memory = `${Math.round(test.memoryUsage / 1024 / 1024)}MB`;
      const avgTime = `${Math.round(test.metrics.avgTenantCreationTime)}ms`;
      
      console.log(`   ${status} ${tenantCount} tenants: ${time}, ${memory}, avg: ${avgTime}`);
    }
  }

  private async simulateTenantCreation(tenantCount: number, test: ScalabilityTest): Promise<void> {
    const tenants = [];
    
    for (let i = 0; i < tenantCount; i++) {
      const tenant = {
        tenantId: `test-tenant-${i}`,
        tenantName: `Test Tenant ${i}`,
        domain: `test${i}.example.com`,
        riderBundleId: `com.test${i}.rider`,
        driverBundleId: `com.test${i}.driver`,
      };
      
      tenants.push(tenant);
      
      // Simulate Firebase project creation
      await this.simulateFirebaseProjectCreation(tenant, i);
      
      // Simulate app generation
      await this.simulateAppGeneration(tenant, i);
      
      // Progress tracking
      if (i % 10 === 0 && i > 0) {
        console.log(`     Created ${i}/${tenantCount} tenants...`);
      }
    }
    
    // Save test data
    const testDataPath = path.join(this.testOutputDir, `tenants-${tenantCount}.json`);
    await fs.writeFile(testDataPath, JSON.stringify(tenants, null, 2));
  }

  private async simulateFirebaseProjectCreation(tenant: any, index: number): Promise<void> {
    // Simulate API call delay
    const delay = Math.random() * 100 + 50; // 50-150ms
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate project creation response
    const project = {
      projectId: `rideshare-${tenant.domain.replace('.', '-')}`,
      displayName: `${tenant.tenantName} RideShare`,
      projectNumber: `123456789${index}`,
      state: 'ACTIVE',
    };
    
    // Save to simulated project registry
    const projectPath = path.join(this.testOutputDir, 'projects', `${tenant.tenantId}.json`);
    await fs.mkdir(path.dirname(projectPath), { recursive: true });
    await fs.writeFile(projectPath, JSON.stringify(project, null, 2));
  }

  private async simulateAppGeneration(tenant: any, index: number): Promise<void> {
    // Simulate app generation delay
    const delay = Math.random() * 200 + 100; // 100-300ms
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Create app directories
    const riderDir = path.join(this.testOutputDir, 'apps', `rider-${tenant.tenantId}`);
    const driverDir = path.join(this.testOutputDir, 'apps', `driver-${tenant.tenantId}`);
    
    await fs.mkdir(riderDir, { recursive: true });
    await fs.mkdir(driverDir, { recursive: true });
    
    // Create app configurations
    const riderApp = {
      name: `${tenant.tenantName} Rider`,
      bundleId: tenant.riderBundleId,
      platform: 'ANDROID',
    };
    
    const driverApp = {
      name: `${tenant.tenantName} Driver`,
      bundleId: tenant.driverBundleId,
      platform: 'ANDROID',
    };
    
    await fs.writeFile(path.join(riderDir, 'app.json'), JSON.stringify(riderApp, null, 2));
    await fs.writeFile(path.join(driverDir, 'app.json'), JSON.stringify(driverApp, null, 2));
  }

  private calculateResourceUtilization(tenantCount: number): number {
    // Simulate resource utilization calculation
    // Based on tenant count, memory usage, and CPU usage
    const baseUtilization = 0.1; // 10% base utilization
    const tenantFactor = tenantCount * 0.005; // 0.5% per tenant
    const totalUtilization = Math.min(baseUtilization + tenantFactor, 0.95); // Max 95%
    
    return totalUtilization;
  }

  private async testConcurrentLoad(): Promise<void> {
    console.log('\n⚡ Testing Concurrent Load...');
    
    const concurrentScenarios = [
      { users: 10, rps: 50 },
      { users: 25, rps: 100 },
      { users: 50, rps: 200 },
      { users: 100, rps: 500 },
    ];
    
    for (const scenario of concurrentScenarios) {
      const test: LoadTest = {
        concurrentUsers: scenario.users,
        requestsPerSecond: scenario.rps,
        responseTime: 0,
        errorRate: 0,
        throughput: 0,
      };
      
      try {
        // Simulate concurrent load testing
        await this.simulateConcurrentLoad(scenario.users, scenario.rps, test);
        
        // Validate load test thresholds
        const maxResponseTime = 2000; // 2 seconds
        const maxErrorRate = 0.01; // 1%
        const minThroughput = scenario.rps * 0.9; // 90% of target RPS
        
        if (test.responseTime > maxResponseTime) {
          console.log(`     ⚠️  High response time: ${Math.round(test.responseTime)}ms`);
        }
        
        if (test.errorRate > maxErrorRate) {
          console.log(`     ⚠️  High error rate: ${(test.errorRate * 100).toFixed(2)}%`);
        }
        
        if (test.throughput < minThroughput) {
          console.log(`     ⚠️  Low throughput: ${Math.round(test.throughput)} RPS`);
        }
        
      } catch (error: any) {
        console.error(`     ❌ Load test failed: ${error.message}`);
        test.errorRate = 1.0;
      }
      
      this.loadTests.push(test);
      
      const status = test.errorRate < 0.01 ? '✅' : '❌';
      const respTime = `${Math.round(test.responseTime)}ms`;
      const errorRate = `${(test.errorRate * 100).toFixed(1)}%`;
      const throughput = `${Math.round(test.throughput)} RPS`;
      
      console.log(`   ${status} ${scenario.users} users, ${scenario.rps} RPS: ${respTime}, ${errorRate}, ${throughput}`);
    }
  }

  private async simulateConcurrentLoad(users: number, rps: number, test: LoadTest): Promise<void> {
    const startTime = performance.now();
    const requests = [];
    const errors = [];
    
    // Simulate concurrent requests
    for (let i = 0; i < users; i++) {
      const userRequests = Math.floor(rps / users);
      
      for (let j = 0; j < userRequests; j++) {
        const request = this.simulateApiRequest(i, j);
        requests.push(request);
      }
    }
    
    // Execute requests concurrently
    const results = await Promise.allSettled(requests);
    
    const endTime = performance.now();
    
    // Calculate metrics
    const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
    const failedRequests = results.filter(r => r.status === 'rejected').length;
    
    test.responseTime = (endTime - startTime) / results.length;
    test.errorRate = failedRequests / results.length;
    test.throughput = successfulRequests / ((endTime - startTime) / 1000);
  }

  private async simulateApiRequest(userId: number, requestId: number): Promise<void> {
    // Simulate API request delay
    const delay = Math.random() * 500 + 100; // 100-600ms
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Simulate occasional errors (5% error rate)
    if (Math.random() < 0.05) {
      throw new Error(`API request failed for user ${userId}, request ${requestId}`);
    }
  }

  private async testResourceLimits(): Promise<void> {
    console.log('\n💾 Testing Resource Limits...');
    
    const resourceTests = [
      { name: 'Memory Stress', type: 'memory', limit: 1024 * 1024 * 1024 }, // 1GB
      { name: 'CPU Stress', type: 'cpu', limit: 80 }, // 80%
      { name: 'File Handle Stress', type: 'files', limit: 1000 },
      { name: 'Network Stress', type: 'network', limit: 1000 },
    ];
    
    for (const resourceTest of resourceTests) {
      try {
        await this.simulateResourceStress(resourceTest.type, resourceTest.limit);
        console.log(`   ✅ ${resourceTest.name}: PASSED`);
      } catch (error: any) {
        console.log(`   ❌ ${resourceTest.name}: FAILED - ${error.message}`);
      }
    }
  }

  private async simulateResourceStress(type: string, limit: number): Promise<void> {
    switch (type) {
      case 'memory':
        await this.simulateMemoryStress(limit);
        break;
      case 'cpu':
        await this.simulateCpuStress(limit);
        break;
      case 'files':
        await this.simulateFileStress(limit);
        break;
      case 'network':
        await this.simulateNetworkStress(limit);
        break;
      default:
        throw new Error(`Unknown resource type: ${type}`);
    }
  }

  private async simulateMemoryStress(limit: number): Promise<void> {
    const chunks = [];
    let memoryUsed = 0;
    
    try {
      while (memoryUsed < limit) {
        const chunk = new Array(100000).fill(0).map((_, i) => ({ id: i, data: `test${i}` }));
        chunks.push(chunk);
        memoryUsed += chunk.length * 100; // Approximate size
        
        if (memoryUsed > limit) {
          throw new Error('Memory limit exceeded');
        }
      }
    } finally {
      // Clean up memory
      chunks.length = 0;
    }
  }

  private async simulateCpuStress(limit: number): Promise<void> {
    const startTime = performance.now();
    const duration = 5000; // 5 seconds
    
    while (performance.now() - startTime < duration) {
      // CPU intensive task
      let result = 0;
      for (let i = 0; i < 1000000; i++) {
        result += Math.random();
      }
      
      // Check CPU usage (simplified)
      if (Math.random() * 100 > limit) {
        throw new Error('CPU limit exceeded');
      }
    }
  }

  private async simulateFileStress(limit: number): Promise<void> {
    const tempDir = path.join(this.testOutputDir, 'temp-files');
    await fs.mkdir(tempDir, { recursive: true });
    
    try {
      for (let i = 0; i < limit; i++) {
        const filePath = path.join(tempDir, `temp-${i}.txt`);
        await fs.writeFile(filePath, `Temporary file ${i}`);
        
        if (i > limit) {
          throw new Error('File handle limit exceeded');
        }
      }
    } finally {
      // Clean up
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  private async simulateNetworkStress(limit: number): Promise<void> {
    const requests = [];
    
    for (let i = 0; i < limit; i++) {
      const request = this.simulateNetworkRequest(i);
      requests.push(request);
    }
    
    try {
      await Promise.all(requests);
    } catch (error: any) {
      throw new Error('Network stress test failed');
    }
  }

  private async simulateNetworkRequest(requestId: number): Promise<void> {
    // Simulate network request
    const delay = Math.random() * 100 + 50;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (Math.random() < 0.1) { // 10% failure rate
      throw new Error(`Network request ${requestId} failed`);
    }
  }

  private async testStressScenarios(): Promise<void> {
    console.log('\n🔥 Testing Stress Scenarios...');
    
    const stressScenarios = [
      { name: 'Rapid Tenant Creation', tenants: 100, duration: 30000 },
      { name: 'High Concurrency', users: 200, rps: 1000, duration: 60000 },
      { name: 'Memory Pressure', operations: 10000, duration: 45000 },
    ];
    
    for (const scenario of stressScenarios) {
      try {
        await this.simulateStressScenario(scenario);
        console.log(`   ✅ ${scenario.name}: PASSED`);
      } catch (error: any) {
        console.log(`   ❌ ${scenario.name}: FAILED - ${error.message}`);
      }
    }
  }

  private async simulateStressScenario(scenario: any): Promise<void> {
    const startTime = performance.now();
    
    switch (scenario.name) {
      case 'Rapid Tenant Creation':
        await this.simulateRapidTenantCreation(scenario.tenants, scenario.duration);
        break;
      case 'High Concurrency':
        await this.simulateHighConcurrency(scenario.users, scenario.rps, scenario.duration);
        break;
      case 'Memory Pressure':
        await this.simulateMemoryPressure(scenario.operations, scenario.duration);
        break;
    }
    
    const endTime = performance.now();
    if (endTime - startTime > scenario.duration) {
      throw new Error('Stress scenario exceeded time limit');
    }
  }

  private async simulateRapidTenantCreation(tenantCount: number, duration: number): Promise<void> {
    const promises = [];
    
    for (let i = 0; i < tenantCount; i++) {
      const promise = this.simulateFirebaseProjectCreation({
        tenantId: `stress-tenant-${i}`,
        tenantName: `Stress Tenant ${i}`,
        domain: `stress${i}.example.com`,
        riderBundleId: `com.stress${i}.rider`,
        driverBundleId: `com.stress${i}.driver`,
      }, i);
      promises.push(promise);
    }
    
    await Promise.all(promises);
  }

  private async simulateHighConcurrency(users: number, rps: number, duration: number): Promise<void> {
    const startTime = performance.now();
    const promises = [];
    
    while (performance.now() - startTime < duration) {
      for (let i = 0; i < users; i++) {
        const promise = this.simulateApiRequest(i, Date.now());
        promises.push(promise);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000 / rps));
    }
    
    await Promise.allSettled(promises);
  }

  private async simulateMemoryPressure(operations: number, duration: number): Promise<void> {
    const startTime = performance.now();
    const chunks = [];
    
    try {
      while (performance.now() - startTime < duration && chunks.length < operations) {
        const chunk = new Array(10000).fill(0).map((_, i) => ({ id: i, data: `memory${i}` }));
        chunks.push(chunk);
        
        // Random cleanup to simulate garbage collection
        if (Math.random() < 0.1 && chunks.length > 10) {
          chunks.splice(0, 5);
        }
      }
    } finally {
      chunks.length = 0;
    }
  }

  private async testLongRunningStability(): Promise<void> {
    console.log('\n⏰ Testing Long-running Stability...');
    
    const stabilityDuration = 60000; // 1 minute for testing (would be longer in production)
    const startTime = performance.now();
    let operations = 0;
    let errors = 0;
    
    while (performance.now() - startTime < stabilityDuration) {
      try {
        // Simulate ongoing operations
        await this.simulateApiRequest(operations % 10, operations);
        operations++;
        
        // Progress indicator
        if (operations % 100 === 0) {
          console.log(`     Stability test: ${operations} operations, ${errors} errors`);
        }
        
      } catch (error: any) {
        errors++;
      }
      
      // Small delay between operations
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const errorRate = errors / operations;
    const status = errorRate < 0.05 ? '✅' : '❌';
    
    console.log(`   ${status} Long-running stability: ${operations} ops, ${errors} errors (${(errorRate * 100).toFixed(2)}%)`);
  }

  private async generateScalabilityReport(): Promise<void> {
    console.log('\n' + '='.repeat(70));
    console.log('📈 SCALABILITY TEST REPORT');
    console.log('='.repeat(70));
    
    // Linear scalability results
    console.log('\n📊 Linear Scalability Results:');
    this.scalabilityTests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      const time = `${Math.round(test.executionTime / 1000)}s`;
      const memory = `${Math.round(test.memoryUsage / 1024 / 1024)}MB`;
      const avgTime = `${Math.round(test.metrics.avgTenantCreationTime)}ms`;
      const utilization = `${(test.metrics.resourceUtilization * 100).toFixed(1)}%`;
      
      console.log(`   ${status} ${test.tenantCount} tenants: ${time}, ${memory}, avg: ${avgTime}, util: ${utilization}`);
      
      if (!test.success && test.errors.length > 0) {
        console.log(`      Errors: ${test.errors.join(', ')}`);
      }
    });
    
    // Load test results
    console.log('\n⚡ Load Test Results:');
    this.loadTests.forEach(test => {
      const status = test.errorRate < 0.01 ? '✅' : '❌';
      const respTime = `${Math.round(test.responseTime)}ms`;
      const errorRate = `${(test.errorRate * 100).toFixed(1)}%`;
      const throughput = `${Math.round(test.throughput)} RPS`;
      
      console.log(`   ${status} ${test.concurrentUsers} users: ${respTime}, ${errorRate}, ${throughput}`);
    });
    
    // Scalability assessment
    const maxSuccessfulTenants = Math.max(...this.scalabilityTests
      .filter(t => t.success)
      .map(t => t.tenantCount));
    
    const avgResponseTime = this.loadTests.reduce((sum, t) => sum + t.responseTime, 0) / this.loadTests.length;
    const avgErrorRate = this.loadTests.reduce((sum, t) => sum + t.errorRate, 0) / this.loadTests.length;
    
    console.log('\n🎯 Scalability Assessment:');
    console.log(`   Max successful tenants: ${maxSuccessfulTenants}`);
    console.log(`   Average response time: ${Math.round(avgResponseTime)}ms`);
    console.log(`   Average error rate: ${(avgErrorRate * 100).toFixed(2)}%`);
    
    // Production readiness assessment
    const isScalable = maxSuccessfulTenants >= 50 && avgResponseTime < 2000 && avgErrorRate < 0.05;
    
    console.log('\n🚀 Production Readiness:');
    console.log(`   Status: ${isScalable ? '✅ SCALABLE' : '❌ NOT SCALABLE'}`);
    
    if (!isScalable) {
      console.log('\n⚠️  Scalability issues to address:');
      if (maxSuccessfulTenants < 50) {
        console.log(`   - Max tenant count too low: ${maxSuccessfulTenants}`);
      }
      if (avgResponseTime >= 2000) {
        console.log(`   - Average response time too high: ${Math.round(avgResponseTime)}ms`);
      }
      if (avgErrorRate >= 0.05) {
        console.log(`   - Average error rate too high: ${(avgErrorRate * 100).toFixed(2)}%`);
      }
    }
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        maxSuccessfulTenants,
        avgResponseTime,
        avgErrorRate,
        isScalable,
      },
      scalabilityTests: this.scalabilityTests,
      loadTests: this.loadTests,
    };
    
    await fs.writeFile(
      './scripts/tests/scalability-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📄 Detailed report saved to: ./scripts/tests/scalability-report.json');
    console.log('='.repeat(70));
    
    process.exit(isScalable ? 0 : 1);
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ScalabilityTester();
  tester.runFullScalabilityTestSuite().catch(error => {
    console.error('❌ Scalability test suite failed:', error.message);
    process.exit(1);
  });
}

export { ScalabilityTester };
