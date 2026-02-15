#!/usr/bin/env python3
import argparse, os, re, json, sys
from pathlib import Path
from datetime import datetime, timezone

REQ_ID_RE = re.compile(r"\b[A-Z]{2,8}-\d+(?:\.\d+)*\b")

TEXT_EXT = {
  ".ts",".tsx",".js",".jsx",".py",".ps1",".yml",".yaml",".json",".sql",".md",".txt",".toml",".env",".sh"
}

EXCLUDE_DIR_NAMES = {
  ".git","node_modules","dist","build",".next",".vercel",".railway",
  "AgentOutput","agent-output","coverage",".pytest_cache",
}
EXCLUDE_DIR_PREFIXES = (
  "_audit_","_ebt_","_scan_","_agent_","_agent_artifacts_","_postEBT_",
)

def utc_now():
  return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def read_text(p: Path) -> str:
  try:
    return p.read_text(encoding="utf-8", errors="ignore")
  except Exception:
    return ""

def list_req_sources(req_dir: Path):
  if not req_dir.exists():
    return []
  return [p for p in req_dir.rglob("*") if p.is_file() and p.suffix.lower() in (".md",".txt")]

def extract_requirements(req_dir: Path):
  """Returns dict: id -> {title, milestone, source} (best-effort)."""
  out = {}
  for p in list_req_sources(req_dir):
    txt = read_text(p)
    if not txt:
      continue
    lines = txt.splitlines()
    for i, line in enumerate(lines):
      m = REQ_ID_RE.search(line)
      if not m:
        continue
      rid = m.group(0)
      if rid not in out:
        # title: try same line after id, else next non-empty line
        title = line.replace(rid, "").strip(" :-\t")
        if not title:
          j = i + 1
          while j < len(lines) and not lines[j].strip():
            j += 1
          if j < len(lines):
            title = lines[j].strip()
        # milestone: try nearby "milestone:" within next 20 lines
        milestone = ""
        for k in range(i, min(i + 20, len(lines))):
          mm = re.search(r"^\s*(milestone|ms)\s*:\s*(.+)\s*$", lines[k], re.IGNORECASE)
          if mm:
            milestone = mm.group(2).strip()
            break
        if not milestone:
          milestone = "Core/Other"
        out[rid] = {"title": title[:180], "milestone": milestone, "source": str(p)}
  return out

def should_skip_dir(d: Path) -> bool:
  name = d.name
  if name in EXCLUDE_DIR_NAMES:
    return True
  for pref in EXCLUDE_DIR_PREFIXES:
    if name.startswith(pref):
      return True
  return False

def iter_text_files(root: Path):
  for p in root.rglob("*"):
    if p.is_dir():
      if should_skip_dir(p):
        # prune by skipping traversal using rglob's nature (best-effort)
        continue
      continue
    if not p.is_file():
      continue
    # skip Requirements as "implementation evidence" (still used to discover reqs)
    if "Requirements" in p.parts:
      continue
    if p.suffix.lower() not in TEXT_EXT:
      continue
    try:
      if p.stat().st_size > 1024 * 1024:
        continue
    except Exception:
      continue
    yield p

def classify_evidence(path_str: str, line_no: int) -> str:
  p = path_str.replace("\\","/")
  low = p.lower()
  if "/.github/workflows/" in low:
    return f"ci:{p}:{line_no}"
  if "test" in low or "spec" in low:
    return f"test:{p}:{line_no}"
  if "/src/" in low or low.endswith((".ts",".tsx",".js",".jsx")):
    if any(x in low for x in ("/pages/","/components/","/ui/")):
      return f"ui:{p}:{line_no}"
    if any(x in low for x in ("/db/","/schema/","/migrations/","prisma","drizzle")):
      return f"db:{p}:{line_no}"
    return f"code:{p}:{line_no}"
  return f"file:{p}:{line_no}"

def scan_evidence(root: Path, req_ids):
  evid = {rid: [] for rid in req_ids}
  for p in iter_text_files(root):
    txt = read_text(p)
    if not txt:
      continue
    lines = txt.splitlines()
    # quick reject
    joined = "\n".join(lines[:2000]) if len(lines) > 2000 else txt
    for rid in req_ids:
      if rid not in joined:
        continue
      # record exact line hits (cap)
      hits = 0
      for idx, line in enumerate(lines, start=1):
        if rid in line:
          evid[rid].append(classify_evidence(str(p), idx))
          hits += 1
          if hits >= 5:
            break
  return evid

