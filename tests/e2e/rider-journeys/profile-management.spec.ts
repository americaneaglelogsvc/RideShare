import { test, expect } from '@playwright/test';

test.describe('Profile Management Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/rider-app');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'mock-rider-token');
      localStorage.setItem('riderProfile', JSON.stringify({
        id: 'rider-123',
        name: 'Test Rider',
        email: 'rider@test.com',
        phone: '+1-555-123-4567'
      }));
    });

    // Mock profile data
    await page.route('/api/rider/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'rider-123',
          name: 'Test Rider',
          email: 'rider@test.com',
          phone: '+1-555-123-4567',
          preferredVehicle: 'black_sedan',
          savedLocations: [
            { name: 'Home', address: '123 N Michigan Ave, Chicago, IL' },
            { name: 'Work', address: '500 N Wells St, Chicago, IL' }
          ],
          paymentMethods: [
            { id: 'pm-1', type: 'card', last4: '1234', brand: 'visa', isDefault: true },
            { id: 'pm-2', type: 'card', last4: '5678', brand: 'mastercard', isDefault: false }
          ],
          stats: {
            totalTrips: 47,
            totalSpent: 1250.75,
            averageRating: 4.9,
            memberSince: '2023-06-15'
          }
        })
      });
    });
  });

  test('Update personal information', async ({ page }) => {
    // Navigate to profile
    await page.click('[data-testid="profile-button"]');
    await expect(page).toHaveURL('/profile');

    // Verify current profile data
    await expect(page.locator('[data-testid="profile-name"]')).toContainText('Test Rider');
    await expect(page.locator('[data-testid="profile-email"]')).toContainText('rider@test.com');
    await expect(page.locator('[data-testid="profile-phone"]')).toContainText('+1-555-123-4567');

    // Edit profile
    await page.click('[data-testid="edit-profile-button"]');
    await expect(page.locator('[data-testid="profile-form"]')).toBeVisible();

    // Update name
    await page.fill('[data-testid="name-input"]', 'Test Rider Updated');
    await page.fill('[data-testid="email-input"]', 'rider.updated@test.com');
    await page.fill('[data-testid="phone-input"]', '+1-555-987-6543');

    // Update preferences
    await page.selectOption('[data-testid="preferred-vehicle"]', 'suv');
    await page.check('[data-testid="notifications-enabled"]');
    await page.check('[data-testid="marketing-emails"]');

    // Save changes
    await page.click('[data-testid="save-profile"]');
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="save-success"]')).toContainText('Profile updated successfully');

    // Verify updated profile
    await expect(page.locator('[data-testid="profile-name"]')).toContainText('Test Rider Updated');
    await expect(page.locator('[data-testid="profile-email"]')).toContainText('rider.updated@test.com');
    await expect(page.locator('[data-testid="profile-phone"]')).toContainText('+1-555-987-6543');
  });

  test('Add/remove payment methods', async ({ page }) => {
    await page.click('[data-testid="profile-button"]');
    await expect(page.locator('[data-testid="payment-methods-section"]')).toBeVisible();

    // Verify existing payment methods
    await expect(page.locator('[data-testid="payment-method-item"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="payment-method-1"]')).toContainText('Visa •••• 1234');
    await expect(page.locator('[data-testid="payment-method-2"]')).toContainText('Mastercard •••• 5678');

    // Add new payment method
    await page.click('[data-testid="add-payment-method"]');
    await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();

    // Fill card details
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/26');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="card-holder"]', 'Test Rider');
    await page.fill('[data-testid="billing-zip"]', '60601');

    // Set as default
    await page.check('[data-testid="set-as-default"]');

    // Save payment method
    await page.click('[data-testid="save-payment-method"]');
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();

    // Verify new payment method added
    await expect(page.locator('[data-testid="payment-method-item"]')).toHaveCount(3);
    await expect(page.locator('[data-testid="payment-method-3"]')).toContainText('Visa •••• 4242');
    await expect(page.locator('[data-testid="default-badge"]')).toBeVisible();

    // Remove a payment method
    await page.hover('[data-testid="payment-method-2"]');
    await page.click('[data-testid="remove-payment-method-2"]');
    await expect(page.locator="[data-testid='confirm-remove']").toBeVisible();
    await page.click('[data-testid="confirm-remove"]');
    await expect(page.locator('[data-testid="payment-method-item"]')).toHaveCount(2);
  });

  test('Manage saved locations', async ({ page }) => {
    await page.click('[data-testid="profile-button"]');
    await page.click('[data-testid="saved-locations-section"]');

    // Verify existing saved locations
    await expect(page.locator('[data-testid="saved-location-item"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="location-home"]')).toContainText('Home');
    await expect(page.locator="[data-testid='location-home']").toContainText('123 N Michigan Ave');

    // Add new saved location
    await page.click('[data-testid="add-location"]');
    await expect(page.locator('[data-testid="location-form"]')).toBeVisible();

    await page.fill('[data-testid="location-name"]', 'Gym');
    await page.fill('[data-testid="location-address"]', '1000 N Lake Shore Dr, Chicago, IL');
    await page.click('[data-testid="save-location"]');

    // Verify new location added
    await expect(page.locator('[data-testid="saved-location-item"]')).toHaveCount(3);
    await expect(page.locator('[data-testid="location-gym"]')).toContainText('Gym');
    await expect(page.locator="[data-testid='location-gym']").toContainText('1000 N Lake Shore Dr');

    // Edit existing location
    await page.hover('[data-testid="location-work"]');
    await page.click('[data-testid="edit-location-work"]');
    await page.fill('[data-testid="location-name"]', 'Office');
    await page.fill('[data-testid="location-address"]', '505 N Wells St, Chicago, IL');
    await page.click('[data-testid="save-location"]');

    // Verify location updated
    await expect(page.locator('[data-testid="location-office"]')).toContainText('Office');
    await expect(page.locator="[data-testid='location-office']").toContainText('505 N Wells St');

    // Delete location
    await page.hover('[data-testid="location-gym"]');
    await page.click('[data-testid="delete-location-gym"]');
    await page.click('[data-testid="confirm-delete"]');
    await expect(page.locator('[data-testid="saved-location-item"]')).toHaveCount(2);
  });

  test('View account statistics', async ({ page }) => {
    await page.click('[data-testid="profile-button"]');
    await expect(page.locator('[data-testid="account-stats"]')).toBeVisible();

    // Verify statistics display
    await expect(page.locator('[data-testid="total-trips"]')).toContainText('47');
    await expect(page.locator('[data-testid="total-spent"]')).toContainText('$1,250.75');
    await expect(page.locator('[data-testid="average-rating"]')).toContainText('4.9');
    await expect(page.locator('[data-testid="member-since"]')).toContainText('June 15, 2023');

    // View detailed trip statistics
    await page.click('[data-testid="view-detailed-stats"]');
    await expect(page.locator('[data-testid="stats-modal"]')).toBeVisible();

    // Verify monthly breakdown
    await expect(page.locator('[data-testid="monthly-stats"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-month-trips"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-month-spending"]')).toBeVisible();

    // Verify vehicle preferences
    await expect(page.locator('[data-testid="vehicle-preferences"]')).toBeVisible();
    await expect(page.locator('[data-testid="black-sedan-count"]')).toBeVisible();
    await expect(page.locator="[data-testid='suv-count']").toBeVisible();

    // Verify favorite routes
    await expect(page.locator('[data-testid="favorite-routes"]')).toBeVisible();
    await expect(page.locator('[data-testid="route-1"]')).toContainText('Downtown → Airport');

    // Close stats modal
    await page.click('[data-testid="close-stats"]');
  });

  test('Manage notification preferences', async ({ page }) => {
    await page.click('[data-testid="profile-button"]');
    await page.click('[data-testid="notification-settings"]');

    // Verify notification categories
    await expect(page.locator('[data-testid="ride-notifications"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-notifications"]')).toBeVisible();
    await expect(page.locator="[data-testid='marketing-notifications']").toBeVisible();

    // Update ride notifications
    await page.check('[data-testid="ride-confirmed"]');
    await page.check('[data-testid="driver-arrived"]');
    await page.check('[data-testid="trip-completed"]');
    await page.uncheck('[data-testid="ride-cancelled"]');

    // Update payment notifications
    await page.check('[data-testid="payment-processed"]');
    await page.check('[data-testid="receipt-available"]');
    await page.uncheck('[data-testid="payment-failed"]');

    // Update marketing notifications
    await page.uncheck('[data-testid="promotional-offers"]');
    await page.check('[data-testid="service-updates"]');

    // Save preferences
    await page.click('[data-testid="save-notifications"]');
    await expect(page.locator('[data-testid="notifications-saved"]')).toBeVisible();

    // Verify preferences saved
    await expect(page.locator('[data-testid="ride-confirmed"]')).toBeChecked();
    await expect(page.locator('[data-testid="ride-cancelled"]')).not.toBeChecked();
    await expect(page.locator('[data-testid="promotional-offers"]')).not.toBeChecked();
  });

  test('Account security settings', async ({ page }) => {
    await page.click('[data-testid="profile-button"]');
    await page.click('[data-testid="security-settings"]');

    // Verify security options
    await expect(page.locator('[data-testid="change-password"]')).toBeVisible();
    await expect(page.locator('[data-testid="two-factor-auth"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-history"]')).toBeVisible();

    // Change password
    await page.click('[data-testid="change-password"]');
    await expect(page.locator('[data-testid="password-form"]')).toBeVisible();

    await page.fill('[data-testid="current-password"]', 'oldpassword123');
    await page.fill('[data-testid="new-password"]', 'newpassword456');
    await page.fill('[data-testid="confirm-password"]', 'newpassword456');
    await page.click('[data-testid="update-password"]');

    await expect(page.locator('[data-testid="password-updated"]')).toBeVisible();

    // Enable two-factor authentication
    await page.click('[data-testid="enable-2fa"]');
    await expect(page.locator('[data-testid="2fa-setup"]')).toBeVisible();
    await expect(page.locator="[data-testid='qr-code']").toBeVisible();

    // Mock 2FA setup completion
    await page.fill('[data-testid="2fa-code"]', '123456');
    await page.click('[data-testid="verify-2fa"]');
    await expect(page.locator('[data-testid="2fa-enabled"]')).toBeVisible();

    // View login history
    await page.click('[data-testid="login-history"]');
    await expect(page.locator('[data-testid="login-history-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-entry"]')).toHaveCount.greaterThan(0);
    await expect(page.locator('[data-testid="current-session"]')).toBeVisible();
  });
});
