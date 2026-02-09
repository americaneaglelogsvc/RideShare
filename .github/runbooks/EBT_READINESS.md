# EBT (Enterprise Build Template) Readiness Runbook

## Why this exists
We repeatedly hit the same build/automation blockers across repos. This runbook captures the exact, reusable fixes/policies that made PaySurity EBT-ready, so RideShare and AEL (American Eagle Logistics) can be brought to parity quickly.

---

## 1) Node.js policy (local + CI parity)
### Goal
- All tooling (local dev, CI (Continuous Integration), Dependabot) agrees on the same Node major.
- Avoid narrow engines.node strings like "20.x" when they cause ecosystem friction; prefer a range.

### What worked for PaySurity
- Root package.json:
  - engines.node: >=20.0.0 <21.0.0
  - packageManager: pinned (example used: pnpm@10.15.0)

### Checklist (per repo)
- Search every package.json (root + workspace packages) for engines.node and normalize where needed.
- Ensure GitHub Actions uses the same Node major as engines.node.

---

## 2) pnpm policy (Dependabot + reproducible installs)
### Goal
- Dependabot + dependency tooling can compute updates reliably.
- Lockfile exists, is committed, and matches the selected package manager.

### What worked for PaySurity
- Commit pnpm-lock.yaml and ensure it is tracked by git.
- Use Corepack to pin pnpm version consistently:
  - corepack enable
  - corepack prepare pnpm@<version> --activate

### Checklist (per repo)
- Confirm pnpm-lock.yaml exists at the repo root (or correct workspace root).
- Confirm pnpm-lock.yaml is tracked by git.
- Ensure packageManager is present in root package.json.
- Remove conflicting lockfiles (only if the repo is standardizing on pnpm):
  - package-lock.json, yarn.lock

---

## 3) GitHub Actions workflow reruns (manual dispatch)
### Reality check
A workflow cannot be manually triggered via workflow dispatch unless its YAML includes:
- workflow_dispatch:

If you see an HTTP 422 complaining about missing workflow_dispatch, itâ€™s working as designed.

---

## 4) Dependabot PRs vs strict gates
### Goal
Dependabot security updates should not get blocked by overly strict gates that are irrelevant to dependency-only changes.

### Pattern that worked
For selected strict workflows, skip Dependabot PRs using an if: guard (examples):
- github.actor != 'dependabot[bot]'
- Or check PR author in the event payload

Use this selectively (only on workflows that are known to cause noise or false failures on Dependabot PRs).

---

## 5) â€œBefore you say EBT is brokenâ€ quick triage
- Confirm Node policy is consistent (all package.json + workflows).
- Confirm pnpm lockfile exists and is tracked.
- Confirm workflows arenâ€™t failing only on Dependabot PRs due to strict gates.
- Expect CRLF (Carriage Return Line Feed) warnings on Windows; treat as noise unless it causes real diffs or workflow failures.

---

## 6) Known-good commit strategy for doc-only updates
If you need to publish a docs-only change without triggering workflows, use a commit message containing:
- skip ci / ci skip / skip actions / ctions skip

(Only use this when you explicitly want to avoid running workflows.)

<!-- RUNBOOK_APPEND: POWERSHELL_GOTCHAS_V1 -->

## PowerShell + Git + GitHub Actions gotchas (learned during EBT debugging)

- PowerShell \Stop="Stop" + native tools (like git) can turn expected stderr into terminating errors.
  - Avoid “intentional failure then fallback” patterns.
  - Prefer explicit existence checks (example): git show-ref --verify --quiet refs/heads/<branch>.

- Branch creation: don’t git switch <new-branch> and expect it to “just work”.
  - Use checks, or git switch -c <branch> after confirming it doesn’t exist.

- gh workflow run only works if the workflow has workflow_dispatch.
  - We saw HTTP 422 on the **Dependabot Updates** workflow because it lacks workflow_dispatch.

- Repo remote moves happen; verify with git remote -v and fix via:
  - git remote set-url origin https://github.com/PaySurity-Biz/<repo>.git

- Avoid path mistakes and “wrong working directory” issues:
  - Prefer absolute paths using Join-Path when writing files.

- Line endings: you may see CRLF↔LF warnings on Windows.
  - Don’t fight warnings; just keep YAML valid and avoid mangling indentation.

- Dependabot/lockfiles:
  - Dependabot needs the lockfile committed to apply security updates (example: pnpm-lock.yaml).
  - Prefer an engines.node range like >=20.0.0 <21.0.0 over 20.x to reduce tool friction.

