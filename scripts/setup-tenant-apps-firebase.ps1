#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Automated Firebase app setup for tenant-specific mobile apps
.DESCRIPTION
    Creates Firebase apps for each tenant with proper bundle IDs and downloads config files
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$ProjectId = "rideoo-487904-18dff",
    
    [Parameter(Mandatory=$false)]
    [string]$ServiceAccountKey = "./google-service-account.json"
)

# Install Firebase CLI if not present
if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Firebase CLI..." -ForegroundColor Yellow
    npm install -g firebase-tools
}

# Login to Firebase
Write-Host "Logging into Firebase..." -ForegroundColor Yellow
firebase login --no-localhost

# Tenant configurations
$tenants = @(
    @{
        Name = "goldravenia"
        Domain = "goldravenia.com"
        TenantId = "a1b2c3d4-0001-4000-8000-000000000001"
        RiderBundleId = "com.goldravenia.rider"
        DriverBundleId = "com.goldravenia.driver"
        DisplayName = "GoldRavenia Rider"
        DriverDisplayName = "GoldRavenia Driver"
    },
    @{
        Name = "blackravenia"
        Domain = "blackravenia.com"
        TenantId = "a1b2c3d4-0002-4000-8000-000000000002"
        RiderBundleId = "com.blackravenia.rider"
        DriverBundleId = "com.blackravenia.driver"
        DisplayName = "BlackRavenia Rider"
        DriverDisplayName = "BlackRavenia Driver"
    }
)

# Create tenant-specific app directories
foreach ($tenant in $tenants) {
    $riderDir = "apps/rider-app-$($tenant.Name)"
    $driverDir = "apps/driver-app-$($tenant.Name)"
    
    Write-Host "Creating tenant-specific app directories..." -ForegroundColor Cyan
    Write-Host "  - $riderDir" -ForegroundColor Gray
    Write-Host "  - $driverDir" -ForegroundColor Gray
    
    # Copy template apps
    if (Test-Path "apps/rider-app-native") {
        Copy-Item -Recurse -Force "apps/rider-app-native" $riderDir
    }
    if (Test-Path "apps/driver-app-native") {
        Copy-Item -Recurse -Force "apps/driver-app-native" $driverDir
    }
}

# Setup Firebase apps for each tenant
foreach ($tenant in $tenants) {
    Write-Host "`n=== Setting up Firebase apps for $($tenant.Name) ===" -ForegroundColor Green
    
    $riderDir = "apps/rider-app-$($tenant.Name)"
    $driverDir = "apps/driver-app-$($tenant.Name)"
    
    # Update app.json files with tenant-specific bundle IDs
    $riderAppJson = Get-Content "$riderDir/app.json" | ConvertFrom-Json
    $riderAppJson.expo.name = $tenant.DisplayName
    $riderAppJson.expo.slug = "rider-app-$($tenant.Name)"
    $riderAppJson.expo.ios.bundleIdentifier = $tenant.RiderBundleId
    $riderAppJson.expo.android.package = $tenant.RiderBundleId
    $riderAppJson | ConvertTo-Json -Depth 10 | Set-Content "$riderDir/app.json"
    
    $driverAppJson = Get-Content "$driverDir/app.json" | ConvertFrom-Json
    $driverAppJson.expo.name = $tenant.DriverDisplayName
    $driverAppJson.expo.slug = "driver-app-$($tenant.Name)"
    $driverAppJson.expo.ios.bundleIdentifier = $tenant.DriverBundleId
    $driverAppJson.expo.android.package = $tenant.DriverBundleId
    $driverAppJson | ConvertTo-Json -Depth 10 | Set-Content "$driverDir/app.json"
    
    # Update eas.json with tenant-specific configuration
    $riderEasJson = Get-Content "$riderDir/eas.json" | ConvertFrom-Json
    $riderEasJson.build.preview.env."EXPO_PUBLIC_TENANT_ID" = $tenant.TenantId
    $riderEasJson.build.production.env."EXPO_PUBLIC_TENANT_ID" = $tenant.TenantId
    $riderEasJson | ConvertTo-Json -Depth 10 | Set-Content "$riderDir/eas.json"
    
    $driverEasJson = Get-Content "$driverDir/eas.json" | ConvertFrom-Json
    $driverEasJson.build.preview.env."EXPO_PUBLIC_TENANT_ID" = $tenant.TenantId
    $driverEasJson.build.production.env."EXPO_PUBLIC_TENANT_ID" = $tenant.TenantId
    $driverEasJson | ConvertTo-Json -Depth 10 | Set-Content "$driverDir/eas.json"
    
    Write-Host "✅ Updated app configurations for $($tenant.Name)" -ForegroundColor Green
    
    # Create Firebase apps using CLI
    try {
        Write-Host "Creating Firebase Android app for $($tenant.RiderBundleId)..." -ForegroundColor Yellow
        $riderAndroidResult = firebase apps:create android $tenant.RiderBundleId --display-name="$($tenant.DisplayName) Android" --project=$ProjectId
        Write-Host $riderAndroidResult
        
        Write-Host "Creating Firebase Android app for $($tenant.DriverBundleId)..." -ForegroundColor Yellow
        $driverAndroidResult = firebase apps:create android $tenant.DriverBundleId --display-name="$($tenant.DriverDisplayName) Android" --project=$ProjectId
        Write-Host $driverAndroidResult
        
        # Download config files
        Write-Host "Downloading Firebase config files..." -ForegroundColor Yellow
        firebase apps:sdkconfig android $riderDir --project=$ProjectId
        firebase apps:sdkconfig android $driverDir --project=$ProjectId
        
        Write-Host "✅ Firebase setup complete for $($tenant.Name)" -ForegroundColor Green
        
    } catch {
        Write-Host "❌ Error setting up Firebase for $($tenant.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== Summary ===" -ForegroundColor Magenta
Write-Host "Created tenant-specific apps:" -ForegroundColor White
foreach ($tenant in $tenants) {
    Write-Host "  - $($tenant.DisplayName): $($tenant.RiderBundleId)" -ForegroundColor Gray
    Write-Host "  - $($tenant.DriverDisplayName): $($tenant.DriverBundleId)" -ForegroundColor Gray
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Review downloaded Firebase config files" -ForegroundColor White
Write-Host "2. Test builds with: eas build --platform all --profile preview" -ForegroundColor White
Write-Host "3. Update branding assets for each tenant" -ForegroundColor White
