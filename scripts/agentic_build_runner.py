#!/usr/bin/env python3
import argparse, json, os, subprocess, sys
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

def sh(cmd):
    p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    return p.returncode, p.stdout

def write_text(p: Path, s: str):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(s, encoding="utf-8")

def now_utc():
    return datetime.utcnow().isoformat(timespec="microseconds") + "Z"

def gh_create_pr(repo: str, token: str, head: str, base: str, title: str, body: str):
    url = f"https://api.github.com/repos/{repo}/pulls"
    payload = json.dumps({"title": title, "head": head, "base": base, "body": body}).encode("utf-8")
    req = Request(url, data=payload, method="POST", headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "ebt-build-runner",
        "Content-Type": "application/json",
    })
    try:
        with urlopen(req) as r:
            return json.loads(r.read().decode("utf-8"))
    except HTTPError as e:
        msg = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"PR create failed: HTTP {e.code}\n{msg}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", default=os.getenv("MODE","build"))
    ap.add_argument("--max_cost_usd", default=os.getenv("OPENAI_BUDGET_USD","0"))
    ap.add_argument("--out-dir", default=os.getenv("AGENT_OUTPUT_DIR","AgentOutput"))
    ap.add_argument("--artifacts-dir", default=os.getenv("ARTIFACTS_DIR","Artifacts"))
    ap.add_argument("--base-branch", default=os.getenv("EBT_BASE_BRANCH","main"))
    ap.add_argument("--auto-pr", default=os.getenv("EBT_AUTO_PR","1"))
    args, unknown = ap.parse_known_args()

    ts = now_utc()
    out_dir = Path(args.out_dir)
    art_dir = Path(args.artifacts_dir)
    log_path = art_dir / "build_runner.log"

    meta = {
        "time_utc": ts,
        "mode": args.mode,
        "max_cost_usd": str(args.max_cost_usd),
        "unknown_args": unknown,
        "note": "v1: allowlist Requirements/; emit patch; attempt PR when token permits."
    }
    write_text(out_dir / "build_metadata.json", json.dumps(meta, indent=2) + "\n")

    rc, status = sh(["git","status","--porcelain"])
    changed = []
    for line in status.splitlines():
        if not line.strip():
            continue
        path = line[3:].strip()
        if path.replace("\\","/").startswith("Requirements/"):
            changed.append(path)

    plan = ["# Build Plan (v1)", "", "- Allowlist: Requirements/ only.", f"- time_utc: {ts}", f"- requirements_changes: {len(changed)}", ""]
    if not changed:
        plan.append("No Requirements/ changes detected. Exiting success.")
        write_text(out_dir / "build_plan.md", "\n".join(plan) + "\n")
        write_text(log_path, f"OK: v1 ran at {ts}; no Requirements/ changes.\n")
        return 0

    # Always emit patch
    rc, patch = sh(["git","diff","--patch","--","Requirements"])
    write_text(art_dir / "build_patch.diff", patch)
    write_text(art_dir / "build_patch_files.txt", "\n".join(sorted(changed)) + "\n")
    plan.append("Changed files (Requirements/):")
    for p in sorted(changed)[:200]:
        plan.append(f"- {p}")
    if len(changed) > 200:
        plan.append(f"- ... ({len(changed)-200} more)")
    plan.append("")

    token = os.getenv("GITHUB_TOKEN","").strip()
    repo  = os.getenv("GITHUB_REPOSITORY","").strip()
    auto_pr = str(args.auto_pr).lower() in ("1","true","yes","y")

    if (not auto_pr) or (not token) or (not repo):
        plan.append("Auto-PR skipped (missing EBT_AUTO_PR=1 and/or GITHUB_TOKEN and/or GITHUB_REPOSITORY). Patch emitted to Artifacts/build_patch.diff.")
        write_text(out_dir / "build_plan.md", "\n".join(plan) + "\n")
        write_text(log_path, f"OK: v1 ran at {ts}; patch emitted; auto-PR skipped.\n")
        return 0

    # Create PR branch inside CI workspace
    pr_branch = f"bot/ebt-req-sync-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    sh(["git","config","user.email", os.getenv("GIT_AUTHOR_EMAIL","actions@users.noreply.github.com")])
    sh(["git","config","user.name",  os.getenv("GIT_AUTHOR_NAME","ebt-bot")])
    rc, _ = sh(["git","checkout","-b",pr_branch])
    if rc != 0:
        raise RuntimeError("Failed to create PR branch in CI workspace.")

    rc, _ = sh(["git","add","--","Requirements"])
    if rc != 0:
        raise RuntimeError("Failed to stage Requirements/.")

    rc, staged = sh(["git","diff","--cached","--name-only"])
    if not staged.strip():
        plan.append("Nothing staged after add. Exiting success.")
        write_text(out_dir / "build_plan.md", "\n".join(plan) + "\n")
        write_text(log_path, f"OK: v1 ran at {ts}; nothing staged.\n")
        return 0

    rc, out = sh(["git","commit","-m",f"ci: sync Requirements from EBT ({ts})"])
    if rc != 0:
        raise RuntimeError("git commit failed:\n" + out)

    remote_url = f"https://x-access-token:{token}@github.com/{repo}.git"
    rc, out = sh(["git","remote","set-url","origin",remote_url])
    if rc != 0:
        raise RuntimeError("git remote set-url failed:\n" + out)

    rc, out = sh(["git","push","origin",pr_branch])
    if rc != 0:
        raise RuntimeError("git push failed:\n" + out)

    pr = gh_create_pr(
        repo=repo,
        token=token,
        head=pr_branch,
        base=args.base_branch,
        title=f"ci: sync Requirements from EBT ({ts})",
        body="Auto-generated by EBT build runner v1. Commits only Requirements/ changes."
    )
    pr_url = pr.get("html_url","")
    plan.append(f"PR created: {pr_url}")
    write_text(out_dir / "build_plan.md", "\n".join(plan) + "\n")
    write_text(log_path, f"OK: v1 ran at {ts}; PR created: {pr_url}\n")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        Path("Artifacts").mkdir(parents=True, exist_ok=True)
        Path("Artifacts/build_runner_error.txt").write_text(str(e) + "\n", encoding="utf-8")
        print(str(e))
        # Do NOT fail EBT just because PR creation is blocked; patch is still emitted.
        sys.exit(0)
