# READ FIRST — Agentic AI Instructions (BlackRavenia RideShare)

**Timestamp (America/Chicago): 2026-02-04 05:21:23**

## 1) The ONLY requirements authority
- `BlackRavenia_RideShare_Canonical_Requirements_v6_1.md` is the ONLY requirements authority.
- Do not derive requirements from any other file.

## 2) What to read (order)
1. This file (READ FIRST)
2. `BUILD_AUTHORITY.md` (strict rules)
3. `agent_build_rules.json` (evidence gates and required artifacts)
4. `BlackRavenia_RideShare_Canonical_Requirements_v6_1.md` (build requirements)
5. `system_map.md` (expected modules/services)
6. `screen_index.md` (screen and flow registry)
7. `timers.json` (timer registry)
8. `design_tokens_placeholder.json` and `public_site_cta_placeholders.md` (design placeholders for public site and tenant microsites)

## 3) Required artifacts to generate and keep updated
- `as_is_scan.md`
- `requirements_status.md`
- `progress_report.md`
- `implemented_not_documented.md`

## 4) Semantic matching rule
Evaluate as-is state by meaning and end-to-end coverage. Do NOT match by Requirement Identifier (REQ ID).

## 5) Evidence gate rule (no claims)
You may only mark:
- Implemented: if you provide evidence links for file paths + API endpoints + DB migrations/queries.
- Tested: if you link automated tests + CI proof.
- Shippable: if you reference staging deploy + smoke tests + observability signals.

If evidence is missing, the status must be In Progress or Blocked.

## 6) Default assumption
Assume NOTHING is built until proven by evidence.
