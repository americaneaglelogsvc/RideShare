#!/usr/bin/env python3
import argparse, os, re, json, sys
from pathlib import Path
from datetime import datetime, timezone

REQ_ID_RE = re.compile(r"\b[A-Z]{2,8}-\d+(?:\.\d+)*\b")

TEXT_EXT = {".ts",".tsx",".js",".jsx",".py",".ps1",".yml",".yaml",".json",".sql",".md",".txt",".toml",".env",".sh"}
EXCLUDE_DIR_NAMES = {".git","node_modules","dist","build",".next",".vercel",".railway","coverage",".pytest_cache","AgentOutput","agent-output"}
EXCLUDE_DIR_PREFIXES = ("_audit_","_ebt_","_scan_","_agent_","_agent_artifacts_","_postEBT_")

def utc_now():
  return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def read_text(p: Path) -> str:
  try:
    return p.read_text(encoding="utf-8", errors="ignore")
  except Exception:
    return ""

def safe_json_load(p: Path):
  try:
    return json.loads(p.read_text(encoding="utf-8", errors="ignore"))
  except Exception:
    return None

def normalize_req_items(obj):
  # Accept many shapes: list, {requirements:[...]}, {items:[...]}, etc.
  if obj is None:
    return []
  if isinstance(obj, list):
    return obj
  if isinstance(obj, dict):
    for k in ("requirements","items","data","rows"):
      v = obj.get(k)
      if isinstance(v, list):
        return v
    return []
  return []

def extract_reqs_from_requirements_json(p: Path):
  obj = safe_json_load(p)
  items = normalize_req_items(obj)
  out = []
  for it in items:
    if not isinstance(it, dict):
      continue
    rid = it.get("requirement_id") or it.get("req_id") or it.get("id") or it.get("requirementId") or it.get("requirementID")
    if not rid or not isinstance(rid, str):
      continue
    title = it.get("title") or it.get("name") or ""
    ms = it.get("milestone") or it.get("ms") or it.get("group") or ""
    out.append({"requirement_id": rid.strip(), "title": str(title)[:180], "milestone": (str(ms)[:120] if ms else "Core/Other")})
  # de-dupe preserve order
  seen=set(); ded=[]
  for r in out:
    rid=r["requirement_id"]
    if rid in seen: continue
    seen.add(rid); ded.append(r)
  return ded

def extract_reqs_from_markdown(req_dir: Path):
  out=[]
  if not req_dir.exists():
    return out
  for p in req_dir.rglob("*"):
    if not p.is_file():
      continue
    if p.suffix.lower() not in (".md",".txt"):
      continue
    txt = read_text(p)
    if not txt:
      continue
    for line in txt.splitlines():
      m = REQ_ID_RE.search(line)
      if not m:
        continue
      rid = m.group(0)
      title = line.replace(rid,"").strip(" :-\t")[:180]
      out.append({"requirement_id": rid, "title": title, "milestone": "Core/Other"})
  seen=set(); ded=[]
  for r in out:
    rid=r["requirement_id"]
    if rid in seen: continue
    seen.add(rid); ded.append(r)
  return ded

def classify_evidence(path_str: str, line_no: int) -> str:
  p = path_str.replace("\\","/")
  low = p.lower()
  if "/.github/workflows/" in low: return f"ci:{p}:{line_no}"
  if "test" in low or "spec" in low: return f"test:{p}:{line_no}"
  if any(x in low for x in ("/pages/","/components/","/ui/")): return f"ui:{p}:{line_no}"
  if any(x in low for x in ("/db/","/schema/","/migrations/","prisma","drizzle")): return f"db:{p}:{line_no}"
  if low.endswith((".ts",".tsx",".js",".jsx",".py",".ps1",".sql")): return f"code:{p}:{line_no}"
  return f"file:{p}:{line_no}"

