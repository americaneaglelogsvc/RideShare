param(
  [string]$InputJsonl="Requirements/requirements.jsonl",
  [string]$OutputPath="_ebt_gap_report/gap_report.json"
)
$ErrorActionPreference="Stop"
if (!(Test-Path $InputJsonl)) { throw "Missing $InputJsonl" }
$outDir = Split-Path -Parent $OutputPath
if ($outDir -and !(Test-Path $outDir)) { New-Item -ItemType Directory -Force -Path $outDir | Out-Null }

$reqs=@()
foreach($ln in Get-Content $InputJsonl -Encoding UTF8){
  if([string]::IsNullOrWhiteSpace($ln)){continue}
  try{$o=$ln|ConvertFrom-Json}catch{continue}
  if(-not $o.req_id){continue}
  $reqs += [pscustomobject]@{ req_id=$o.req_id; md_line=$o.md_line; title=($o.title ?? ""); status="UNASSESSED"; notes="" }
}
$report=[pscustomobject]@{
  generated_at_utc=(Get-Date).ToUniversalTime().ToString("o")
  source_ref=$env:GITHUB_REF
  source_sha=$env:GITHUB_SHA
  total=$reqs.Count
  requirements=$reqs
}
[IO.File]::WriteAllText($OutputPath, ($report|ConvertTo-Json -Depth 6), (New-Object System.Text.UTF8Encoding($false)))
Write-Host ("Wrote gap report: " + $OutputPath + " total=" + $reqs.Count)