def status_from_evidence(ev_list):
  if any(e.startswith("test:") for e in ev_list):
    return "Tested"
  if any(e.startswith(("code:","ui:","db:")) for e in ev_list):
    return "Implemented"
  if ev_list:
    return "In Progress"
  return "Not Started"

def gaps_from_evidence(ev_list):
  gaps = []
  if not any(e.startswith(("code:","ui:","db:")) for e in ev_list):
    gaps.append("missing:impl")
  if not any(e.startswith("test:") for e in ev_list):
    gaps.append("missing:test")
  if not ev_list:
    gaps.append("missing:any")
  return gaps

def write_jsonl(path: Path, rows):
  path.parent.mkdir(parents=True, exist_ok=True)
  with path.open("w", encoding="utf-8") as f:
    for r in rows:
      f.write(json.dumps(r, ensure_ascii=False) + "\n")

def write_md_status(path: Path, rows):
  path.parent.mkdir(parents=True, exist_ok=True)
  lines = []
  lines.append("# Requirements Status")
  lines.append("")
  lines.append("| req_id | status | milestone | title |")
  lines.append("|---|---|---|---|")
  for r in rows:
    rid = r.get("requirement_id","")
    st  = r.get("status","")
    ms  = r.get("milestone","")
    tl  = r.get("title","")
    lines.append(f"| {rid} | {st} | {ms} | {tl} |")
  path.write_text("\n".join(lines) + "\n", encoding="utf-8")

def write_delta_plan(path: Path, rows, limit=50):
  # show biggest deltas first (Not Started, Blocked, In Progress, Implemented, Tested)
  rank = {"Not Started":0, "Blocked":1, "In Progress":2, "Implemented":3, "Tested":4}
  rows2 = sorted(rows, key=lambda r: (rank.get(r.get("status","Not Started"), 99), r.get("requirement_id","")))
  lines = []
  lines.append("# Delta Plan")
  lines.append("")
  lines.append(f"- time_utc: {utc_now()}")
  lines.append(f"- total: {len(rows)}")
  lines.append(f"- showing: {min(limit, len(rows2))}")
  lines.append("")
  shown = 0
  for r in rows2:
    if shown >= limit:
      break
    rid = r.get("requirement_id","")
    st  = r.get("status","")
    ms  = r.get("milestone","")
    tl  = r.get("title","")
    gaps = r.get("gaps", []) or []
    ev = r.get("evidence", []) or []
    lines.append(f"## {rid} — {st}")
    lines.append(f"- ms: {ms}")
    if tl:
      lines.append(f"- title: {tl}")
    if gaps:
      lines.append(f"- gaps: {', '.join(gaps)}")
    if ev:
      lines.append("- evidence:")
      for e in ev[:8]:
        lines.append(f"  - {e}")
    else:
      lines.append("- evidence: (none)")
    lines.append("")
    shown += 1
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text("\n".join(lines), encoding="utf-8")

def implemented_not_documented(root: Path, known_ids):
  # look for "REQ: <id>" tags in code, not present in requirements docs
  out = []
  tag = re.compile(r"\bREQ:\s*([A-Z]{2,8}-\d+(?:\.\d+)*)\b")
  for p in iter_text_files(root):
    txt = read_text(p)
    if not txt:
      continue
    for m in tag.finditer(txt):
      rid = m.group(1)
      if rid not in known_ids:
        out.append(f"- {rid} (found in {p.as_posix()})")
  out = sorted(set(out))
  return out

