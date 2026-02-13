param()

$ErrorActionPreference = "Stop"
$begin = "<!-- BEGIN: PAYMENTS_PROVIDER_BOUNDARY -->"

$files = @(
  "Requirements\README.md",
  "Requirements\BUILD_AUTHORITY.md"
)

$missing = @()
foreach ($f in $files) {
  if (-not (Test-Path $f)) { $missing += $f; continue }
  $t = Get-Content -Raw -Encoding UTF8 $f
  if (-not ($t -and $t.Contains($begin))) { $missing += $f }
}

if ($missing.Count -gt 0) {
  Write-Error ("Payments boundary missing in: " + ($missing -join ", "))
  exit 1
}

# Fail-fast if anyone hard-codes PaySurity as required (SimpleMatch only)
$badPhrases = @(
  "PaySurity MUST be used",
  "PaySurity is required",
  "Tenants must use PaySurity"
)

foreach ($bp in $badPhrases) {
  $hits = Select-String -Path $files -Pattern $bp -SimpleMatch -ErrorAction SilentlyContinue
  if ($hits) {
    Write-Error ("Found forbidden phrase: " + $bp)
    exit 1
  }
}

Write-Host "OK: Payments boundary present and no forbidden phrases found." -ForegroundColor Green
