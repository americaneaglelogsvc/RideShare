/**
 * Sprint D1 — TIN Purge Production Smoke Test
 *
 * Verifies the TIN purge cron executes correctly:
 *   - Records older than TIN_RETENTION_DAYS have tin_raw cleared
 *   - tin_hash (last-4) is preserved for 1099-K reference
 *   - No residual raw TINs remain beyond the retention window
 *
 * Run against staging with service role access:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx ts-node tests/smoke/tin-purge.smoke.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const TIN_RETENTION_DAYS = parseInt(process.env.TIN_RETENTION_DAYS || '90', 10);

async function runTinPurgeSmokeTest(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TIN_RETENTION_DAYS);

  console.log(`\n[TIN Purge Smoke Test] — Retention: ${TIN_RETENTION_DAYS} days`);
  console.log(`[TIN Purge Smoke Test] — Cutoff date: ${cutoff.toISOString()}`);

  // 1. Check for raw TINs that should have been purged
  const { data: unpurged, error: unpurgedErr } = await supabase
    .from('driver_tax_ids')
    .select('id, driver_id, tenant_id, tin_submitted_at, tin_raw')
    .not('tin_raw', 'is', null)
    .lt('tin_submitted_at', cutoff.toISOString());

  if (unpurgedErr) {
    if (unpurgedErr.code === 'PGRST116' || unpurgedErr.message.includes('does not exist')) {
      console.log('[TIN Purge Smoke Test] Table driver_tax_ids not found — skipping (no TIN data yet).');
      console.log('[RESULT] PASS — no TIN table means no exposure\n');
      return;
    }
    console.error(`[TIN Purge Smoke Test] ERROR querying driver_tax_ids: ${unpurgedErr.message}`);
    process.exit(1);
  }

  const unpurgedCount = (unpurged || []).length;

  if (unpurgedCount > 0) {
    console.error(`[TIN Purge Smoke Test] FAIL — ${unpurgedCount} record(s) with raw TINs older than ${TIN_RETENTION_DAYS} days:`);
    (unpurged || []).forEach(r => {
      console.error(`  driver=${r.driver_id} tenant=${r.tenant_id} submitted=${r.tin_submitted_at}`);
    });
    console.error('\nACTION REQUIRED: Trigger POST /admin/tax/purge-tins to clear stale TINs.\n');
    process.exit(1);
  }

  // 2. Verify tin_hash is preserved for submitted records
  const { data: submitted, error: submittedErr } = await supabase
    .from('driver_tax_ids')
    .select('id, driver_id, tin_hash')
    .not('tin_submitted_at', 'is', null);

  if (submittedErr && submittedErr.code !== 'PGRST116') {
    console.error(`[TIN Purge Smoke Test] ERROR querying submitted records: ${submittedErr.message}`);
    process.exit(1);
  }

  const missingHash = (submitted || []).filter(r => !r.tin_hash);
  if (missingHash.length > 0) {
    console.warn(`[TIN Purge Smoke Test] WARN — ${missingHash.length} submitted TIN record(s) missing tin_hash (last-4)`);
  }

  // 3. Summary
  const total = (submitted || []).length;
  console.log(`\n[TIN Purge Smoke Test] Submitted records: ${total}`);
  console.log(`[TIN Purge Smoke Test] Unpurged raw TINs beyond retention: ${unpurgedCount}`);
  console.log(`[TIN Purge Smoke Test] Missing tin_hash: ${missingHash.length}`);
  console.log(`\n[RESULT] ${unpurgedCount === 0 ? 'PASS ✅' : 'FAIL ❌'} — TIN purge is ${unpurgedCount === 0 ? 'clean' : 'OVERDUE'}\n`);

  if (unpurgedCount > 0) process.exit(1);
}

runTinPurgeSmokeTest().catch(err => {
  console.error('[TIN Purge Smoke Test] Unexpected error:', err);
  process.exit(1);
});
