<# RIDE-SHARE-AGENTIC-PLAYBOOK — PaySurity-Biz/RideShare

## Purpose
Fast, repeatable loop to reach 100% launch-ready against the repo’s canonical requirements, using an agent (Windsurf) with minimal human intervention.

---

## A) Authority rules (anti-drift)
1) ONLY implementation authority: `Requirements/CANONICAL.md`
2) Treat legacy docs as reference-only:
   - `BlackRavenia_*`
   - `Requirements/_archive/**`
   Note: some legacy docs claim “ONLY build authority” — do not follow them. :contentReference[oaicite:0]{index=0}
3) PR-first only (no direct commits to `main`)
4) Never weaken gates to “make CI green”

---

## B) Single orchestration entrypoint (do not deviate)
- ONLY workflow to dispatch: `.github/workflows/ebt_gap_dispatch.yml`
- Do NOT attempt to dispatch: `ebt_agentic_build*.yml` (known HTTP 422 in this repo)

---

## C) Artifact contract (the “API” between orchestration and the agent)
Each orchestrator run must produce artifact `ebt_gap_report` containing at minimum:
- `AgentOutput/requirements_status.jsonl` (primary machine input)
- `AgentOutput/requirements_status.md` and `AgentOutput/milestone_summary.md` (human summary)
- `Requirements/requirements.jsonl` (derived from CANONICAL)

---

## D) Windsurf-readable input location (avoid .gitignore sandbox limits)
The agent must read the latest as-is status from:
- `C:\Users\Detaimfc\WindsurfInputs\RideShare\requirements_status.jsonl`

After every merged PR batch, refresh the report and export it to this path.

---

## E) Standard loop (repeat until 100%)
1) Run orchestrator (`ebt_gap_dispatch.yml`) on `main`
2) Download artifact `ebt_gap_report`
3) Export `AgentOutput/requirements_status.jsonl` → `C:\Users\Detaimfc\WindsurfInputs\RideShare\requirements_status.jsonl`
4) Agent parses JSONL and proposes next batch (dependency-ordered)
5) Implement via small PR(s)
6) Merge only when CI green
7) Repeat

---

## F) PR discipline (min manual intervention)
- Max 2 open PRs at once (pilot: 1 PR only)
- Each PR must be a single cohesive cluster
- Each PR must fully complete `.github/pull_request_template.md`
- Each PR must include Evidence Pack:
  - req_ids addressed
  - tests added/updated
  - CI green
  - before/after snippet (from requirements_status.jsonl) for those req_ids
  - rollback notes

---

## G) Pilot strategy (mandatory)
Pilot PR #1 must be “non-runtime” only:
- docs/templates/schemas/validation scripts/tests
- NO app routing, NO UI wiring, NO dispatch/pricing/payments logic

Pilot PR #2 (optional) can introduce UI shells if PR #1 proves the loop is stable.

---

## H) Stop conditions
Agent must stop and ask for decision if:
- requirement ambiguity
- CI fails >2 attempts
- change would require weakening gates
- secrets/infra changes needed

---

## I) Definition of done (launch-ready)
Done only when:
- 100% of CANONICAL is implemented + tested (or explicit exceptions approved)
- CI gates remain green
- staging deploy remains healthy post-merge
- no “implemented but undocumented” drift remains (either promote to CANONICAL via PR or remove)>
