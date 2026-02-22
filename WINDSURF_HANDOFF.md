# WINDSURF HANDOFF — RideShare (PaySurity-Biz/RideShare)

## Non-negotiables
- Authority file for implementation: `Requirements/CANONICAL.md` (only).
- Ignore legacy docs: `BlackRavenia_*`, `Requirements/_archive/**` (reference-only).
- PR-first workflow only. No direct commits to `main`.
- Do NOT attempt to dispatch `ebt_agentic_build.yml` or `ebt_agentic_build_v2.yml` (GitHub returns HTTP 422). This is a known repo constraint.

## Orchestrator entrypoint (the ONLY workflow to dispatch)
- Workflow file: `.github/workflows/ebt_gap_dispatch.yml`
- Trigger: `workflow_dispatch`

### Expected artifact
- Artifact name: `ebt_gap_report`
- Must include:
  - `AgentOutput/requirements_status.jsonl`
  - `AgentOutput/requirements_status.md`
  - `AgentOutput/milestone_summary.md`
  - `Requirements/requirements.jsonl`

## Standard operating loop (scan -> gap -> PRs)
1) Dispatch `ebt_gap_dispatch.yml` on `main`.
2) Download artifact `ebt_gap_report`.
3) Read:
   - `AgentOutput/requirements_status.jsonl` (primary machine input)
   - `AgentOutput/requirements_status.md` (human readable)
4) Generate a PR plan:
   - smallest safe PRs first
   - prioritize items that unblock other work
   - keep PRs narrow (one feature cluster per PR)
5) Open PRs and rely on PR CI gates + staging deploy on merge to `main`.
6) Repeat from step (1).

## Local commands (reference)
- Trigger orchestrator:
  - `gh workflow run ebt_gap_dispatch.yml --repo PaySurity-Biz/RideShare --ref main`
- Find latest run:
  - `gh run list --repo PaySurity-Biz/RideShare --workflow ebt_gap_dispatch.yml --branch main --limit 5`
- Download artifact:
  - `gh run download <runId> --repo PaySurity-Biz/RideShare --name ebt_gap_report --dir .\_ebt_gap_report_dl`

## Quality rules
- Never change Requirements authority rules.
- Every PR must keep CI green.
- Prefer adding tests alongside fixes.
- Never “fix forward” by weakening gates.