def iter_text_files(root: Path):
  for dirpath, dirnames, filenames in os.walk(str(root)):
    dp = Path(dirpath)

    # skip Requirements as evidence source
    if "Requirements" in dp.parts:
      dirnames[:] = []
      continue

    keep=[]
    for d in dirnames:
      if d in EXCLUDE_DIR_NAMES:
        continue
      bad=False
      for pref in EXCLUDE_DIR_PREFIXES:
        if d.startswith(pref):
          bad=True; break
      if bad:
        continue
      keep.append(d)
    dirnames[:] = keep

    for fn in filenames:
      p = dp / fn
      if p.suffix.lower() not in TEXT_EXT:
        continue
      try:
        if p.stat().st_size > 512 * 1024:
          continue
      except Exception:
        continue
      yield p

def scan_evidence(root: Path, req_set):
  evid = {rid: [] for rid in req_set}
  hit_counts = {rid: 0 for rid in req_set}

  for p in iter_text_files(root):
    txt = read_text(p)
    if not txt:
      continue
    for ln_no, line in enumerate(txt.splitlines(), start=1):
      if "-" not in line:
        continue
      for m in REQ_ID_RE.finditer(line):
        rid = m.group(0)
        if rid not in req_set:
          continue
        if hit_counts[rid] >= 5:
          continue
        evid[rid].append(classify_evidence(str(p), ln_no))
        hit_counts[rid] += 1
  return evid

def status_from_evidence(ev_list):
  if any(e.startswith("test:") for e in ev_list): return "Tested"
  if any(e.startswith(("code:","ui:","db:")) for e in ev_list): return "Implemented"
  if ev_list: return "In Progress"
  return "Not Started"

def gaps_from_evidence(ev_list):
  gaps=[]
  if not any(e.startswith(("code:","ui:","db:")) for e in ev_list): gaps.append("missing:impl")
  if not any(e.startswith("test:") for e in ev_list): gaps.append("missing:test")
  if not ev_list: gaps.append("missing:any")
  return gaps

def write_jsonl(path: Path, rows):
  path.parent.mkdir(parents=True, exist_ok=True)
  with path.open("w", encoding="utf-8") as f:
    for r in rows:
      f.write(json.dumps(r, ensure_ascii=False) + "\n")

def write_md_status(path: Path, rows):
  path.parent.mkdir(parents=True, exist_ok=True)
  lines = ["# Requirements Status","","| req_id | status | milestone | title |","|---|---|---|---|"]
  for r in rows:
    lines.append(f"| {r.get('requirement_id','')} | {r.get('status','')} | {r.get('milestone','')} | {r.get('title','')} |")
  path.write_text("\n".join(lines) + "\n", encoding="utf-8")

def write_delta_plan(path: Path, rows, limit=60):
  rank={"Not Started":0,"Blocked":1,"In Progress":2,"Implemented":3,"Tested":4}
  rows2=sorted(rows, key=lambda r:(rank.get(r.get("status","Not Started"),99), r.get("requirement_id","")))
  out=["# Delta Plan","",f"- time_utc: {utc_now()}",f"- total: {len(rows)}",f"- showing: {min(limit,len(rows2))}",""]
  n=0
  for r in rows2:
    if n>=limit: break
    rid=r.get("requirement_id",""); st=r.get("status",""); ms=r.get("milestone",""); tl=r.get("title","")
    gaps=r.get("gaps",[]) or []; ev=r.get("evidence",[]) or []
    out += [f"## {rid} — {st}", f"- ms: {ms}"]
    if tl: out.append(f"- title: {tl}")
    if gaps: out.append(f"- gaps: {', '.join(gaps)}")
    out.append("- evidence:")
    if ev:
      for e in ev[:8]: out.append(f"  - {e}")
    else:
      out.append("  - (none)")
    out.append("")
    n+=1
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text("\n".join(out), encoding="utf-8")

