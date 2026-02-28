# Agent Task — BlackRavenia UrwayDispatch (As-Is vs Requirements)

## Inputs (READ ONLY)
- AgentInput/Requirements/requirements.jsonl  (canonical requirements)
- AgentInput/as_is_scan.json  (as-is evidence pack)
- AgentInput/as_is_scan.md
- AgentInput/requirements_status_seed.jsonl  (seed only; do not trust blindly)
- AgentInput/implemented_not_documented_candidates.md  (candidate only)

## Outputs (WRITE to AgentOutput ONLY)
1) AgentOutput/requirements_status.jsonl
2) AgentOutput/requirements_status.md
3) AgentOutput/implemented_not_documented.md

## Critical rules (non-negotiable)
- Semantic matching ONLY (match by meaning, not by requirement_id).
- A requirement can only be marked IMPLEMENTED if you cite evidence:
  - file paths + route/controller or UI (User Interface (UI)) + database (DB) code or migration.
- A requirement can only be marked TESTED if you cite:
  - test file paths + the test command or Continuous Integration (CI) workflow evidence.
- If acceptance criteria are missing, add “Proposed Given/When/Then” and mark NEEDS_ACCEPTANCE=true.

## Status taxonomy (use EXACTLY these)
NOT_STARTED | IN_PROGRESS | IMPLEMENTED | TESTED | BLOCKED

## requirements_status.jsonl line schema (one JSON object per line)
{
  "requirement_id": "...",
  "title": "...",
  "status": "NOT_STARTED|IN_PROGRESS|IMPLEMENTED|TESTED|BLOCKED",
  "evidence": {
    "ui_files": [],
    "api_files": [],
    "endpoints": [],
    "db_files": [],
    "migrations": [],
    "tests": [],
    "workflows": []
  },
  "gaps": [],
  "proposed_work": [],
  "needs_acceptance": true|false,
  "proposed_acceptance_criteria": ["Given ...", "When ...", "Then ..."]
}

## implemented_not_documented.md format
For each item:
- Title
- What it does (1–3 lines)
- Evidence (file paths, endpoints, migrations, tests)
- Suggested requirement wording to add into canonical requirements

DONE means:
- Every requirement in requirements.jsonl appears exactly once in requirements_status.jsonl
- All statuses justified with evidence or explicit gaps
