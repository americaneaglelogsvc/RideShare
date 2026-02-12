from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[1]
OUT  = ROOT / "AgentOutput"
OUT.mkdir(parents=True, exist_ok=True)

def now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def main():
    req_dir = ROOT / "Requirements"
    files = []
    if req_dir.exists():
        for p in sorted(req_dir.rglob("*")):
            if p.is_file():
                files.append(str(p.relative_to(ROOT)))

    summary = {
        "time_utc": now(),
        "repo_root": str(ROOT),
        "requirements_dir_exists": req_dir.exists(),
        "requirements_file_count": len(files),
        "openai_api_key_present": bool(os.getenv("OPENAI_API_KEY")),
        "note": "Minimal scan runner (unblocks CI). Replace with full scan implementation when ready."
    }

    (OUT / "scan_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    md = [
        "# Agentic Scan Summary",
        f"- time_utc: {summary['time_utc']}",
        f"- requirements_dir_exists: {summary['requirements_dir_exists']}",
        f"- requirements_file_count: {summary['requirements_file_count']}",
        f"- openai_api_key_present: {summary['openai_api_key_present']}",
        "",
        summary["note"],
        ""
    ]
    (OUT / "scan_summary.md").write_text("\n".join(md), encoding="utf-8")

    print("OK: agentic_scan_runner.py completed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
