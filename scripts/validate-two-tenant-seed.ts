#!/usr/bin/env tsx

/**
 * Validation script for two-tenant seeding
 * Validates that goldravenia.com and blackravenia.com have proper seed data
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(supabaseUrl, supabaseKey);

interface ValidationResult {
  success: boolean;
  errors: string[];
  summary: {
    tenants: number;
    drivers: number;
    riders: number;
    admins: number;
  };
}

async function validateTwoTenantSeed(): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: true,
    errors: [],
    summary: { tenants: 0, drivers: 0, riders: 0, admins: 0 }
  };

  try {
    console.log('🔍 Validating two-tenant seed data...\n');

    // 1. Validate tenants
    console.log('📋 Checking tenants...');
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, domain, status')
      .in('domain', ['goldravenia.com', 'blackravenia.com']);

    if (tenantError) {
      result.errors.push(`Tenant query failed: ${tenantError.message}`);
      result.success = false;
      return result;
    }

    if (!tenants || tenants.length !== 2) {
      result.errors.push(`Expected 2 tenants, found ${tenants?.length || 0}`);
      result.success = false;
    } else {
      console.log('✅ Tenants found:');
      tenants.forEach(t => {
        console.log(`   - ${t.name} (${t.domain}) - ${t.status}`);
      });
      result.summary.tenants = tenants.length;
    }

    // 2. Validate drivers for each tenant
    console.log('\n🚗 Checking drivers...');
    for (const tenant of tenants || []) {
      const { data: drivers, error: driverError } = await supabase
        .from('driver_profiles')
        .select('id, first_name, last_name, status')
        .eq('tenant_id', tenant.id);

      if (driverError) {
        result.errors.push(`Driver query failed for ${tenant.name}: ${driverError.message}`);
        result.success = false;
      } else {
        console.log(`✅ ${tenant.name}: ${drivers?.length || 0} drivers`);
        result.summary.drivers += drivers?.length || 0;

        // Check for specific deterministic actors
        const goldDrivers = drivers?.filter(d => 
          tenant.domain === 'goldravenia.com' && 
          ['James', 'Maria'].includes(d.first_name)
        );
        const blackDrivers = drivers?.filter(d => 
          tenant.domain === 'blackravenia.com' && 
          ['Tom', 'Lisa'].includes(d.first_name)
        );

        if (tenant.domain === 'goldravenia.com' && goldDrivers?.length === 2) {
          console.log(`   ✅ Deterministic drivers found: ${goldDrivers.map(d => d.first_name).join(', ')}`);
        }
        if (tenant.domain === 'blackravenia.com' && blackDrivers?.length === 2) {
          console.log(`   ✅ Deterministic drivers found: ${blackDrivers.map(d => d.first_name).join(', ')}`);
        }
      }
    }

    // 3. Validate riders for each tenant
    console.log('\n👤 Checking riders...');
    for (const tenant of tenants || []) {
      const { data: riders, error: riderError } = await supabase
        .from('rider_profiles')
        .select('id, first_name, last_name, is_active')
        .eq('tenant_id', tenant.id);

      if (riderError) {
        result.errors.push(`Rider query failed for ${tenant.name}: ${riderError.message}`);
        result.success = false;
      } else {
        console.log(`✅ ${tenant.name}: ${riders?.length || 0} riders`);
        result.summary.riders += riders?.length || 0;

        // Check for specific deterministic actors
        const goldRiders = riders?.filter(r => 
          tenant.domain === 'goldravenia.com' && 
          ['Alice', 'Bob', 'Carol', 'David'].includes(r.first_name)
        );
        const blackRiders = riders?.filter(r => 
          tenant.domain === 'blackravenia.com' && 
          ['Eve', 'Frank', 'Grace', 'Henry'].includes(r.first_name)
        );

        if (tenant.domain === 'goldravenia.com' && goldRiders?.length >= 4) {
          console.log(`   ✅ Deterministic riders found: ${goldRiders.slice(0, 4).map(r => r.first_name).join(', ')}`);
        }
        if (tenant.domain === 'blackravenia.com' && blackRiders?.length >= 4) {
          console.log(`   ✅ Deterministic riders found: ${blackRiders.slice(0, 4).map(r => r.first_name).join(', ')}`);
        }
      }
    }

    // 4. Validate tenant admins
    console.log('\n👔 Checking tenant admins...');
    for (const tenant of tenants || []) {
      const { data: admins, error: adminError } = await supabase
        .from('tenant_admin_users')
        .select('id, email, role')
        .eq('tenant_id', tenant.id);

      if (adminError) {
        result.errors.push(`Admin query failed for ${tenant.name}: ${adminError.message}`);
        result.success = false;
      } else {
        console.log(`✅ ${tenant.name}: ${admins?.length || 0} admins`);
        result.summary.admins += admins?.length || 0;
      }
    }

    // 5. Validate pricing policies
    console.log('\n💰 Checking pricing policies...');
    for (const tenant of tenants || []) {
      const { data: policies, error: policyError } = await supabase
        .from('tenant_pricing_policies')
        .select('category, base_fare_cents, per_mile_cents, per_minute_cents')
        .eq('tenant_id', tenant.id);

      if (policyError) {
        result.errors.push(`Policy query failed for ${tenant.name}: ${policyError.message}`);
        result.success = false;
      } else {
        console.log(`✅ ${tenant.name}: ${policies?.length || 0} pricing policies`);
      }
    }

  } catch (error) {
    result.errors.push(`Unexpected error: ${error}`);
    result.success = false;
  }

  return result;
}

// Main execution
async function main() {
  const result = await validateTwoTenantSeed();

  console.log('\n' + '='.repeat(60));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(60));

  if (result.success) {
    console.log('🎉 Two-tenant seed validation PASSED!');
    console.log(`📈 Summary: ${result.summary.tenants} tenants, ${result.summary.drivers} drivers, ${result.summary.riders} riders, ${result.summary.admins} admins`);
  } else {
    console.log('❌ Two-tenant seed validation FAILED!');
    console.log('🚨 Errors:');
    result.errors.forEach(error => console.log(`   - ${error}`));
  }

  console.log('='.repeat(60));

  process.exit(result.success ? 0 : 1);
}

if (require.main === module) {
  main();
}

export { validateTwoTenantSeed };
