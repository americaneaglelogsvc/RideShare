param(
  [string]$Domain = "urwaydispatch.com",
  [string]$Project = "rideoo-487904",
  [string]$Region = "us-central1",
  [int]$IntervalSeconds = 300
)

$ErrorActionPreference = "Continue"

Write-Host "[monitor-ssl] Watching Cloud Run DomainMapping SSL for $Domain every $IntervalSeconds seconds..." -ForegroundColor Cyan

while ($true) {
  $ts = Get-Date -Format o
  $y = gcloud beta run domain-mappings describe --domain $Domain --region $Region --project $Project 2>$null
  if (-not $y) {
    Write-Host "[monitor-ssl] $ts Unable to fetch domain-mapping" -ForegroundColor Yellow
    Start-Sleep -Seconds $IntervalSeconds
    continue
  }

  $ready = ($y | Select-String -Pattern "type: Ready" -Context 0,2 | ForEach-Object { $_.Context.PostContext } | Select-Object -First 1)
  $cert = ($y | Select-String -Pattern "type: CertificateProvisioned" -Context 0,2 | ForEach-Object { $_.Context.PostContext } | Select-Object -First 1)

  $readyTrue = $y -match "type: Ready[\s\S]*?status: 'True'"
  $certTrue = $y -match "type: CertificateProvisioned[\s\S]*?status: 'True'"

  Write-Host "[monitor-ssl] $ts Ready=$readyTrue CertificateProvisioned=$certTrue" -ForegroundColor Gray

  if ($readyTrue -and $certTrue) {
    Write-Host "[monitor-ssl] SSL READY for $Domain" -ForegroundColor Green
    break
  }

  Start-Sleep -Seconds $IntervalSeconds
}
