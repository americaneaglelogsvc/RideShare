import fs from 'node:fs';

const mustExist = [
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

try {
  const j = JSON.parse(fs.readFileSync('Requirements/rbac_roles.json','utf8'));
  if (!Array.isArray(j.roles) || j.roles.length < 4) {
    console.error('rbac_roles.json: roles[] missing/too small');
    ok = false;
  }
} catch (e) {
  console.error('rbac_roles.json invalid:', e?.message || e);
  ok = false;
}

if (!ok) process.exit(1);
console.log('OK: test:foundation');