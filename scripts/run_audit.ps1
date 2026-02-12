param(
  [string]$LogPath = ".\Artifacts\audit_log.txt",
  [switch]$SkipAgenticScan
)

function LogLine([string]$s) { $s | Add-Content -Encoding UTF8 $LogPath }

function HasPkgScript($name) {
  if (-not (Test-Path .\package.json)) { return $false }
  $pkg = Get-Content -Raw -Encoding UTF8 .\package.json | ConvertFrom-Json
  return ($pkg.scripts -and $pkg.scripts.PSObject.Properties.Name -contains $name)
}

New-Item -ItemType Directory -Force -Path ".\Artifacts" | Out-Null
New-Item -ItemType Directory -Force -Path ".\AgentOutput" | Out-Null
New-Item -ItemType Directory -Force -Path ".\Agentic AI Work\AgentOutput" | Out-Null

"=== AUDIT START: $(Get-Date -Format s) ===" | Set-Content -Encoding UTF8 $LogPath
$overallExit = 0

# ----------------------------
# A) JavaScript (JavaScript) quality gates (pnpm (performant Node Package Manager) preferred)
# ----------------------------
$pm = $null
if ((Test-Path .\pnpm-lock.yaml) -and (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  $pm = "pnpm"
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
  $pm = "npm"
}

if ((Test-Path .\package.json) -and $pm) {
  LogLine "package.json found. Package manager: $pm"

  if ($pm -eq "pnpm") {
    LogLine "Running: pnpm install --frozen-lockfile"
    pnpm install --frozen-lockfile 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Null
    if ($LASTEXITCODE -ne 0) { $overallExit = 1; LogLine "pnpm install failed (exit=$LASTEXITCODE)" }

    foreach ($s in @("lint","typecheck","test","build")) {
      if (HasPkgScript $s) {
        LogLine "Running: pnpm -s run $s"
        pnpm -s run $s 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Null
        if ($LASTEXITCODE -ne 0) { $overallExit = 1; LogLine "pnpm run $s failed (exit=$LASTEXITCODE)" }
      } else {
        LogLine "Skipping: pnpm run $s (script not found)"
      }
    }
  } else {
    if (Test-Path .\package-lock.json) {
      LogLine "Running: npm (Node Package Manager) ci"
      npm ci 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Null
      if ($LASTEXITCODE -ne 0) { $overallExit = 1; LogLine "npm ci failed (exit=$LASTEXITCODE)" }
    } else {
      LogLine "Running: npm (Node Package Manager) install"
      npm install 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Null
      if ($LASTEXITCODE -ne 0) { $overallExit = 1; LogLine "npm install failed (exit=$LASTEXITCODE)" }
    }

    foreach ($s in @("lint","typecheck","test","build")) {
      if (HasPkgScript $s) {
        LogLine "Running: npm run $s"
        npm run $s 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Null
        if ($LASTEXITCODE -ne 0) { $overallExit = 1; LogLine "npm run $s failed (exit=$LASTEXITCODE)" }
      } else {
        LogLine "Skipping: npm run $s (script not found)"
      }
    }
  }
} else {
  LogLine "No package.json or no package manager found; skipping JS steps."
}

# ----------------------------
# B) Agentic scan outputs (requirements_status.*)
# ----------------------------
if (-not $SkipAgenticScan) {
  $pythonExe = if (Get-Command python -ErrorAction SilentlyContinue) { "python" }
               elseif (Get-Command py -ErrorAction SilentlyContinue) { "py" }
               else { $null }

  if (-not $pythonExe) {
    $overallExit = 1
    LogLine "ERROR: Python (Python) not found (no python/py)."
  } else {
    if (-not $env:OPENAI_API_KEY) {
      $overallExit = 1
      LogLine "ERROR: OPENAI_API_KEY is not set. Agentic scan cannot run."
    } else {
      $pyPrefix = @(); if ($pythonExe -eq "py") { $pyPrefix = @("-3") }

      # Avoid warning noise
      $env:PYTHONWARNINGS = "ignore::DeprecationWarning"

      # Force full-ish mode via env + flags (flags may be ignored by script; env still helps)
      $env:RUN_MODE       = "full"
      $env:SCAN_MODE      = "full"
      $env:BATCH_SIZE     = "999999"
      $env:LIMIT          = "999999"
      $env:TOP_K          = "999999"
      $env:MAX_CANDIDATES = "999999"

      LogLine "Running: agentic_scan_runner.py"
      & $pythonExe @pyPrefix "scripts/agentic_scan_runner.py" --run-mode full --batch-size 999999 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Null
      $exit1 = $LASTEXITCODE

      if ($exit1 -ne 0) {
        $overallExit = 1
        LogLine "ERROR: agentic_scan_runner.py failed (exit=$exit1)."
      } else {
        LogLine "OK: agentic_scan_runner.py completed."

        if (Test-Path ".\scripts\validate_agent_output.py") {
          LogLine "Running: validate_agent_output.py"
          & $pythonExe @pyPrefix ".\scripts\validate_agent_output.py" 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Null
          if ($LASTEXITCODE -ne 0) {
            $overallExit = 1
            LogLine "ERROR: validate_agent_output.py failed (exit=$LASTEXITCODE)."
          } else {
            LogLine "OK: validate_agent_output.py passed."
          }
        }

        foreach ($name in @("requirements_status.md","requirements_status.jsonl","implemented_not_documented.md","milestone_summary.md","run_metadata.json")) {
          $src = Join-Path ".\AgentOutput" $name
          if (Test-Path $src) {
            Copy-Item -Force $src (Join-Path ".\Agentic AI Work\AgentOutput" $name)
          }
        }
      }
    }
  }
} else {
  LogLine "Skipping agentic scan (SkipAgenticScan=true)."
}

"=== AUDIT END: $(Get-Date -Format s) ===" | Add-Content -Encoding UTF8 $LogPath
Write-Host "Wrote audit log: $LogPath" -ForegroundColor Green
exit $overallExit

