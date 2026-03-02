$ErrorActionPreference = 'Stop'

$ProjectId = 'rideoo-487904'
$Region = 'us-central1'

$RiderService = 'urway-rider'
$DriverService = 'urway-driver'

$RiderDomain = 'rider.urwaydispatch.com'
$DriverDomain = 'driver.urwaydispatch.com'

Write-Host '--- Rider/Driver Domain Mapping Commands (DO NOT EXECUTE UNTIL GO) ---'
Write-Host ''
Write-Host '# Build images (bakes VITE_API_BASE_URL into Vite bundle via Docker build-arg)'
Write-Host "gcloud builds submit --project $ProjectId --config cloudbuild.rider-app.yaml apps/rider-app"
Write-Host "gcloud builds submit --project $ProjectId --config cloudbuild.driver-app.yaml apps/driver-app"
Write-Host ''
Write-Host '# Cloud Run deploy'
Write-Host "gcloud run deploy $RiderService --project $ProjectId --region $Region --image gcr.io/$ProjectId/urway-rider:latest --allow-unauthenticated --port 8080"
Write-Host "gcloud run deploy $DriverService --project $ProjectId --region $Region --image gcr.io/$ProjectId/urway-driver:latest --allow-unauthenticated --port 8080"
Write-Host ''
Write-Host '# Domain mappings (create)'
Write-Host "gcloud beta run domain-mappings create --project $ProjectId --region $Region --service $RiderService --domain $RiderDomain"
Write-Host "gcloud beta run domain-mappings create --project $ProjectId --region $Region --service $DriverService --domain $DriverDomain"
Write-Host ''
Write-Host '# Domain mapping status (describe)'
Write-Host "gcloud beta run domain-mappings describe --project $ProjectId --region $Region --domain $RiderDomain"
Write-Host "gcloud beta run domain-mappings describe --project $ProjectId --region $Region --domain $DriverDomain"
Write-Host ''
Write-Host '# DNS records to set at registrar will be shown in the domain-mappings describe output under status.resourceRecords.'
