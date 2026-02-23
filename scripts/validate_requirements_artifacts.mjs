import fs from 'node:fs';

const mustExist = [
  'Requirements/CANONICAL.md',
  'Requirements/tenancy_isolation.md',
  'Requirements/rbac_roles.json',
  'Requirements/rbac_matrix.md',
  'Requirements/auth_model.md'
];

let ok = true;

for (const p of mustExist) {
  if (!fs.existsSync(p)) {
    console.error('MISSING:', p);
    ok = false;
  }
}

if (fs.existsSync('Requirements/CANONICAL.md')) {
  const t = fs.readFileSync('Requirements/CANONICAL.md','utf8');
  if (!t.includes('MACHINE_READABLE_JSONL') || !t.includes('END_MACHINE_READABLE_JSONL')) {
    console.error('CANONICAL missing marker block: MACHINE_READABLE_JSONL ... END_MACHINE_READABLE_JSONL');
    ok = false;
  }
}

try {
  if (fs.existsSync('Requirements/rbac_roles.json')) {
    JSON.parse(fs.readFileSync('Requirements/rbac_roles.json','utf8'));
  }
} catch (e) {
  console.error('INVALID JSON: Requirements/rbac_roles.json', e?.message || e);
  ok = false;
}

if (!ok) process.exit(1);
console.log('OK: test:requirements');