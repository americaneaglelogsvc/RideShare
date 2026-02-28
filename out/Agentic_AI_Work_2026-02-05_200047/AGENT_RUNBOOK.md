# Agent Runbook (Agentic Artificial Intelligence)

## Inputs (Source of Truth)
1) Canonical requirements: Requirements/BlackRavenia_UrwayDispatch_Canonical_Requirements_v6_1.md
2) Machine requirements export (JavaScript Object Notation Lines (JSONL)): Requirements/requirements.jsonl
3) Status taxonomy: Requirements/status_taxonomy.json
4) As-is manifest: Artifacts/as_is_manifest.json
5) Audit log: Artifacts/audit_log.txt

## Required Outputs (Write Files)
A) Reports/requirements_status.jsonl
   - One JSON object per requirement.
   - Must include: requirement_id, requirement_title, status, confidence_0_to_1, evidence[], gaps[], notes
   - Evidence must reference real file paths, routes/endpoints, or tests.

B) Reports/implemented_not_documented.md
   - List features found in code not present in requirements export.
   - Group by: UI (User Interface), API (Application Programming Interface), DB (Database), Background Jobs, Integrations.
   - Each entry must include: what it is, where found (file paths), why it matters, recommended requirement to add.

C) Reports/build_plan.md
   - Ordered plan to reach 100% launch-ready.
   - Each step ties to requirement_id(s).
   - Includes test coverage tasks.

## Status Rules
- IMPLEMENTED_WITH_TESTS: evidence includes at least one test file that validates acceptance criteria.
- IMPLEMENTED_NO_TESTS: implemented, but tests missing or do not cover acceptance criteria.
- PARTIAL: some acceptance criteria satisfied, others missing.
- NOT_STARTED: no evidence of implementation.

## Do Not Guess
If uncertain, mark UNKNOWN_REVIEW_NEEDED and list exactly what evidence is missing.
