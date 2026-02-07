param(
  [string]$WorkflowName = "Agentic Requirements Scan",
  [string]$WorkflowFile = "agentic_requirements_scan.yml",
  [string]$Mode = "full",
  [int]$MaxRequirements = 9999
)

$ErrorActionPreference = "Stop"

Write-Host "== RideShare One-Command Scan Runner =="

git checkout main | Out-Null
git pull | Out-Null

$sha = (git rev-parse HEAD).Trim()
Write-Host "Using SHA (Secure Hash Algorithm): $sha"

gh workflow run $WorkflowName -f mode=$Mode -f max_requirements=$MaxRequirements | Out-Null
Write-Host "Triggered workflow: $WorkflowName (mode=$Mode, max_requirements=$MaxRequirements)"

Start-Sleep -Seconds 8

$runId = $null
for ($i=0; $i -lt 60; $i++) {
  $runs = gh run list --workflow $WorkflowFile --limit 40 --json databaseId,event,headSha,status,conclusion,url | ConvertFrom-Json
  $t = $runs | Where-Object { $_.event -eq "workflow_dispatch" -and $_.headSha -eq $sha } | Select-Object -First 1
  if ($t) { $runId = $t.databaseId; $runUrl = $t.url; break }
  Start-Sleep -Seconds 3
}
if (-not $runId) { throw "Could not find workflow_dispatch run for sha=$sha" }

Write-Host "RunId: $runId"
Write-Host "URL:   $runUrl"

while ($true) {
  $r = gh run view $runId --json status,conclusion,url | ConvertFrom-Json
  Write-Host ("Status: {0}  Conclusion: {1}" -f $r.status, $r.conclusion)
  if ($r.status -eq "completed") {
    if ($r.conclusion -ne "success") {
      Write-Host "---- Last ~120 log lines ----"
      gh run view $runId --log | Select-Object -Last 120
      throw "Run completed but not success: $($r.conclusion)"
    }
    break
  }
  Start-Sleep -Seconds 8
}

$dest = ".\_gh_artifacts\AgenticScan_$runId"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
gh run download $runId -D $dest | Out-Null
Write-Host "Downloaded artifacts to: $dest"

$ms   = Get-ChildItem -Recurse $dest -Filter milestone_summary.md | Select-Object -First 1
$rs   = Get-ChildItem -Recurse $dest -Filter requirements_status.md | Select-Object -First 1
$ind  = Get-ChildItem -Recurse $dest -Filter implemented_not_documented.md | Select-Object -First 1
$jsonl = Get-ChildItem -Recurse $dest -Filter requirements_status.jsonl | Select-Object -First 1

if ($ms)  { Invoke-Item $ms.FullName }
if ($rs)  { Invoke-Item $rs.FullName }
if ($ind) { Invoke-Item $ind.FullName }

if (-not $jsonl) { throw "requirements_status.jsonl (JSONL (JavaScript Object Notation Lines)) not found under $dest" }

# Prefer canonical taxonomy: Requirements/status_taxonomy.json
$taxonomy = Join-Path $PSScriptRoot "..\Requirements\status_taxonomy.json"
$taxonomy = (Resolve-Path $taxonomy -ErrorAction SilentlyContinue)

$dash = Join-Path $jsonl.DirectoryName "dashboard.html"

if ($taxonomy) {
  python ".\scripts\make_dashboard.py" --jsonl $jsonl.FullName --out $dash --taxonomy $taxonomy.Path | Out-Null
} else {
  python ".\scripts\make_dashboard.py" --jsonl $jsonl.FullName --out $dash | Out-Null
}

Invoke-Item $dash
Write-Host "DONE. Opened summary files + dashboard."
