param()
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$canonical = ".\Requirements\CANONICAL_v6_1.md"
$outJsonl  = ".\Requirements\requirements.jsonl"
$outJson   = ".\Requirements\requirements.json"

if (-not (Test-Path $canonical)) { throw "Canonical requirements file not found: $canonical" }
New-Item -ItemType Directory -Force -Path ".\AgentInput"  | Out-Null
New-Item -ItemType Directory -Force -Path ".\AgentOutput" | Out-Null

$lines = Get-Content -Encoding UTF8 $canonical
$startIdx = -1
for ($i=0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match "(?i)\bMACHINE_READABLE_JSONL\b") { $startIdx = $i; break } }
if ($startIdx -lt 0) { throw "Could not find MACHINE_READABLE_JSONL marker in: $canonical" }

$out = New-Object System.Collections.Generic.List[string]
for ($j=$startIdx+1; $j -lt $lines.Count; $j++) {
  $t = $lines[$j].Trim()
  if ($t -match "^(?i)(A\)|B\)|HUMAN_READABLE_TXT|MACHINE_READABLE_JSONL)\b" -and $j -gt ($startIdx+1)) { break }
  if ($t.Length -eq 0) { continue }
  if ($t.StartsWith("```")) { continue }
  if ($t.StartsWith("{") -and $t.EndsWith("}")) { $out.Add($lines[$j]) }
}

if ($out.Count -eq 0) { throw "Found marker but extracted 0 JSONL lines. Ensure MACHINE_READABLE_JSONL contains single-line { ... } records." }

# Validate JSON (JavaScript Object Notation (JSON)) on every line
$bad = New-Object System.Collections.Generic.List[string]
foreach ($l in $out) { try { $null = $l | ConvertFrom-Json } catch { $bad.Add($l) } }
if ($bad.Count -gt 0) { throw ("Invalid JSONL line found. First bad line: " + $bad[0]) }

# Write outputs
$out | Set-Content -Encoding UTF8 $outJsonl
$arr = foreach ($l in $out) { $l | ConvertFrom-Json }
($arr | ConvertTo-Json -Depth 25) | Set-Content -Encoding UTF8 $outJson

Copy-Item -Force $outJsonl ".\AgentInput\requirements.jsonl"
Copy-Item -Force $outJson  ".\AgentInput\requirements.json"

Write-Host ("Wrote: " + $outJsonl) -ForegroundColor Green
Write-Host ("Wrote: " + $outJson)  -ForegroundColor Green
Write-Host "DONE." -ForegroundColor Green

