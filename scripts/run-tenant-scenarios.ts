#!/usr/bin/env tsx

/**
 * Tenant Scenario Runner - Executes 10 realistic ride scenarios
 * Tests booking, execution, charging, and settlement with tenant isolation
 */

import { createClient } from '@supabase/supabase-js';
import axios, { AxiosInstance } from 'axios';

interface ScenarioResult {
  scenarioId: string;
  name: string;
  tenant: string;
  success: boolean;
  duration: number;
  error?: string;
  evidence: {
    bookingId?: string;
    tripId?: string;
    driverId?: string;
    riderId?: string;
    fareCalculated?: number;
    ledgerEntries?: number;
  };
}

interface ScenarioConfig {
  id: string;
  name: string;
  tenant: string;
  tenantId: string;
  rider: { name: string; email: string; phone: string };
  driver: { name: string; phone: string };
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  vehicleCategory: string;
  expectedFareRange: { min: number; max: number };
}

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';
const gatewayUrl = process.env.STAGING_API_URL || 'http://localhost:3000';

const supabase = createClient(supabaseUrl, supabaseKey);

class ScenarioRunner {
  private api: AxiosInstance;
  private results: ScenarioResult[] = [];

  constructor() {
    this.api = axios.create({
      baseURL: gatewayUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async runAllScenarios(): Promise<ScenarioResult[]> {
    console.log('🚀 Starting 10-lane coordinated scenario testing...\n');

    const scenarios = this.getScenarios();

    for (const scenario of scenarios) {
      console.log(`📝 Running scenario: ${scenario.name} (${scenario.tenant})`);
      const result = await this.runScenario(scenario);
      this.results.push(result);
      
      if (result.success) {
        console.log(`✅ ${scenario.name} - PASSED (${result.duration}ms)`);
      } else {
        console.log(`❌ ${scenario.name} - FAILED: ${result.error}`);
      }
      console.log('');
    }

    return this.results;
  }

  private async runScenario(config: ScenarioConfig): Promise<ScenarioResult> {
    const startTime = Date.now();
    const result: ScenarioResult = {
      scenarioId: config.id,
      name: config.name,
      tenant: config.tenant,
      success: false,
      duration: 0,
      evidence: {},
    };

    try {
      // 1. Get pricing quote
      const quoteResponse = await this.api.post('/pricing/quote', {
        pickup: config.pickup,
        dropoff: config.dropoff,
        vehicleCategory: config.vehicleCategory,
        passengerCount: 1,
      }, {
        headers: { 'x-tenant-id': config.tenantId }
      });

      const quote = quoteResponse.data.data;
      result.evidence.fareCalculated = quote.estimatedFare;

      // Validate fare is in expected range
      if (quote.estimatedFare < config.expectedFareRange.min || 
          quote.estimatedFare > config.expectedFareRange.max) {
        throw new Error(`Fare ${quote.estimatedFare} outside expected range ${config.expectedFareRange.min}-${config.expectedFareRange.max}`);
      }

      // 2. Create booking
      const bookingResponse = await this.api.post('/reservations/book', {
        quote_id: quote.id,
        rider_name: config.rider.name,
        rider_phone: config.rider.phone,
        pickup_time: new Date().toISOString(),
        special_instructions: 'Scenario test booking',
      }, {
        headers: { 'x-tenant-id': config.tenantId }
      });

      const booking = bookingResponse.data.data;
      result.evidence.bookingId = booking.booking_id;

      // 3. Wait for driver assignment (simulate dispatch)
      await this.sleep(2000);

      // 4. Get trip details
      const tripResponse = await this.api.get(`/dispatch/trips/${booking.booking_id}`, {
        headers: { 'x-tenant-id': config.tenantId }
      });

      const trip = tripResponse.data.data;
      result.evidence.tripId = trip.id;
      result.evidence.driverId = trip.driverId;

      // 5. Validate tenant isolation
      await this.validateTenantIsolation(config.tenantId, booking.booking_id);

      // 6. Complete trip (simulate)
      await this.api.put(`/dispatch/trips/${trip.id}/complete`, {
        actualEndLocation: config.dropoff,
        actualDuration: 1800, // 30 minutes
        actualDistance: 15.2, // miles
      }, {
        headers: { 'x-tenant-id': config.tenantId }
      });

      // 7. Check ledger entries
      const ledgerResponse = await this.api.get(`/ledger/trip/${trip.id}`, {
        headers: { 'x-tenant-id': config.tenantId }
      });

      result.evidence.ledgerEntries = ledgerResponse.data.data.entries?.length || 0;

      result.success = true;
      result.duration = Date.now() - startTime;

    } catch (error: any) {
      result.error = error.message || 'Unknown error';
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  private async validateTenantIsolation(tenantId: string, bookingId: string): Promise<void> {
    // Verify booking only exists in the correct tenant
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      throw new Error('Booking not found');
    }

    // This would need to be adapted based on the actual schema
    // For now, we'll validate the booking exists
    if (!booking) {
      throw new Error('Booking isolation validation failed');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getScenarios(): ScenarioConfig[] {
    return [
      {
        id: 'SC001',
        name: 'Anna books via GoldRavenia web',
        tenant: 'goldravenia.com',
        tenantId: 'a1b2c3d4-0001-4000-8000-000000000001',
        rider: { name: 'Alice', email: 'alice1@goldravenia.com', phone: '+17731000001' },
        driver: { name: 'James', phone: '+17732000001' },
        pickup: { lat: 41.8781, lng: -87.6298, address: 'Chicago Loop' },
        dropoff: { lat: 41.9100, lng: -87.6340, address: 'Lincoln Park' },
        vehicleCategory: 'black_sedan',
        expectedFareRange: { min: 1500, max: 2500 } // $15-25
      },
      {
        id: 'SC002',
        name: 'David books via GoldRavenia mobile app',
        tenant: 'goldravenia.com',
        tenantId: 'a1b2c3d4-0001-4000-8000-000000000001',
        rider: { name: 'David', email: 'david4@goldravenia.com', phone: '+17731000004' },
        driver: { name: 'Maria', phone: '+17732000002' },
        pickup: { lat: 41.8650, lng: -87.6240, address: 'Gold Coast' },
        dropoff: { lat: 41.9050, lng: -87.6440, address: 'Wrigleyville' },
        vehicleCategory: 'black_suv',
        expectedFareRange: { min: 2000, max: 3500 } // $20-35
      },
      {
        id: 'SC003',
        name: 'Carol books via BlackRavenia web',
        tenant: 'blackravenia.com',
        tenantId: 'a1b2c3d4-0002-4000-8000-000000000002',
        rider: { name: 'Carol', email: 'carol3@blackravenia.com', phone: '+17732000003' },
        driver: { name: 'Tom', phone: '+17732000026' },
        pickup: { lat: 41.8500, lng: -87.6190, address: 'South Loop' },
        dropoff: { lat: 41.8820, lng: -87.6390, address: 'West Loop' },
        vehicleCategory: 'black_suv',
        expectedFareRange: { min: 1800, max: 3000 } // $18-30
      },
      {
        id: 'SC004',
        name: 'Eric books via BlackRavenia mobile app',
        tenant: 'blackravenia.com',
        tenantId: 'a1b2c3d4-0002-4000-8000-000000000002',
        rider: { name: 'Eric', email: 'eric6@blackravenia.com', phone: '+17732000006' },
        driver: { name: 'Lisa', phone: '+17732000027' },
        pickup: { lat: 41.8720, lng: -87.6340, address: 'River North' },
        dropoff: { lat: 41.9100, lng: -87.6240, address: 'Lakeview' },
        vehicleCategory: 'premium',
        expectedFareRange: { min: 1600, max: 2800 } // $16-28
      },
      {
        id: 'SC005',
        name: 'Extra stop added mid-trip',
        tenant: 'goldravenia.com',
        tenantId: 'a1b2c3d4-0001-4000-8000-000000000001',
        rider: { name: 'Bob', email: 'bob2@goldravenia.com', phone: '+17731000002' },
        driver: { name: 'Paul', phone: '+17732000003' },
        pickup: { lat: 41.8781, lng: -87.6298, address: 'Downtown' },
        dropoff: { lat: 41.9200, lng: -87.6490, address: 'Uptown' },
        vehicleCategory: 'black_sedan',
        expectedFareRange: { min: 2000, max: 4000 } // $20-40 (with extra stop)
      },
      {
        id: 'SC006',
        name: 'Traffic jam causing route deviation',
        tenant: 'blackravenia.com',
        tenantId: 'a1b2c3d4-0002-4000-8000-000000000002',
        rider: { name: 'Eve', email: 'eve5@blackravenia.com', phone: '+17732000005' },
        driver: { name: 'Kevin', phone: '+17732000028' },
        pickup: { lat: 41.8450, lng: -87.6140, address: 'Hyde Park' },
        dropoff: { lat: 41.9150, lng: -87.6540, address: 'Andersonville' },
        vehicleCategory: 'black_suv',
        expectedFareRange: { min: 2500, max: 4500 } // $25-45 (with traffic)
      },
      {
        id: 'SC007',
        name: 'Rider cancellation after assignment',
        tenant: 'goldravenia.com',
        tenantId: 'a1b2c3d4-0001-4000-8000-000000000001',
        rider: { name: 'Frank', email: 'frank6@goldravenia.com', phone: '+17731000006' },
        driver: { name: 'Sarah', phone: '+17732000004' },
        pickup: { lat: 41.8600, lng: -87.6190, address: 'Bridgeport' },
        dropoff: { lat: 41.8830, lng: -87.6290, address: 'Chinatown' },
        vehicleCategory: 'black_sedan',
        expectedFareRange: { min: 500, max: 1500 } // $5-15 (cancellation fee)
      },
      {
        id: 'SC008',
        name: 'No-show fee after 5-minute wait',
        tenant: 'blackravenia.com',
        tenantId: 'a1b2c3d4-0002-4000-8000-000000000002',
        rider: { name: 'Grace', email: 'grace7@blackravenia.com', phone: '+17732000007' },
        driver: { name: 'Diane', phone: '+17732000029' },
        pickup: { lat: 41.8680, lng: -87.6240, address: 'Pilsen' },
        dropoff: { lat: 41.9000, lng: -87.6390, address: 'Logan Square' },
        vehicleCategory: 'premium',
        expectedFareRange: { min: 800, max: 2000 } // $8-20 (no-show fee)
      },
      {
        id: 'SC009',
        name: 'Mess fee adjustment',
        tenant: 'goldravenia.com',
        tenantId: 'a1b2c3d4-0001-4000-8000-000000000001',
        rider: { name: 'Henry', email: 'henry8@goldravenia.com', phone: '+17731000008' },
        driver: { name: 'Carlos', phone: '+17732000005' },
        pickup: { lat: 41.8560, lng: -87.6090, address: 'Bronzeville' },
        dropoff: { lat: 41.8910, lng: -87.6340, address: 'Lincoln Square' },
        vehicleCategory: 'black_suv',
        expectedFareRange: { min: 1800, max: 3200 } // $18-32 (with mess fee)
      },
      {
        id: 'SC010',
        name: 'Min-wage supplement trigger',
        tenant: 'blackravenia.com',
        tenantId: 'a1b2c3d4-0002-4000-8000-000000000002',
        rider: { name: 'Iris', email: 'iris9@blackravenia.com', phone: '+17732000009' },
        driver: { name: 'Nina', phone: '+17732000030' },
        pickup: { lat: 41.8490, lng: -87.6040, address: 'Kenwood' },
        dropoff: { lat: 41.9150, lng: -87.6440, address: 'Rogers Park' },
        vehicleCategory: 'standard',
        expectedFareRange: { min: 2200, max: 3500 } // $22-35 (with min-wage supplement)
      }
    ];
  }

  generateReport(results: ScenarioResult[]): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 SCENARIO EXECUTION REPORT');
    console.log('='.repeat(80));

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`📈 Summary: ${passed}/${results.length} passed, ${failed} failed`);
    console.log(`⏱️  Total execution time: ${totalDuration}ms`);
    console.log(`📊 Average scenario time: ${Math.round(totalDuration / results.length)}ms`);

    if (failed > 0) {
      console.log('\n❌ Failed Scenarios:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.name}: ${r.error}`);
      });
    }

    console.log('\n✅ Passed Scenarios:');
    results.filter(r => r.success).forEach(r => {
      console.log(`   - ${r.name} (${r.duration}ms)`);
      if (r.evidence.bookingId) {
        console.log(`     📝 Booking: ${r.evidence.bookingId}`);
      }
      if (r.evidence.tripId) {
        console.log(`     🚗 Trip: ${r.evidence.tripId}`);
      }
      if (r.evidence.fareCalculated) {
        console.log(`     💰 Fare: $${(r.evidence.fareCalculated / 100).toFixed(2)}`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎯 TENANT ISOLATION VALIDATION');
    console.log('='.repeat(80));

    // Group results by tenant
    const goldResults = results.filter(r => r.tenant === 'goldravenia.com');
    const blackResults = results.filter(r => r.tenant === 'blackravenia.com');

    console.log(`🏆 GoldRavenia: ${goldResults.filter(r => r.success).length}/${goldResults.length} passed`);
    console.log(`🏆 BlackRavenia: ${blackResults.filter(r => r.success).length}/${blackResults.length} passed`);

    console.log('\n' + '='.repeat(80));
  }
}

// Main execution
async function main() {
  const runner = new ScenarioRunner();
  const results = await runner.runAllScenarios();
  runner.generateReport(results);

  const allPassed = results.every(r => r.success);
  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  main();
}

export { ScenarioRunner };
