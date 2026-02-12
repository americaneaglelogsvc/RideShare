from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
ART  = ROOT / "Artifacts"
ART.mkdir(exist_ok=True)

def now():
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

def append_strategic_idea(title: str, details: str):
    p = ART / "strategic_ideas.md"
    p.parent.mkdir(parents=True, exist_ok=True)
    entry = f"\n## {title}\n- time_utc: {now()}\n- details: {details.strip()}\n"
    p.write_text(p.read_text(encoding="utf-8") + entry if p.exists() else ("# Strategic Ideas (requires human decision)\n" + entry), encoding="utf-8")

def main():
    ap = argparse.ArgumentParser(description="Agentic build runner (guardrailed).")
    ap.add_argument("--mode", choices=["plan","build"], default="plan", help="plan = no code changes; build = allowed to patch code.")
    ap.add_argument("--allow_new_scope", action="store_true", help="Allow adding new scope; otherwise record to Artifacts/strategic_ideas.md")
    ap.add_argument("--allow_financial_automation", action="store_true", help="Allow automations touching money movement; default OFF.")
    ap.add_argument("--max_cost_usd", type=float, default=float(os.getenv("OPENAI_BUDGET_USD", "0") or "0"), help="Optional budget cap for agent usage.")
    args = ap.parse_args()

    # Guardrails
    if args.mode == "build" and args.max_cost_usd <= 0:
        print("BLOCKED: build mode requires OPENAI_BUDGET_USD (or --max_cost_usd) > 0", file=sys.stderr)
        sys.exit(2)

    if not args.allow_financial_automation:
        append_strategic_idea(
            "Financial automation disabled by default",
            "Build runner executed with allow_financial_automation=FALSE. Any money-moving steps must be proposed and queued for approval."
        )

    # Minimal orchestration hooks (safe): run scans/validators if present.
    # Keep this runner non-destructive unless mode=build AND explicit flags allow it.
    scripts = ROOT / "scripts"
    candidates = [
        scripts / "agentic_scan_runner.py",
        scripts / "validate_agent_output.py",
        scripts / "requirements_quality_report.py",
    ]

    for c in candidates:
        if c.exists():
            print(f"INFO: found {c.name} (runner may invoke in future phases).")

    if args.mode == "plan":
        print("OK: plan complete (no code changes).")
        sys.exit(0)

    # build mode: still guardrailed  only declares intent right now; actual patch execution should be added deliberately.
    append_strategic_idea(
        "Build mode requested",
        "Runner invoked in build mode. Implement patch-execution steps only after audit output is clean and approvals/flags are set."
    )
    print("OK: build mode acknowledged; guardrails applied.")
    sys.exit(0)

if __name__ == "__main__":
    main()
