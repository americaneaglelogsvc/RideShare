[CmdletBinding()]
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$OutDir = "AgentInput"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$reqDir = Join-Path $RepoRoot "Requirements"
if (!(Test-Path -LiteralPath $reqDir)) { throw ("Missing Requirements folder: " + $reqDir) }

$canonicalMd = Join-Path $reqDir "CANONICAL.md"
if (!(Test-Path -LiteralPath $canonicalMd)) { throw ("Missing build authority: " + $canonicalMd) }

$canonicalJson = Join-Path $reqDir "CANONICAL.json"
if (!(Test-Path -LiteralPath $canonicalJson)) {
  $candidates = Get-ChildItem -LiteralPath $reqDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "*Canonical*Requirements*.json" } |
    Sort-Object LastWriteTime -Descending

  if ($null -ne $candidates -and $candidates.Count -gt 0) {
    Copy-Item -Force -LiteralPath $candidates[0].FullName -Destination $canonicalJson
    Write-Host ("Created CANONICAL.json from: " + $candidates[0].Name) -ForegroundColor Yellow
  }
}

if (!(Test-Path -LiteralPath $canonicalJson)) { throw ("Missing: " + $canonicalJson) }

$jsonlPath = Join-Path $reqDir "requirements.jsonl"
if (!(Test-Path -LiteralPath $jsonlPath)) {
  $raw = (Get-Content -LiteralPath $canonicalJson -Raw)
  $t = $raw.Trim()
  if ($t.Length -lt 2 -or (("{" -ne $t.Substring(0,1)) -and ("[" -ne $t.Substring(0,1)))) {
    throw "CANONICAL.json does not look like JSON (expected '{' or '[' at start)."
  }

  $obj = $t | ConvertFrom-Json

  # Accept either { requirements: [...] } or a bare [ ... ]
  $items = $null
  if ($null -ne $obj.PSObject.Properties["requirements"]) { $items = $obj.requirements } else { $items = $obj }

  if ($null -eq $items) { throw "No requirements found in CANONICAL.json." }

  $lines = New-Object System.Collections.Generic.List[string]
  foreach ($r in $items) {
    $lines.Add(($r | ConvertTo-Json -Compress -Depth 64))
  }

  $lines | Set-Content -LiteralPath $jsonlPath -Encoding UTF8
  Write-Host ("Generated: " + $jsonlPath) -ForegroundColor Yellow
}

$outDirPath = Join-Path $RepoRoot $OutDir
New-Item -ItemType Directory -Force -Path $outDirPath | Out-Null

Copy-Item -Force -LiteralPath $canonicalMd   -Destination (Join-Path $outDirPath "CANONICAL.md")
Copy-Item -Force -LiteralPath $canonicalJson -Destination (Join-Path $outDirPath "CANONICAL.json")
Copy-Item -Force -LiteralPath $jsonlPath     -Destination (Join-Path $outDirPath "requirements.jsonl")

Write-Host ("DONE. AgentInput prepared at: " + $outDirPath) -ForegroundColor Green
