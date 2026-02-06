# Agent Runbook (Agentic Artificial Intelligence (AI)) — BlackRavenia RideShare

## Source of truth (READ ONLY)
- Requirements (canonical):
  - Requirements/CANONICAL.md
  - Requirements/CANONICAL.json
- Requirements provenance:
  - Requirements/version_manifest.json
  - Requirements/sources/*
  - Requirements/_archive/* (reference only; do NOT treat as authoritative)

## Hard rule: As-is first (mandatory)
Before proposing or implementing ANY change, produce as-is evidence and status:
- Generate / refresh as-is evidence pack (file inventory + routes + database (DB) (Database) + APIs (Application Programming Interfaces) (APIs) + tests).
- Mark requirements as complete ONLY when evidence meets the gating criteria in the canonical document.

## Status taxonomy (use EXACT values)
Not Started | In Progress | Implemented | Tested | Shippable | Launch-ready | Blocked

## Required outputs (WRITE here only)
- Agentic AI Work/AgentOutput/requirements_status.jsonl
- Agentic AI Work/AgentOutput/requirements_status.md
- Agentic AI Work/AgentOutput/implemented_not_documented.md
- Agentic AI Work/AgentOutput/progress_report.md

## Evidence rules
A requirement can be marked:
- Implemented ONLY with: real file paths + UI (User Interface) (UI) screen or route + API endpoint/controller + DB schema/migration (when applicable).
- Tested ONLY with: test file paths + command used OR Continuous Integration (CI) (Continuous Integration) run evidence.
- Shippable ONLY with: staging deploy ref + smoke test evidence + observability links.
- Launch-ready ONLY when Shippable + GO/NO-GO gates pass for release candidate.

## Implemented-but-not-documented rule
If you find a capability in code that is not in CANONICAL.md:
1) Add it to implemented_not_documented.md with file evidence.
2) Insert it into CANONICAL.md in the correct section.
3) Add it to requirements_status.* with correct completion state + evidence.

## Milestone reporting (mandatory)
Use the milestones defined in Requirements/CANONICAL.json.
Report when a milestone becomes "Completed" (all in-scope items are Shippable or Launch-ready with evidence).
