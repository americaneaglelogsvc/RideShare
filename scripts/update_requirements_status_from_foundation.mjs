#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

// Simple helper to read JSON lines
function readJsonl(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

function writeJsonl(filePath, rows) {
  const out = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(filePath, out, 'utf8');
}

function ensureArray(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

// Canonical foundation req_ids we care about
const FOUNDATION_REQS = {
  'CFG-PLAT-0001': {
    title: 'platform_config (platform-scoped; Super Admin only)',
    milestone: 'Core/Other'
  },
  'CFG-TEN-0001': {
    title: 'tenant_config (tenant-scoped; tenant admin within platform caps)',
    milestone: 'Core/Other'
  },
  'CFG-JSON-0001': {
    title: 'JSON schema validation for platform/tenant/policy configs',
    milestone: 'Core/Other'
  },
  'CFG-JSON-0002': {
    title: 'Minimum keys for platform_config and tenant_config',
    milestone: 'Core/Other'
  },
  'TEN-BASE-0001': {
    title: 'Tenant provisioning + isolation',
    milestone: 'Core/Other'
  },
  'TEN-BASE-0002': {
    title: 'Tenant RBAC + roles',
    milestone: 'Core/Other'
  },
  'PII-BASE-0001': {
    title: 'PII minimization baseline',
    milestone: 'Core/Other'
  },
  'MSG-RET-0001': {
    title: 'Masked communications and messaging retention',
    milestone: 'Core/Other'
  },
  'AUD-EVT-0001': {
    title: 'Audit event taxonomy (money + state changes)',
    milestone: 'Core/Other'
  }
};

// Map of evidence artifacts per canonical id (aligned with foundation_requirements_map.json)
const ARTIFACT_MAP = {
  'CFG-PLAT-0001': [
    'Requirements/schemas/platform_config.schema.json',
    'config/platform_config.example.json'
  ],
  'CFG-TEN-0001': [
    'Requirements/schemas/tenant_config.schema.json',
    'config/tenant_config.example.json'
  ],
  'CFG-JSON-0001': [
    'Requirements/schemas/platform_config.schema.json',
    'Requirements/schemas/tenant_config.schema.json',
    'Requirements/schemas/tenant_policy_config.schema.json'
  ],
  'CFG-JSON-0002': [
    'Requirements/schemas/platform_config.schema.json',
    'Requirements/schemas/tenant_config.schema.json',
    'Requirements/schemas/tenant_policy_config.schema.json',
    'config/platform_config.example.json',
    'config/tenant_config.example.json'
  ],
  'TEN-BASE-0001': [
    'Requirements/tenancy_isolation.md',
    'Requirements/rbac_roles.json'
  ],
  'TEN-BASE-0002': [
    'Requirements/auth_model.md',
    'Requirements/rbac_matrix.md',
    'Requirements/rbac_roles.json'
  ],
  'PII-BASE-0001': [
    'Requirements/pii_minimization.md',
    'Requirements/pii_catalog.json'
  ],
  'MSG-RET-0001': [
    'Requirements/messaging_masking_and_retention.md',
    'Requirements/messaging_retention_policy.json'
  ],
  'AUD-EVT-0001': [
    'Requirements/audit_events.md',
    'Requirements/audit_events.json'
  ]
};

function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  const idx = args.findIndex((a) => a === '--jsonl');
  const jsonlPath = idx !== -1 && args[idx + 1] ? args[idx + 1] : 'AgentOutput/requirements_status.jsonl';

  if (!fs.existsSync(jsonlPath)) {
    console.log(`[update_requirements_status_from_foundation] No JSONL found at ${jsonlPath}, nothing to do.`);
    process.exit(0);
  }

  const rows = readJsonl(jsonlPath);
  const byId = new Map();
  for (const r of rows) {
    const rid = (r.requirement_id || '').trim();
    if (!rid) continue;
    if (!byId.has(rid)) byId.set(rid, r);
  }

  let touched = 0;

  for (const [rid, meta] of Object.entries(FOUNDATION_REQS)) {
    let row = byId.get(rid);
    if (!row) {
      row = {
        requirement_id: rid,
        title: meta.title,
        milestone: meta.milestone || 'Core/Other',
        status: 'Not Started',
        evidence: [],
        gaps: ['missing:any'],
        notes: ''
      };
      rows.push(row);
      byId.set(rid, row);
    }

    const artifacts = ARTIFACT_MAP[rid] || [];
    if (!artifacts.length) continue;

    const ev = new Set(ensureArray(row.evidence));
    let addedAny = false;
    for (const relPath of artifacts) {
      const evLine = `file:${relPath}`;
      if (!ev.has(evLine)) {
        ev.add(evLine);
        addedAny = true;
      }
    }

    if (addedAny) {
      row.evidence = Array.from(ev);
      const currentStatus = row.status || 'Not Started';
      if (currentStatus === 'Not Started') {
        row.status = 'In Progress';
      }
      const gaps = new Set(ensureArray(row.gaps));
      if (row.evidence.length > 0 && gaps.has('missing:any')) {
        gaps.delete('missing:any');
      }
      row.gaps = Array.from(gaps);
      touched += 1;
    }
  }

  if (isDryRun) {
    console.log(`[update_requirements_status_from_foundation] DRY-RUN: would touch ${touched} canonical foundation rows in ${jsonlPath}.`);
    process.exit(0);
  }

  if (touched > 0) {
    writeJsonl(jsonlPath, rows);
    console.log(`[update_requirements_status_from_foundation] Updated ${touched} canonical foundation rows in ${jsonlPath}.`);
  } else {
    console.log('[update_requirements_status_from_foundation] No changes needed.');
  }
}

main();
