/* require_req_id_check.cjs
   Purpose: Ensure changed Requirements/*.md files include at least one req_id token.
   Exempt certain meta files that should not contain req_id.
*/
const fs = require("fs");
const cp = require("child_process");

function sh(cmd) {
  return cp.execSync(cmd, { encoding: "utf8" }).trim();
}
function safe(cmd) {
  try { return sh(cmd); } catch (e) { return ""; }
}

const baseRef = process.env.GITHUB_BASE_REF || "";
if (baseRef) {
  safe(`git fetch origin ${baseRef}`);
}

const range = baseRef ? `origin/${baseRef}...HEAD` : "HEAD~1..HEAD";
const out = safe(`git diff --name-only ${range}`) || "";
const files = out.split(/\r?\n/).filter(Boolean);

const mdFiles = files
  .map(f => f.replace(/\\/g, "/"))
  .filter(f => f.startsWith("Requirements/") && f.endsWith(".md"));

const EXEMPT = new Set([
  "Requirements/BUILD_AUTHORITY.md"
]);

const REQ = /\b[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)*-\d{3,5}\b/; // e.g., RIDEOO-CORE-0001, TEN-BASE-01234

const bad = [];
for (const f of mdFiles) {
  if (EXEMPT.has(f)) continue;

  let text = "";
  try { text = fs.readFileSync(f, "utf8"); }
  catch (e) { continue; }

  if (!REQ.test(text)) bad.push(f);
}

if (bad.length) {
  console.error("FAIL: These changed Requirements/*.md files contain no req_id IDs:");
  for (const b of bad) console.error(" - " + b);
  process.exit(1);
}

console.log(`OK: req_id present (or file exempt). Checked ${mdFiles.length} Requirements/*.md file(s).`);
process.exit(0);