/* scripts/require_req_id_check.cjs */
const fs = require("fs");
const cp = require("child_process");

function sh(cmd) {
  return cp.execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString("utf8").trim();
}

const baseRef = process.env.GITHUB_BASE_REF || "main";

// Best-effort fetch
try { cp.execSync(`git fetch origin ${baseRef} --depth=1`, { stdio: "ignore" }); } catch (_) {}

let changed = [];
try {
  changed = sh(`git diff --name-only origin/${baseRef}...HEAD`).split(/\r?\n/).filter(Boolean);
} catch (_) {
  try {
    changed = sh(`git diff --name-only ${baseRef}...HEAD`).split(/\r?\n/).filter(Boolean);
  } catch (_) {
    changed = sh(`git diff --name-only HEAD~1..HEAD`).split(/\r?\n/).filter(Boolean);
  }
}

// Accept canonical IDs like TEN-BASE-0001, CFG-TEN-0001, etc. (and legacy REQ-* too)
const idRe = /\b[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3,5}\b/;

const targets = changed.filter(f =>
  f.startsWith("Requirements/") &&
  f.endsWith(".md") &&
  !f.startsWith("Requirements/_archive/")
);

const missing = [];
for (const f of targets) {
  let txt = "";
  try { txt = fs.readFileSync(f, "utf8"); } catch (_) { txt = ""; }
  if (!idRe.test(txt)) missing.push(f);
}

if (missing.length) {
  console.error("FAIL: These changed Requirements/*.md files contain no req_id IDs:");
  for (const f of missing) console.error(" - " + f);
  process.exit(1);
}

console.log("OK: require-req-id (req_id pattern found in all changed Requirements/*.md)");
process.exit(0);
