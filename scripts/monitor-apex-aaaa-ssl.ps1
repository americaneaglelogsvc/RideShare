$ErrorActionPreference = 'Continue'

$Domain = 'urwaydispatch.com'
$AuthoritativeServerIp = '97.74.109.20' # ns39.domaincontrol.com (A)
$ExpectedAAAA = @(
  '2001:4860:4802:32::15',
  '2001:4860:4802:34::15',
  '2001:4860:4802:36::15',
  '2001:4860:4802:38::15'
)

$ProjectId = 'rideoo-487904'
$Region = 'us-central1'

while ($true) {
  $ts = (Get-Date).ToString('s')

  $ips = @(
    Resolve-DnsName -Name $Domain -Type AAAA -Server $AuthoritativeServerIp -ErrorAction SilentlyContinue |
      ForEach-Object { $_.IPAddress }
  ) | Where-Object { $_ }

  $found = @($ExpectedAAAA | Where-Object { $ips -contains $_ })

  Write-Host "[$ts] AAAA @ns39($AuthoritativeServerIp): $($found.Count)/$($ExpectedAAAA.Count) :: $($found -join ', ')"

  if ($found.Count -eq $ExpectedAAAA.Count) {
    Write-Host "[$ts] AAAA propagation confirmed. Waiting 5 minutes for CA cache..."
    Start-Sleep -Seconds 300

    Write-Host "[$((Get-Date).ToString('s'))] DomainMapping describe ($Domain)..."
    gcloud beta run domain-mappings describe --domain $Domain --region $Region --project $ProjectId

    Write-Host "[$((Get-Date).ToString('s'))] Curl handshake (headers) https://$Domain ..."
    curl.exe -I "https://$Domain"

    break
  }

  Start-Sleep -Seconds 120
}
