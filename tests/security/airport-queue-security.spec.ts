import { test, expect } from '@playwright/test';

test.describe('Airport Queue Security Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin-portal');
  });

  test('Multi-tenant data isolation', async ({ page }) => {
    // Setup tenant 1 authentication
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'tenant-1-token');
      localStorage.setItem('adminProfile', JSON.stringify({
        id: 'admin-1',
        tenantId: 'tenant-1',
        role: 'tenant_admin'
      }));
    });

    // Mock tenant 1 data
    await page.route('/api/airport-queue/geofences/tenant-1/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'geofence-1',
            tenant_id: 'tenant-1',
            zone_type: 'staging',
            zone_name: 'Tenant 1 Staging'
          }
        ])
      });
    });

    // Verify tenant 1 can only see their own data
    await page.goto('/admin-portal/geofence-management');
    await page.selectOption('[data-testid="airport-select"]', 'ORD');
    await page.click('[data-testid="load-geofences"]');

    await expect(page.locator('[data-testid="geofence-list"]')).toContainText('Tenant 1 Staging');

    // Switch to tenant 2 authentication
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'tenant-2-token');
      localStorage.setItem('adminProfile', JSON.stringify({
        id: 'admin-2',
        tenantId: 'tenant-2',
        role: 'tenant_admin'
      }));
    });

    // Mock tenant 2 data
    await page.route('/api/airport-queue/geofences/tenant-2/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'geofence-2',
            tenant_id: 'tenant-2',
            zone_type: 'staging',
            zone_name: 'Tenant 2 Staging'
          }
        ])
      });
    });

    // Verify tenant 2 cannot access tenant 1 data
    await page.goto('/admin-portal/geofence-management');
    await page.selectOption('[data-testid="airport-select"]', 'ORD');
    await page.click('[data-testid="load-geofences"]');

    await expect(page.locator('[data-testid="geofence-list"]')).toContainText('Tenant 2 Staging');
    await expect(page.locator('[data-testid="geofence-list"]')).not.toContainText('Tenant 1 Staging');

    // Test direct API access attempt
    const response = await page.evaluate(async () => {
      try {
        const result = await fetch('/api/airport-queue/geofences/tenant-1/ORD', {
          headers: { 'Authorization': 'Bearer tenant-2-token' }
        });
        return {
          status: result.status,
          data: await result.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(response.status).toBe(403); // Forbidden
    expect(response.data.error).toContain('Unauthorized access');
  });

  test('Authentication and authorization', async ({ page }) => {
    // Test unauthorized access
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
      localStorage.removeItem('adminProfile');
    });

    await page.goto('/admin-portal/geofence-management');
    
    // Should redirect to login
    await expect(page).toHaveURL('/admin-portal/login');
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();

    // Test invalid token
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'invalid-token');
    });

    await page.goto('/admin-portal/geofence-management');
    
    // Should redirect to login again
    await expect(page).toHaveURL('/admin-portal/login');

    // Test valid authentication but insufficient permissions
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'valid-token');
      localStorage.setItem('adminProfile', JSON.stringify({
        id: 'admin-1',
        tenantId: 'tenant-1',
        role: 'viewer' // Read-only role
      }));
    });

    // Mock authorization check
    await page.route('/api/admin/check-permissions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          canRead: true,
          canWrite: false,
          canDelete: false
        })
      });
    });

    await page.goto('/admin-portal/geofence-management');
    
    // Should be able to view but not create/edit
    await expect(page.locator('[data-testid="geofence-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-geofence"]')).toBeDisabled();
    await expect(page.locator('[data-testid="edit-geofence"]')).toBeDisabled();
    await expect(page.locator('[data-testid="delete-geofence"]')).toBeDisabled();
  });

  test('Input validation and sanitization', async ({ page }) => {
    // Setup admin authentication
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'admin-token');
      localStorage.setItem('adminProfile', JSON.stringify({
        id: 'admin-1',
        tenantId: 'tenant-1',
        role: 'tenant_admin'
      }));
    });

    await page.goto('/admin-portal/geofence-management');
    await page.click('[data-testid="create-geofence"]');

    // Test XSS injection attempts
    await page.fill('[data-testid="zone-name"]', '<script>alert("XSS")</script>');
    await page.fill('[data-testid="center-lat"]', '41.9742');
    await page.fill('[data-testid="center-lng"]', '-87.9073');
    await page.fill('[data-testid="radius"]', '500');
    await page.click('[data-testid="save-geofence"]');

    // Should sanitize input and not execute script
    await expect(page.locator('[data-testid="zone-name-display"]')).not.toContainText('<script>');
    await expect(page.locator('[data-testid="zone-name-display"]')).toContainText('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');

    // Test SQL injection attempts
    await page.fill('[data-testid="zone-name"]', "'; DROP TABLE geofences; --");
    await page.click('[data-testid="save-geofence"]');

    // Should handle SQL injection gracefully
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();

    // Test invalid coordinate values
    await page.fill('[data-testid="center-lat"]', '999');
    await page.fill('[data-testid="center-lng"]', '-999');
    await page.fill('[data-testid="radius"]', '-100');
    await page.click('[data-testid="save-geofence"]');

    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Invalid coordinates');
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('Invalid radius');
  });

  test('Rate limiting and DoS protection', async ({ page }) => {
    // Setup authentication
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'admin-token');
      localStorage.setItem('adminProfile', JSON.stringify({
        id: 'admin-1',
        tenantId: 'tenant-1',
        role: 'tenant_admin'
      }));
    });

    // Mock rate limiting
    let requestCount = 0;
    await page.route('/api/airport-queue/geofences/*', async (route) => {
      requestCount++;
      if (requestCount > 10) {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter: 60
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    // Make rapid requests
    const requests = [];
    for (let i = 0; i < 15; i++) {
      requests.push(
        page.evaluate(() => {
          return fetch('/api/airport-queue/geofences/tenant-1/ORD');
        })
      );
    }

    const results = await Promise.allSettled(requests);
    const rateLimitedRequests = results.filter(r => 
      r.status === 'fulfilled' && r.value.status === 429
    );

    expect(rateLimitedRequests).toHaveLength(5); // Last 5 requests should be rate limited

    // Test retry-after header
    const rateLimitedResponse = await page.evaluate(async () => {
      const response = await fetch('/api/airport-queue/geofences/tenant-1/ORD');
      return {
        status: response.status,
        retryAfter: response.headers.get('Retry-After')
      };
    });

    expect(rateLimitedResponse.status).toBe(429);
    expect(rateLimitedResponse.retryAfter).toBe('60');
  });

  test('Data access patterns and privilege escalation', async ({ page }) => {
    // Setup driver authentication (lower privilege)
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'driver-token');
      localStorage.setItem('driverProfile', JSON.stringify({
        id: 'driver-1',
        tenantId: 'tenant-1',
        role: 'driver'
      }));
    });

    // Test driver accessing admin endpoints
    const adminAccessAttempts = [
      '/api/airport-queue/geofences/tenant-1/ORD',
      '/api/airport-queue/form-queue/tenant-1/ORD/staging',
      '/api/airport-queue/setup-default-geofences/tenant-1/ORD'
    ];

    for (const endpoint of adminAccessAttempts) {
      const response = await page.evaluate(async (url) => {
        try {
          const result = await fetch(url, { method: 'POST' });
          return {
            status: result.status,
            url: url
          };
        } catch (error) {
          return { error: error.message, url: url };
        }
      }, endpoint);

      expect(response.status).toBe(403); // All should be forbidden
    }

    // Test privilege escalation attempt
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'driver-token');
      localStorage.setItem('adminProfile', JSON.stringify({
        id: 'driver-1', // Driver ID with admin profile
        tenantId: 'tenant-1',
        role: 'tenant_admin' // Admin role
      }));
    });

    const escalationAttempt = await page.evaluate(async () => {
      try {
        const result = await fetch('/api/airport-queue/geofences/tenant-1/ORD', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer driver-token',
            'X-User-Role': 'tenant_admin'
          }
        });
        return {
          status: result.status,
          data: await result.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(escalationAttempt.status).toBe(403);
    expect(escalationAttempt.data.error).toContain('Invalid token-role combination');
  });

  test('Cross-site request forgery (CSRF) protection', async ({ page }) => {
    // Setup admin authentication
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'admin-token');
      localStorage.setItem('adminProfile', JSON.stringify({
        id: 'admin-1',
        tenantId: 'tenant-1',
        role: 'tenant_admin'
      }));
    });

    // Mock CSRF protection
    await page.route('/api/airport-queue/geofences/*', async (route) => {
      const request = route.request();
      const csrfToken = request.headers()['x-csrf-token'];
      
      if (!csrfToken || csrfToken === 'invalid') {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Invalid CSRF token'
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      }
    });

    // Test request without CSRF token
    const noTokenRequest = await page.evaluate(async () => {
      try {
        const result = await fetch('/api/airport-queue/geofences/tenant-1/ORD', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zoneType: 'staging',
            zoneName: 'Test Zone'
          })
        });
        return {
          status: result.status,
          data: await result.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(noTokenRequest.status).toBe(403);
    expect(noTokenRequest.data.error).toContain('Invalid CSRF token');

    // Test request with invalid CSRF token
    const invalidTokenRequest = await page.evaluate(async () => {
      try {
        const result = await fetch('/api/airport-queue/geofences/tenant-1/ORD', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'invalid'
          },
          body: JSON.stringify({
            zoneType: 'staging',
            zoneName: 'Test Zone'
          })
        });
        return {
          status: result.status,
          data: await result.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(invalidTokenRequest.status).toBe(403);
    expect(invalidTokenRequest.data.error).toContain('Invalid CSRF token');

    // Test request with valid CSRF token
    const validTokenRequest = await page.evaluate(async () => {
      try {
        const result = await fetch('/api/airport-queue/geofences/tenant-1/ORD', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': 'valid-csrf-token'
          },
          body: JSON.stringify({
            zoneType: 'staging',
            zoneName: 'Test Zone'
          })
        });
        return {
          status: result.status,
          data: await result.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(validTokenRequest.status).toBe(200);
    expect(validTokenRequest.data.success).toBe(true);
  });

  test('Data leakage prevention', async ({ page }) => {
    // Setup admin authentication
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'admin-token');
      localStorage.setItem('adminProfile', JSON.stringify({
        id: 'admin-1',
        tenantId: 'tenant-1',
        role: 'tenant_admin'
      }));
    });

    // Mock API responses with sensitive data
    await page.route('/api/airport-queue/drivers-in-zone/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            driver_id: 'driver-1',
            driver_name: 'John Driver',
            driver_email: 'john@example.com', // Sensitive data
            driver_phone: '+1-555-123-4567', // Sensitive data
            vehicle_make: 'Toyota',
            vehicle_model: 'Camry'
          }
        ])
      });
    });

    // Access drivers in zone
    await page.goto('/admin-portal/queue-management');
    await page.selectOption('[data-testid="zone-select"]', 'staging');
    await page.click('[data-testid="view-drivers"]');

    // Verify sensitive data is masked or omitted
    await expect(page.locator('[data-testid="driver-list"]')).toContainText('John Driver');
    await expect(page.locator('[data-testid="driver-list"]')).not.toContainText('john@example.com');
    await expect(page.locator('[data-testid="driver-list"]')).not.toContainText('+1-555-123-4567');
    
    // Check if data is properly masked
    await expect(page.locator('[data-testid="driver-email"]')).toContainText('***@example.com');
    await expect(page.locator('[data-testid="driver-phone"]')).toContainText('***-***-****');

    // Test API response doesn't leak sensitive data
    const apiResponse = await page.evaluate(async () => {
      try {
        const result = await fetch('/api/airport-queue/drivers-in-zone/tenant-1/ORD/staging');
        const data = await result.json();
        return {
          status: result.status,
          hasEmail: data[0]?.driver_email?.includes('@'),
          hasPhone: data[0]?.driver_phone?.includes('+')
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    expect(apiResponse.status).toBe(200);
    expect(apiResponse.hasEmail).toBe(false); // Email should be masked
    expect(apiResponse.hasPhone).toBe(false); // Phone should be masked
  });
});
