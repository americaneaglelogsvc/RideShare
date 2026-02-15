# OPS_DASHBOARD (RideShare)

## Links
- Actions: https://github.com/PaySurity-Biz/RideShare/actions
- Repo Status: https://github.com/PaySurity-Biz/RideShare/actions?query=workflow%3A%22Repo+Status%22
- Scan: https://github.com/PaySurity-Biz/RideShare/actions?query=workflow%3A%22Agentic+Requirements+Scan%22
- Audit: https://github.com/PaySurity-Biz/RideShare/actions?query=workflow%3A%22Agentic+Audit+%28Requirements+Status%29%22
- Boundary: https://github.com/PaySurity-Biz/RideShare/actions?query=workflow%3A%22ci-requirements-boundary%22
- EBT: https://github.com/PaySurity-Biz/RideShare/actions?query=workflow%3A%22EBT+Agentic+Build+%28RideShare%29%22

## Required checks (merge)
- audit
- boundary
- scan

## Trigger (on-demand)
```powershell
gh workflow run "Repo Status" --repo PaySurity-Biz/RideShare --ref main
gh workflow run "Agentic Requirements Scan" --repo PaySurity-Biz/RideShare --ref main
gh workflow run "Agentic Audit (Requirements Status)" --repo PaySurity-Biz/RideShare --ref main
gh workflow run "EBT Agentic Build (RideShare)" --repo PaySurity-Biz/RideShare --ref main
```

## Monitor
- CLI: gh run list --repo PaySurity-Biz/RideShare --limit 15
- Open any run -> Summary tab.