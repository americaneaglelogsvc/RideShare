param(
  [string]$Domain = "api.urwaydispatch.com",
  [string]$ExpectedCnameTarget = "ghs.googlehosted.com",
  [int]$IntervalSeconds = 300
)

$ErrorActionPreference = "Continue"

function Get-CnameTarget([string]$d) {
  try {
    $res = Resolve-DnsName -Name $d -Type CNAME -ErrorAction Stop
    $nameHost = ($res | Select-Object -First 1 -ExpandProperty NameHost)
    if ($nameHost) {
      return $nameHost.TrimEnd('.')
    }
    return $null
  } catch {
    return $null
  }
}

Write-Host "[monitor-dns] Watching DNS for $Domain every $IntervalSeconds seconds..." -ForegroundColor Cyan
Write-Host "[monitor-dns] Expected CNAME target: $ExpectedCnameTarget" -ForegroundColor Cyan

while ($true) {
  $ts = Get-Date -Format o
  $target = Get-CnameTarget $Domain

  if ($target) {
    Write-Host "[monitor-dns] $ts CNAME: $Domain -> $target" -ForegroundColor Gray
    if ($target -ieq $ExpectedCnameTarget) {
      Write-Host "[monitor-dns] RESOLVED: $Domain now points to $ExpectedCnameTarget" -ForegroundColor Green
      Write-Host "[monitor-dns] You can now wait for Google-managed SSL to move to READY." -ForegroundColor Green
      break
    }
  } else {
    Write-Host "[monitor-dns] $ts No CNAME result yet for $Domain" -ForegroundColor Yellow
  }

  Start-Sleep -Seconds $IntervalSeconds
}
