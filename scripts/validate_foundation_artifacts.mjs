import fs from 'node:fs';

let ok = true;

function mustExist(paths) {
  for (const p of paths) {
    if (!fs.existsSync(p)) {
      console.error('MISSING:', p);
      ok = false;
    }
  }
}

// Core FOUNDATION markdown + JSON
mustExist([
  'Requirements/tenancy_isolation.md',
  'Requirements/rbac_roles.json',
  'Requirements/rbac_matrix.md',
  'Requirements/auth_model.md',
  'Requirements/pii_minimization.md',
  'Requirements/messaging_masking_and_retention.md',
  'Requirements/audit_events.md'
]);

// Schemas and example configs
mustExist([
  'Requirements/schemas/platform_config.schema.json',
  'Requirements/schemas/tenant_config.schema.json',
  'Requirements/schemas/tenant_policy_config.schema.json',
  'config/platform_config.example.json',
  'config/tenant_config.example.json'
]);

// JSON artifacts that must parse
const jsonFiles = [
  'Requirements/rbac_roles.json',
  'Requirements/pii_catalog.json',
  'Requirements/messaging_retention_policy.json',
  'Requirements/audit_events.json',
  'Requirements/schemas/platform_config.schema.json',
  'Requirements/schemas/tenant_config.schema.json',
  'Requirements/schemas/tenant_policy_config.schema.json',
  'config/platform_config.example.json',
  'config/tenant_config.example.json'
];

for (const p of jsonFiles) {
  if (!fs.existsSync(p)) continue; // already counted missing above
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      console.error('Invalid JSON structure in', p);
      ok = false;
    }
  } catch (e) {
    console.error('JSON parse error in', p, e?.message || e);
    ok = false;
  }
}

// rbac_roles must have a roles array of reasonable size
try {
  const j = JSON.parse(fs.readFileSync('Requirements/rbac_roles.json', 'utf8'));
  if (!Array.isArray(j.roles) || j.roles.length < 4) {
    console.error('rbac_roles.json: roles[] missing/too small');
    ok = false;
  }
} catch (e) {
  console.error('rbac_roles.json invalid:', e?.message || e);
  ok = false;
}

// req_id lines must exist in key markdown artifacts
const mdReqIdChecks = [
  { path: 'Requirements/tenancy_isolation.md', token: 'req_id: TEN-BASE-0001' },
  { path: 'Requirements/auth_model.md', token: 'req_id: TEN-BASE-0002' },
  { path: 'Requirements/rbac_matrix.md', token: 'req_id: TEN-BASE-0002' },
  { path: 'Requirements/pii_minimization.md', token: 'req_id: PII-BASE-0001' },
  { path: 'Requirements/messaging_masking_and_retention.md', token: 'req_id: MSG-RET-0001' },
  { path: 'Requirements/audit_events.md', token: 'req_id: AUD-EVT-0001' }
];

for (const check of mdReqIdChecks) {
  if (!fs.existsSync(check.path)) continue;
  const text = fs.readFileSync(check.path, 'utf8');
  if (!text.includes(check.token)) {
    console.error('Missing canonical req_id token in', check.path, 'expected:', check.token);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log('OK: test:foundation');