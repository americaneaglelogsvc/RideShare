import { test, expect } from '@playwright/test';

test.describe('Geofence Management Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Mock admin authentication
    await page.goto('/admin-portal');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'mock-admin-token');
      localStorage.setItem('adminProfile', JSON.stringify({
        id: 'admin-123',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'tenant_admin',
        tenantId: 'tenant-1'
      }));
    });

    // Mock API responses
    await page.route('/api/admin/tenants/tenant-1/airports', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'airport-1', code: 'ORD', name: "O'Hare International Airport" },
          { id: 'airport-2', code: 'MDW', name: 'Midway International Airport' }
        ])
      });
    });
  });

  test('Create and manage airport geofences', async ({ page }) => {
    // Navigate to geofence management
    await page.click('[data-testid="geofence-management"]');
    await expect(page.locator('[data-testid="geofence-dashboard"]')).toBeVisible();

    // Select airport
    await page.selectOption('[data-testid="airport-select"]', 'ORD');
    await page.click('[data-testid="load-geofences"]');

    // Create new geofence zone
    await page.click('[data-testid="create-geofence"]');
    await expect(page.locator('[data-testid="geofence-form"]')).toBeVisible();

    // Fill geofence details
    await page.selectOption('[data-testid="zone-type"]', 'staging');
    await page.fill('[data-testid="zone-name"]', 'Main Staging Area');
    await page.selectOption('[data-testid="geofence-type"]', 'circle');
    
    // Set circle parameters
    await page.fill('[data-testid="center-lat"]', '41.9742');
    await page.fill('[data-testid="center-lng"]', '-87.9073');
    await page.fill('[data-testid="radius"]', '1609'); // 1 mile in meters
    
    // Enable geofence
    await page.check('[data-testid="is-active"]');

    // Save geofence
    await page.click('[data-testid="save-geofence"]');
    await expect(page.locator('[data-testid="geofence-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="geofence-list"]')).toContainText('Main Staging Area');

    // Verify geofence on map
    await expect(page.locator('[data-testid="geofence-map"]')).toBeVisible();
    await expect(page.locator('[data-testid="circle-geofence"]')).toBeVisible();

    // Create polygon geofence
    await page.click('[data-testid="create-geofence"]');
    await page.selectOption('[data-testid="zone-type"]', 'pickup');
    await page.fill('[data-testid="zone-name"]', 'Terminal 1 Pickup');
    await page.selectOption('[data-testid="geofence-type"]', 'polygon');

    // Draw polygon points
    await page.click('[data-testid="map-canvas"]'); // First point
    await page.click('[data-testid="map-canvas"]'); // Second point
    await page.click('[data-testid="map-canvas"]'); // Third point
    await page.click('[data-testid="map-canvas"]'); // Fourth point
    await page.click('[data-testid="close-polygon"]');

    await page.click('[data-testid="save-geofence"]');
    await expect(page.locator('[data-testid="polygon-geofence"]')).toBeVisible();
  });

  test('Update and delete geofence zones', async ({ page }) => {
    // Load existing geofences
    await page.click('[data-testid="geofence-management"]');
    await page.selectOption('[data-testid="airport-select"]', 'ORD');
    await page.click('[data-testid="load-geofences"]');

    // Mock existing geofence
    await page.route('/api/airport-queue/geofences/tenant-1/ORD', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'geofence-1',
            zone_type: 'staging',
            zone_name: 'Main Staging Area',
            coordinates: { type: 'circle', center: [-87.9073, 41.9742], radius: 1609 },
            is_active: true
          }
        ])
      });
    });

    // Edit existing geofence
    await page.hover('[data-testid="geofence-item-1"]');
    await page.click('[data-testid="edit-geofence-1"]');
    await expect(page.locator('[data-testid="edit-geofence-form"]')).toBeVisible();

    // Update geofence properties
    await page.fill('[data-testid="zone-name"]', 'Updated Staging Area');
    await page.fill('[data-testid="radius"]', '2414'); // 1.5 miles
    await page.uncheck('[data-testid="is-active"]');

    await page.click('[data-testid="update-geofence"]');
    await expect(page.locator('[data-testid="update-success"]')).toBeVisible();

    // Verify geofence is deactivated
    await expect(page.locator('[data-testid="geofence-1"]')).toContainText('Inactive');

    // Delete geofence
    await page.hover('[data-testid="geofence-item-1"]');
    await page.click('[data-testid="delete-geofence-1"]');
    await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
    await page.click('[data-testid="confirm-delete"]');

    await expect(page.locator('[data-testid="delete-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="geofence-list"]')).not.toContainText('Updated Staging Area');
  });

  test('Test geofence detection with driver simulation', async ({ page }) => {
    // Setup geofences
    await page.click('[data-testid="geofence-management"]');
    await page.selectOption('[data-testid="airport-select"]', 'ORD');
    await page.click('[data-testid="load-geofences"]');

    // Create test geofence
    await page.click('[data-testid="create-geofence"]');
    await page.selectOption('[data-testid="zone-type"]', 'staging');
    await page.fill('[data-testid="zone-name"]', 'Test Staging Zone');
    await page.selectOption('[data-testid="geofence-type"]', 'circle');
    await page.fill('[data-testid="center-lat"]', '41.9742');
    await page.fill('[data-testid="center-lng"]', '-87.9073');
    await page.fill('[data-testid="radius"]', '500');
    await page.check('[data-testid="is-active"]');
    await page.click('[data-testid="save-geofence"]');

    // Navigate to geofence testing
    await page.click('[data-testid="geofence-testing"]');
    await expect(page.locator('[data-testid="testing-interface"]')).toBeVisible();

    // Test driver location inside geofence
    await page.fill('[data-testid="test-lat"]', '41.9742');
    await page.fill('[data-testid="test-lng"]', '-87.9073');
    await page.click('[data-testid="test-location"]');

    await expect(page.locator('[data-testid="detection-result"]')).toContainText('Inside Staging Zone');
    await expect(page.locator('[data-testid="zone-detected"]')).toContainText('Test Staging Zone');

    // Test driver location outside geofence
    await page.fill('[data-testid="test-lat"]', '41.9842');
    await page.fill('[data-testid="test-lng"]', '-87.9173');
    await page.click('[data-testid="test-location"]');

    await expect(page.locator('[data-testid="detection-result"]')).toContainText('Outside All Zones');
    await expect(page.locator('[data-testid="no-zone-detected"]')).toBeVisible();

    // Test boundary conditions
    await page.fill('[data-testid="test-lat"]', '41.9742');
    await page.fill('[data-testid="test-lng"]', '-87.9023'); // Edge of circle
    await page.click('[data-testid="test-location"]');

    await expect(page.locator('[data-testid="detection-result"]')).toContainText('Inside Staging Zone');
    await expect(page.locator('[data-testid="boundary-detection"]')).toBeVisible();

    // Visual verification on map
    await expect(page.locator('[data-testid="test-marker"]')).toBeVisible();
    await expect(page.locator('[data-testid="geofence-highlight"]')).toBeVisible();
  });

  test('Automatic queue formation from zones', async ({ page }) => {
    // Setup multiple geofences
    await page.click('[data-testid="geofence-management"]');
    await page.selectOption('[data-testid="airport-select"]', 'ORD');
    await page.click('[data-testid="setup-default-geofences"]');
    await page.click('[data-testid="confirm-setup"]');

    await expect(page.locator('[data-testid="default-geofences-created"]')).toBeVisible();

    // Navigate to queue management
    await page.click('[data-testid="queue-management"]');
    await expect(page.locator('[data-testid="queue-dashboard"]')).toBeVisible();

    // Mock drivers in different zones
    await page.route('/api/airport-queue/drivers-in-zone/tenant-1/ORD/staging', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            driver_id: 'driver-1',
            driver_name: 'John Driver',
            vehicle_type: 'sedan',
            entered_at: new Date().toISOString()
          },
          {
            driver_id: 'driver-2',
            driver_name: 'Jane Driver',
            vehicle_type: 'suv',
            entered_at: new Date().toISOString()
          }
        ])
      });
    });

    // View drivers in staging zone
    await page.selectOption('[data-testid="zone-select"]', 'staging');
    await page.click('[data-testid="view-drivers"]');

    await expect(page.locator('[data-testid="drivers-in-zone"]')).toBeVisible();
    await expect(page.locator('[data-testid="driver-1"]')).toContainText('John Driver');
    await expect(page.locator('[data-testid="driver-2"]')).toContainText('Jane Driver');

    // Form queue from staging zone
    await page.click('[data-testid="form-queue-from-zone"]');
    await expect(page.locator('[data-testid="queue-formation-modal"]')).toBeVisible();
    await page.click('[data-testid="confirm-queue-formation"]');

    await expect(page.locator('[data-testid="queue-formation-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="drivers-added"]')).toContainText('2 drivers added to queue');

    // Verify queue status
    await page.click('[data-testid="view-queue-status"]');
    await expect(page.locator('[data-testid="active-queue"]')).toBeVisible();
    await expect(page.locator('[data-testid="queue-position-1"]')).toContainText('John Driver');
    await expect(page.locator("[data-testid='queue-position-2']").toContainText('Jane Driver');
  });

  test('Zone flow analytics and reporting', async ({ page }) => {
    // Navigate to analytics
    await page.click('[data-testid="analytics-dashboard"]');
    await page.click('[data-testid="zone-flow-analytics"]');

    // Set date range
    await page.fill('[data-testid="start-date"]', '2024-01-01');
    await page.fill('[data-testid="end-date"]', '2024-01-31');
    await page.selectOption('[data-testid="airport-select"]', 'ORD');
    await page.click('[data-testid="generate-report"]');

    // Mock analytics data
    await page.route('/api/airport-queue/zone-flow-analytics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            zone_type: 'approach',
            total_transitions: 1250,
            average_duration_seconds: 720,
            efficiency_rate: 87.5,
            peak_hour: '14:00'
          },
          {
            zone_type: 'staging',
            total_transitions: 980,
            average_duration_seconds: 480,
            efficiency_rate: 92.3,
            peak_hour: '15:00'
          },
          {
            zone_type: 'active',
            total_transitions: 890,
            average_duration_seconds: 300,
            efficiency_rate: 94.1,
            peak_hour: '16:00'
          },
          {
            zone_type: 'pickup',
            total_transitions: 890,
            average_duration_seconds: 120,
            efficiency_rate: 96.8,
            peak_hour: '16:30'
          }
        ])
      });
    });

    // Verify analytics dashboard
    await expect(page.locator('[data-testid="zone-flow-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="transition-summary"]')).toContainText('4,010 total transitions');

    // Verify zone-specific metrics
    await expect(page.locator('[data-testid="approach-metrics"]')).toContainText('1,250 transitions');
    await expect(page.locator('[data-testid="staging-metrics"]')).toContainText('980 transitions');
    await expect(page.locator('[data-testid="active-metrics"]')).toContainText('890 transitions');
    await expect(page.locator('[data-testid="pickup-metrics"]')).toContainText('890 transitions');

    // Verify efficiency rates
    await expect(page.locator('[data-testid="staging-efficiency"]')).toContainText('92.3%');
    await expect(page.locator('[data-testid="active-efficiency"]')).toContainText('94.1%');
    await expect(page.locator('[data-testid="pickup-efficiency"]')).toContainText('96.8%');

    // Test detailed zone analysis
    await page.click('[data-testid="view-staging-details"]');
    await expect(page.locator('[data-testid="zone-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="average-stay-time"]')).toContainText('8 minutes');
    await expect(page.locator('[data-testid="peak-activity"]')).toContainText('3:00 PM');

    // Export analytics report
    await page.click('[data-testid="export-report"]');
    await page.selectOption('[data-testid="export-format"]', 'csv');
    await page.click('[data-testid="download-report"]');

    // Verify download initiated
    const downloadPromise = page.waitForEvent('download');
    await expect(downloadPromise).resolves.toBeDefined();
  });

  test('Multi-tenant geofence isolation', async ({ page }) => {
    // Setup tenant switching
    await page.click('[data-testid="tenant-selector"]');
    await page.selectOption('[data-testid="tenant-select"]', 'tenant-1');
    await page.click('[data-testid="switch-tenant"]');

    // Create geofence for tenant 1
    await page.click('[data-testid="geofence-management"]');
    await page.selectOption('[data-testid="airport-select"]', 'ORD');
    await page.click('[data-testid="create-geofence"]');
    await page.selectOption('[data-testid="zone-type"]', 'staging');
    await page.fill('[data-testid="zone-name"]', 'Tenant 1 Staging');
    await page.click('[data-testid="save-geofence"]');

    // Switch to tenant 2
    await page.click('[data-testid="tenant-selector"]');
    await page.selectOption('[data-testid="tenant-select"]', 'tenant-2');
    await page.click('[data-testid="switch-tenant"]');

    // Verify tenant 1 geofence is not visible
    await page.click('[data-testid="geofence-management"]');
    await page.selectOption('[data-testid="airport-select"]', 'ORD');
    await page.click('[data-testid="load-geofences"]');

    await expect(page.locator('[data-testid="geofence-list"]')).not.toContainText('Tenant 1 Staging');

    // Create geofence for tenant 2
    await page.click('[data-testid="create-geofence"]');
    await page.selectOption('[data-testid="zone-type"]', 'staging');
    await page.fill('[data-testid="zone-name"]', 'Tenant 2 Staging');
    await page.click('[data-testid="save-geofence"]');

    // Verify both geofences exist in their respective tenants
    await page.click('[data-testid="tenant-selector"]');
    await page.selectOption('[data-testid="tenant-select"]', 'tenant-1');
    await page.click('[data-testid="switch-tenant"]');
    await page.click('[data-testid="load-geofences"]');

    await expect(page.locator('[data-testid="geofence-list"]')).toContainText('Tenant 1 Staging');
    await expect(page.locator('[data-testid="geofence-list"]')).not.toContainText('Tenant 2 Staging');

    // Test cross-tenant isolation
    await page.click('[data-testid="tenant-selector"]');
    await page.selectOption('[data-testid="tenant-select"]', 'tenant-2');
    await page.click('[data-testid="switch-tenant"]');
    await page.click('[data-testid="load-geofences"]');

    await expect(page.locator('[data-testid="geofence-list"]')).toContainText('Tenant 2 Staging');
    await expect(page.locator('[data-testid="geofence-list"]')).not.toContainText('Tenant 1 Staging');
  });
});