def milestone_rollup(rows):
  # Determinants of truth: route/db/test/ui/ci/file/other (count evidence presence)
  def det_from_ev(ev):
    low = ev.lower()
    if ev.startswith("test:"):
      return "test"
    if ev.startswith("ci:"):
      return "ci"
    if ev.startswith("db:"):
      return "db"
    if ev.startswith("ui:"):
      return "ui"
    if "route" in low:
      return "route"
    if ev.startswith(("code:","file:")):
      return "file"
    return "other"

  ms = {}
  for r in rows:
    k = r.get("milestone","Core/Other") or "Core/Other"
    ms.setdefault(k, {"Total":0,"Tested":0,"Implemented":0,"Blocked":0,"det":{d:0 for d in ["route","db","test","ui","ci","file","other"]}})
    ms[k]["Total"] += 1
    st = r.get("status","")
    if st == "Tested":
      ms[k]["Tested"] += 1
    if st == "Implemented":
      ms[k]["Implemented"] += 1
    if st == "Blocked":
      ms[k]["Blocked"] += 1
    # determinants: if any evidence hits a determinant, count it once per req
    dets = set(det_from_ev(e) for e in (r.get("evidence",[]) or []))
    for d in dets:
      if d in ms[k]["det"]:
        ms[k]["det"][d] += 1

  # write md
  lines = []
  lines.append("# Milestone Summary (Definition of Done (DoD) rollups)")
  lines.append("")
  lines.append("| Milestone | Total | Tested | Implemented | Blocked | Determinants of truth (route/db/test/ui/ci/file/other) |")
  lines.append("|---|---:|---:|---:|---:|---|")
  for k in sorted(ms.keys()):
    v = ms[k]
    det = v["det"]
    det_str = f'{det["route"]}/{det["db"]}/{det["test"]}/{det["ui"]}/{det["ci"]}/{det["file"]}/{det["other"]}'
    lines.append(f"| {k} | {v['Total']} | {v['Tested']} | {v['Implemented']} | {v['Blocked']} | {det_str} |")
  lines.append("")
  lines.append("**Milestone Done rule (current):** Done when `Tested == Total` (all requirements in milestone are Tested) and each Tested item has at least one `test:` evidence line.")
  return "\n".join(lines) + "\n"

def main():
  ap = argparse.ArgumentParser()
  ap.add_argument("--root", default=".")
  ap.add_argument("--out", default="AgentOutput")
  args = ap.parse_args()

  root = Path(args.root).resolve()
  out_dir = (root / args.out).resolve()
  req_dir = root / "Requirements"

  known = extract_requirements(req_dir)
  req_ids = sorted(known.keys())

  # If we can't discover reqs, still emit valid empty outputs
  evid = scan_evidence(root, req_ids) if req_ids else {}

  rows = []
  for rid in req_ids:
    meta = known.get(rid, {})
    ev = evid.get(rid, [])
    row = {
      "requirement_id": rid,
      "title": meta.get("title",""),
      "milestone": meta.get("milestone","Core/Other"),
      "status": status_from_evidence(ev),
      "evidence": ev[:20],
      "gaps": gaps_from_evidence(ev),
      "notes": ""
    }
    rows.append(row)

  # write outputs
  write_jsonl(out_dir / "requirements_status.jsonl", rows)
  write_md_status(out_dir / "requirements_status.md", rows)

  # summaries + delta plan
  (out_dir / "scan_summary.json").write_text(json.dumps({
    "time_utc": utc_now(),
    "requirements_dir_exists": req_dir.exists(),
    "requirements_file_count": len(list_req_sources(req_dir)) if req_dir.exists() else 0,
    "requirement_count": len(rows),
  }, indent=2), encoding="utf-8")

  (out_dir / "scan_summary.md").write_text(
    "# Agentic Scan Summary\n"
    f"- time_utc: {utc_now()}\n"
    f"- requirements_dir_exists: {req_dir.exists()}\n"
    f"- requirements_file_count: {len(list_req_sources(req_dir)) if req_dir.exists() else 0}\n"
    f"- requirement_count: {len(rows)}\n",
    encoding="utf-8"
  )

  (out_dir / "milestone_summary.md").write_text(milestone_rollup(rows), encoding="utf-8")
  write_delta_plan(out_dir / "delta_plan.md", rows, limit=60)

  # implemented_not_documented
  undoc = implemented_not_documented(root, set(req_ids))
  (out_dir / "implemented_not_documented.md").write_text(
    "# Implemented but not documented\n\n" + ("\n".join(undoc) if undoc else "_none_\n"),
    encoding="utf-8"
  )

  (out_dir / "run_metadata.json").write_text(json.dumps({
    "time_utc": utc_now(),
    "root": str(root),
    "out": str(out_dir),
  }, indent=2), encoding="utf-8")

  return 0

if __name__ == "__main__":
  sys.exit(main())