def milestone_summary(rows):
  ms={}
  for r in rows:
    k=r.get("milestone","Core/Other") or "Core/Other"
    ms.setdefault(k, {"Total":0,"Tested":0,"Implemented":0,"Blocked":0})
    ms[k]["Total"] += 1
    st=r.get("status","")
    if st=="Tested": ms[k]["Tested"] += 1
    if st=="Implemented": ms[k]["Implemented"] += 1
    if st=="Blocked": ms[k]["Blocked"] += 1
  lines=["# Milestone Summary (Definition of Done (DoD) rollups)","",
         "| Milestone | Total | Tested | Implemented | Blocked |",
         "|---|---:|---:|---:|---:|"]
  for k in sorted(ms.keys()):
    v=ms[k]
    lines.append(f"| {k} | {v['Total']} | {v['Tested']} | {v['Implemented']} | {v['Blocked']} |")
  lines += ["","**Milestone Done rule (current):** Done when `Tested == Total` and each Tested item has at least one `test:` evidence line.",""]
  return "\n".join(lines)

def main():
  ap = argparse.ArgumentParser()
  ap.add_argument("--requirements-json", default="")
  ap.add_argument("--mode", default="LITE")
  ap.add_argument("--max-requirements", default="9999")
  ap.add_argument("--out-dir", default="AgentOutput")

  # backward compatible (local)
  ap.add_argument("--root", default=".")
  ap.add_argument("--out", default="AgentOutput")
  ap.add_argument("root_pos", nargs="?", default=None)
  ap.add_argument("out_pos", nargs="?", default=None)

  args = ap.parse_args()

  # root/out resolution
  root_arg = args.root_pos if args.root_pos else args.root
  out_arg  = args.out_pos  if args.out_pos  else args.out
  root = Path(root_arg).resolve()

  out_dir = (root / args.out_dir).resolve() if args.out_dir else (root / out_arg).resolve()
  out_dir.mkdir(parents=True, exist_ok=True)

  # load requirements list
  reqs=[]
  req_json = Path(args.requirements_json) if args.requirements_json else None
  if req_json and req_json.exists():
    reqs = extract_reqs_from_requirements_json(req_json)

  if not reqs:
    reqs = extract_reqs_from_markdown(root / "Requirements")

  # apply max
  try:
    mx = int(str(args.max_requirements))
  except Exception:
    mx = 9999
  if mx > 0:
    reqs = reqs[:mx]

  req_ids = [r["requirement_id"] for r in reqs]
  req_set = set(req_ids)

  evid = scan_evidence(root, req_set) if req_ids else {}

  rows=[]
  for r in reqs:
    rid=r["requirement_id"]
    ev=evid.get(rid,[])
    rows.append({
      "requirement_id": rid,
      "title": r.get("title",""),
      "milestone": r.get("milestone","Core/Other") or "Core/Other",
      "status": status_from_evidence(ev),
      "evidence": ev[:20],
      "gaps": gaps_from_evidence(ev),
      "notes": ""
    })

  write_jsonl(out_dir/"requirements_status.jsonl", rows)
  write_md_status(out_dir/"requirements_status.md", rows)
  (out_dir/"scan_summary.json").write_text(json.dumps({
    "time_utc": utc_now(),
    "mode": args.mode,
    "requirements_json": str(req_json) if req_json else "",
    "requirement_count": len(rows)
  }, indent=2), encoding="utf-8")
  (out_dir/"scan_summary.md").write_text(
    "# Agentic Scan Summary\n"
    f"- time_utc: {utc_now()}\n"
    f"- mode: {args.mode}\n"
    f"- requirements_json: {str(req_json) if req_json else ''}\n"
    f"- requirement_count: {len(rows)}\n",
    encoding="utf-8"
  )
  (out_dir/"milestone_summary.md").write_text(milestone_summary(rows), encoding="utf-8")
  write_delta_plan(out_dir/"delta_plan.md", rows, limit=60)
  (out_dir/"implemented_not_documented.md").write_text("# Implemented but not documented\n\n_none_\n", encoding="utf-8")
  (out_dir/"run_metadata.json").write_text(json.dumps({
    "time_utc": utc_now(),
    "root": str(root),
    "out_dir": str(out_dir)
  }, indent=2), encoding="utf-8")

  return 0

if __name__ == "__main__":
  sys.exit(main())
