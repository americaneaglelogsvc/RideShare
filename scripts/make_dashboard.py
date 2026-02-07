import json
import html
import argparse
from pathlib import Path
from collections import defaultdict

def norm(s: str) -> str:
    return (s or "").strip().lower()

def esc(x):
    return html.escape("" if x is None else str(x))

def load_complete_statuses(taxonomy_path: Path) -> set[str]:
    """
    Tries to load a status taxonomy JSON (JavaScript Object Notation) file and return the set of
    statuses considered COMPLETE (terminal/done/pass).
    Supports multiple schemas (defensive parsing).
    """
    if not taxonomy_path or not taxonomy_path.exists():
        return set()

    data = json.loads(taxonomy_path.read_text(encoding="utf-8"))
    complete = set()

    if isinstance(data, dict):
        # Schema A: { "complete_statuses": ["Done", ...] }
        for k in ["complete_statuses", "done_statuses", "terminal_statuses", "pass_statuses"]:
            v = data.get(k)
            if isinstance(v, list):
                for x in v:
                    if isinstance(x, str) and norm(x):
                        complete.add(norm(x))

        # Schema B: { "statuses": [ { "name": "...", "is_complete": true }, ... ] }
        sts = data.get("statuses")
        if isinstance(sts, list):
            for s in sts:
                if not isinstance(s, dict):
                    continue
                name = s.get("name") or s.get("id") or s.get("status") or s.get("label")
                if not isinstance(name, str) or not norm(name):
                    continue

                flags = ["is_complete", "complete", "terminal", "done", "is_done", "is_terminal", "is_pass", "pass"]
                if any(s.get(f) is True for f in flags):
                    complete.add(norm(name))
                    continue

                cat = s.get("category") or s.get("type")
                if isinstance(cat, str) and norm(cat) in {"complete", "completed", "done", "pass", "passed", "implemented"}:
                    complete.add(norm(name))
                    continue

    return complete

def is_complete(status: str, complete_set: set[str]) -> bool:
    """
    Primary: taxonomy-driven.
    Fallback (only if taxonomy didn't provide anything): conservative keyword check.
    """
    s = norm(status)
    if not s:
        return False
    if complete_set:
        return s in complete_set

    # Fallback (should rarely be used once taxonomy is present)
    return any(k in s for k in ["done", "complete", "completed", "implemented", "pass", "passing"])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jsonl", required=True, help="Path to requirements_status.jsonl (JSONL (JavaScript Object Notation Lines))")
    ap.add_argument("--out", required=True, help="Path to dashboard.html (HTML (HyperText Markup Language))")
    ap.add_argument("--taxonomy", required=False, default="", help="Path to status_taxonomy.json (JSON (JavaScript Object Notation))")
    args = ap.parse_args()

    jsonl_path = Path(args.jsonl)
    out_html = Path(args.out)
    taxonomy_path = Path(args.taxonomy) if args.taxonomy else None

    complete_set = load_complete_statuses(taxonomy_path) if taxonomy_path else set()

    rows = []
    with jsonl_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))

    total = len(rows)
    done = sum(1 for r in rows if is_complete(r.get("status",""), complete_set))
    overall_pct = (done / total * 100.0) if total else 0.0

    by_m = defaultdict(list)
    for r in rows:
        by_m[r.get("milestone","(none)")].append(r)

    milestones = []
    for m, items in by_m.items():
        t = len(items)
        d = sum(1 for r in items if is_complete(r.get("status",""), complete_set))
        pct = (d / t * 100.0) if t else 0.0
        milestones.append((m, t, d, pct))
    milestones.sort(key=lambda x: (x[0] or ""))

    next_up = [r for r in rows if not is_complete(r.get("status",""), complete_set)]
    next_up.sort(key=lambda r: (r.get("milestone",""), r.get("title","")))
    next_up = next_up[:25]

    taxonomy_note = ""
    if taxonomy_path and taxonomy_path.exists() and complete_set:
        taxonomy_note = f"Taxonomy: {taxonomy_path.name} (complete states: {len(complete_set)})"
    elif taxonomy_path and taxonomy_path.exists():
        taxonomy_note = f"Taxonomy: {taxonomy_path.name} (loaded, but no explicit complete states found — using fallback)"
    else:
        taxonomy_note = "Taxonomy: (none) — using fallback"

    html_out = f"""<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>RideShare Requirements Dashboard</title>
  <style>
    body {{ font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; }}
    .card {{ border: 1px solid #ddd; border-radius: 12px; padding: 16px; margin-bottom: 16px; }}
    h1 {{ margin: 0 0 8px 0; }}
    .muted {{ color: #666; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ border-bottom: 1px solid #eee; padding: 8px; text-align: left; vertical-align: top; }}
    th {{ background: #fafafa; }}
    .kpi {{ font-size: 32px; font-weight: 700; }}
    .row {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }}
    @media (max-width: 900px) {{ .row {{ grid-template-columns: 1fr; }} }}
    code {{ background: #f6f6f6; padding: 2px 6px; border-radius: 6px; }}
  </style>
</head>
<body>
  <div class="card">
    <h1>RideShare — Requirements Dashboard</h1>
    <div class="muted">Source: {esc(jsonl_path.name)} (generated by GitHub Actions (GitHub Actions))</div>
    <div class="muted">{esc(taxonomy_note)}</div>
    <div style="margin-top:12px" class="kpi">{overall_pct:.1f}% complete</div>
    <div class="muted">{done} done / {total} total</div>
  </div>

  <div class="row">
    <div class="card">
      <h2>Milestones</h2>
      <table>
        <thead><tr><th>Milestone</th><th>Total</th><th>Done</th><th>%</th></tr></thead>
        <tbody>
          {''.join(f'<tr><td>{esc(m)}</td><td>{t}</td><td>{d}</td><td>{pct:.1f}%</td></tr>' for m,t,d,pct in milestones)}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Next up (first 25 incomplete)</h2>
      <table>
        <thead><tr><th>ID</th><th>Milestone</th><th>Status</th><th>Title</th></tr></thead>
        <tbody>
          {''.join(
            f"<tr><td><code>{esc(r.get('requirement_id',''))}</code></td>"
            f"<td>{esc(r.get('milestone',''))}</td>"
            f"<td>{esc(r.get('status',''))}</td>"
            f"<td>{esc(r.get('title',''))}</td></tr>"
            for r in next_up
          )}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
"""
    out_html.parent.mkdir(parents=True, exist_ok=True)
    out_html.write_text(html_out, encoding="utf-8")
    print("Wrote:", out_html)

if __name__ == "__main__":
    main()
