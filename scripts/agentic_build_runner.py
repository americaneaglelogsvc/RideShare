#!/usr/bin/env python3
import argparse, json, os
from datetime import datetime

def main():
    p = argparse.ArgumentParser(description="EBT build runner (contract stub).")
    p.add_argument("--mode", default=os.getenv("MODE","build"))
    p.add_argument("--max_cost_usd", default=os.getenv("OPENAI_BUDGET_USD","0"))
    args, unknown = p.parse_known_args()

    root = os.getcwd()
    out_agent = os.path.join(root, "AgentOutput")
    out_art   = os.path.join(root, "Artifacts")
    os.makedirs(out_agent, exist_ok=True)
    os.makedirs(out_art, exist_ok=True)

    meta = {
        "time_utc": datetime.utcnow().isoformat() + "Z",
        "mode": args.mode,
        "max_cost_usd": str(args.max_cost_usd),
        "unknown_args": unknown,
        "note": "Contract stub: proves EBT executed a build runner. Replace with real gap-filler next."
    }

    with open(os.path.join(out_agent, "build_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    plan = [
        "# Build Plan (stub)",
        "",
        "- Confirms EBT ran build runner.",
        "- Next: implement real gap-fill + evidence writing.",
        "",
        "`json",
        json.dumps(meta, indent=2),
        "`",
        ""
    ]
    with open(os.path.join(out_agent, "build_plan.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(plan))

    with open(os.path.join(out_art, "build_runner.log"), "a", encoding="utf-8") as f:
        f.write("OK: agentic_build_runner.py ran at %s\n" % meta["time_utc"])

    print("OK: agentic_build_runner.py stub ran (mode=%s)." % args.mode)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
