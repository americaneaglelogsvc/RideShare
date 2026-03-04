/**
 * GO/NO-GO Evaluator — RideShare Platform
 *
 * Reads k6 results + chaos test outputs and produces a pass/fail verdict.
 * Usage: npx ts-node tests/go-no-go/evaluator.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface K6Metrics {
  metrics: {
    http_req_duration?: { values: { avg: number; 'p(95)': number; 'p(99)': number } };
    http_req_failed?: { values: { rate: number } };
    errors?: { values: { rate: number } };
    iterations?: { values: { count: number } };
  };
}

interface GateResult {
  gate: string;
  pass: boolean;
  detail: string;
}

const THRESHOLDS = {
  p95_latency_ms: 2000,
  p99_latency_ms: 5000,
  error_rate: 0.05,
  min_iterations: 100,
  unit_tests_pass: true,
  e2e_tests_pass: true,
  chaos_recovery_sec: 60,
};

function evaluateK6(resultsPath: string): GateResult[] {
  const gates: GateResult[] = [];

  if (!fs.existsSync(resultsPath)) {
    gates.push({ gate: 'k6-results', pass: false, detail: `File not found: ${resultsPath}` });
    return gates;
  }

  const raw: K6Metrics = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));
  const m = raw.metrics;

  // P95 latency
  const p95 = m.http_req_duration?.values?.['p(95)'] ?? Infinity;
  gates.push({
    gate: 'p95-latency',
    pass: p95 <= THRESHOLDS.p95_latency_ms,
    detail: `p95=${p95.toFixed(0)}ms (threshold: ${THRESHOLDS.p95_latency_ms}ms)`,
  });

  // P99 latency
  const p99 = m.http_req_duration?.values?.['p(99)'] ?? Infinity;
  gates.push({
    gate: 'p99-latency',
    pass: p99 <= THRESHOLDS.p99_latency_ms,
    detail: `p99=${p99.toFixed(0)}ms (threshold: ${THRESHOLDS.p99_latency_ms}ms)`,
  });

  // Error rate
  const errRate = m.http_req_failed?.values?.rate ?? m.errors?.values?.rate ?? 1;
  gates.push({
    gate: 'error-rate',
    pass: errRate <= THRESHOLDS.error_rate,
    detail: `rate=${(errRate * 100).toFixed(2)}% (threshold: ${THRESHOLDS.error_rate * 100}%)`,
  });

  // Iteration count
  const iters = m.iterations?.values?.count ?? 0;
  gates.push({
    gate: 'min-iterations',
    pass: iters >= THRESHOLDS.min_iterations,
    detail: `count=${iters} (threshold: ${THRESHOLDS.min_iterations})`,
  });

  return gates;
}

function evaluateUnitTests(): GateResult {
  // Check if Jest results exist
  const jestPath = path.resolve(process.cwd(), 'services/gateway/coverage/coverage-summary.json');
  if (fs.existsSync(jestPath)) {
    return { gate: 'unit-tests', pass: true, detail: 'Jest coverage report found' };
  }
  return { gate: 'unit-tests', pass: false, detail: 'No Jest coverage report — run: npm test --coverage' };
}

function evaluateChaos(): GateResult[] {
  const gates: GateResult[] = [];
  const chaosResultsPath = path.resolve(process.cwd(), 'tests/chaos/results.json');

  if (!fs.existsSync(chaosResultsPath)) {
    gates.push({ gate: 'chaos-tests', pass: false, detail: 'No chaos results found — run chaos scenarios first' });
    return gates;
  }

  try {
    const results = JSON.parse(fs.readFileSync(chaosResultsPath, 'utf-8'));
    const allPassed = results.scenarios?.every((s: any) => s.passed) ?? false;
    gates.push({
      gate: 'chaos-scenarios',
      pass: allPassed,
      detail: allPassed ? 'All chaos scenarios passed' : 'Some chaos scenarios failed',
    });
  } catch {
    gates.push({ gate: 'chaos-parse', pass: false, detail: 'Failed to parse chaos results' });
  }

  return gates;
}

function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║       GO / NO-GO  EVALUATION  REPORT        ║');
  console.log('║       RideShare Platform — rideoo-487904     ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const k6ResultsPath = path.resolve(process.cwd(), 'tests/k6/results.json');
  const allGates: GateResult[] = [
    ...evaluateK6(k6ResultsPath),
    evaluateUnitTests(),
    ...evaluateChaos(),
  ];

  let allPass = true;
  for (const g of allGates) {
    const icon = g.pass ? '✅' : '❌';
    console.log(`  ${icon}  ${g.gate.padEnd(20)} ${g.detail}`);
    if (!g.pass) allPass = false;
  }

  console.log('\n' + '─'.repeat(50));
  if (allPass) {
    console.log('  🟢  VERDICT: GO — All gates passed');
    console.log('  ✓  Safe to promote to production\n');
    process.exit(0);
  } else {
    const failCount = allGates.filter(g => !g.pass).length;
    console.log(`  🔴  VERDICT: NO-GO — ${failCount} gate(s) failed`);
    console.log('  ✗  Do NOT promote to production\n');
    process.exit(1);
  }
}

main();
