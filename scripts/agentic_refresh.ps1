param(
    [string]$Mode = "full"  # or "lite" in future if needed
)

$ErrorActionPreference = "Stop"

Write-Host "[agentic-refresh] Starting agentic scan + foundation status update..." -ForegroundColor Cyan

if (-not (Test-Path .git)) {
    Write-Error "This script must be run from the RideShare repo root."
    exit 1
}

# Ensure Python is available
try {
    python --version | Out-Null
} catch {
    Write-Error "Python is not available on PATH. Install Python and retry."
    exit 1
}

# Ensure Node is available
try {
    node --version | Out-Null
} catch {
    Write-Error "Node.js is not available on PATH. Install Node and retry."
    exit 1
}

# 1. Run agentic scan to regenerate AgentOutput/requirements_status.jsonl
Write-Host "[agentic-refresh] Running agentic_scan_runner.py..." -ForegroundColor Gray

$scanArgs = @(
    "scripts/agentic_scan_runner.py",
    "--requirements-json", "Requirements/CANONICAL.json",
    "--mode", $Mode,
    "--max-requirements", "9999",
    "--out-dir", "AgentOutput"
)

python @scanArgs

# 2. Apply foundation status updater
$targetJsonl = "AgentOutput/requirements_status.jsonl"
if (-not (Test-Path $targetJsonl)) {
    Write-Error "Expected $targetJsonl not found after scan. Aborting."
    exit 1
}

Write-Host "[agentic-refresh] Updating foundation statuses via Node script..." -ForegroundColor Gray

node scripts/update_requirements_status_from_foundation.mjs --jsonl $targetJsonl

Write-Host "[agentic-refresh] Completed. Updated $targetJsonl." -ForegroundColor Green
