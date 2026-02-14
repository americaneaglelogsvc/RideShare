const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString("utf8");
}

const base = process.env.GITHUB_BASE_REF || "main";

try {
  sh(`git fetch origin ${base} --depth=1`);
} catch (_) {
  // best-effort
}

const changed = sh(`git diff --name-only origin/${base}...HEAD`).split(/\r?\n/).filter(Boolean);
const reqChanged = changed.filter(p => p.replace(/\\/g,"/").startsWith("Requirements/"));

if (reqChanged.length === 0) {
  console.log("OK: no Requirements/* changes in this PR.");
  process.exit(0);
}

// Minimal enterprise rule (safe): any changed Requirements/*.md must include at least one REQ- token
// (prevents adding/editing requirement docs without IDs; avoids false positives on meta docs by scoping to changed files only)
let bad = [];
for (const p of reqChanged) {
  if (!p.toLowerCase().endsWith(".md")) continue;
  const txt = fs.readFileSync(p, "utf8");
  if (!/REQ-[A-Z0-9_-]+/i.test(txt)) {
    bad.push(p);
  }
}

if (bad.length) {
  console.error("FAIL: These changed Requirements/*.md files contain no REQ-* IDs:");
  for (const b of bad) console.error(" - " + b);
  process.exit(1);
}

console.log("OK: require-req-id passed for changed Requirements files.");
process.exit(0);
