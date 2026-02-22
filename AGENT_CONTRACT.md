# AGENT_CONTRACT — RideShare

## Authority & Inputs
- ONLY requirements authority: Requirements/CANONICAL.md
- Ignore: Requirements/_archive/**, BlackRavenia_*, legacy snapshots

## Allowed automation entrypoint
- ONLY dispatchable workflow for orchestration: .github/workflows/ebt_gap_dispatch.yml
- Do NOT attempt dispatch: ebt_agentic_build*.yml (known HTTP 422)

## PR discipline
- PR-first only. No direct main commits.
- Keep PRs small (one cohesive cluster).
- Max 2 open PRs at a time unless explicitly authorized.

## Quality discipline
- Never weaken CI gates to “make it green”.
- Add tests with every behavior change.
- Prefer additive + reversible changes first.

## Pilot requirement selection rule
- Pilot batch must be low-risk, mostly additive:
  - docs, tests, validations, scaffolds, UI placeholders
- Avoid core dispatch/payments logic in pilot.

## Stop conditions (must stop & report)
- Any CI gate fails for >2 attempts.
- Any requirement is ambiguous (needs human decision).
- Any change would require weakening gates.