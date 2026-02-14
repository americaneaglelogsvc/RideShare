const fs = require("fs");
const path = require("path");

function walk(dir) {
  let out = [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
}

function hasMustDoneInReqDocs(reqDir) {
  const files = walk(reqDir).filter(p => /\.(md|json)$/i.test(p));
  let hits = 0;

  for (const p of files) {
    const name = path.basename(p).toLowerCase();
    if (name.includes("taxonomy") || name.includes("glossary") || name.includes("index")) continue;

    const txt = fs.readFileSync(p, "utf8");
    // Only consider docs that actually look like requirement docs
    if (!/REQ-[A-Z0-9_-]+/i.test(txt)) continue;

    const lines = txt.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const a = lines[i];
      if (!/priority\s*:\s*MUST/i.test(a) && !/\bMUST\b/.test(a)) continue;

      // Look nearby for DONE/Implemented markers
      const window = lines.slice(i, i + 20).join("\n");
      if (/(status|state)\s*:\s*(DONE|Done|Implemented|Complete)/i.test(window) || /\bdone\s*:\s*true\b/i.test(window)) {
        hits++;
        break;
      }
    }
  }
  return hits;
}

function hasE2EHarness(root) {
  const candidates = [
    path.join(root, "e2e"),
    path.join(root, "tests", "e2e"),
  ];
  const cfg = [
    path.join(root, "playwright.config.ts"),
    path.join(root, "playwright.config.js"),
    path.join(root, "playwright.config.mjs"),
  ];
  if (cfg.some(p => fs.existsSync(p))) return true;
  if (candidates.some(p => fs.existsSync(p))) return true;
  return false;
}

function hasE2ETests(root) {
  const dirs = [path.join(root, "e2e"), path.join(root, "tests", "e2e")].filter(d => fs.existsSync(d));
  const testFiles = [];
  for (const d of dirs) {
    for (const f of walk(d)) {
      if (/\.(spec|test)\.(js|jsx|ts|tsx)$/i.test(f)) testFiles.push(f);
    }
  }
  return testFiles.length > 0;
}

const root = process.cwd();
const reqDir = path.join(root, "Requirements");
const mustDoneHits = hasMustDoneInReqDocs(reqDir);

if (mustDoneHits === 0) {
  console.log("OK: no MUST+DONE requirement docs detected (REQ-* scoped). E2E gate passes.");
  process.exit(0);
}

const harness = hasE2EHarness(root);
const tests   = hasE2ETests(root);

if (!harness || !tests) {
  console.error(`FAIL: Detected ${mustDoneHits} MUST+DONE requirement doc(s), but E2E harness/tests missing.`);
  console.error("Expected: playwright.config.* and at least one e2e/*.spec.* (or tests/e2e/*.spec.*).");
  process.exit(1);
}

console.log("OK: MUST+DONE detected and E2E harness/tests exist.");
process.exit(0);
