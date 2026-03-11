import { test, expect } from '@playwright/test';

test.describe('Ride Management Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication and trip data
    await page.goto('/rider-app');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'mock-rider-token');
      localStorage.setItem('riderProfile', JSON.stringify({
        id: 'rider-123',
        name: 'Test Rider',
        email: 'rider@test.com'
      }));
    });

    // Mock completed trips for testing
    await page.route('/api/rider/trips', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'trip-1',
            status: 'completed',
            pickup: '123 N Michigan Ave, Chicago, IL',
            dropoff: "O'Hare Airport, Chicago, IL",
            vehicleCategory: 'black_sedan',
            price: 45.50,
            completedAt: '2024-01-15T10:30:00Z',
            driver: {
              name: 'John Driver',
              rating: 4.8,
              vehicle: 'Black Toyota Camry'
            }
          },
          {
            id: 'trip-2',
            status: 'completed',
            pickup: '500 N Wells St, Chicago, IL',
            dropoff: 'Union Station, Chicago, IL',
            vehicleCategory: 'suv',
            price: 32.25,
            completedAt: '2024-01-14T15:45:00Z',
            driver: {
              name: 'Sarah Driver',
              rating: 4.9,
              vehicle: 'White Chevrolet Tahoe'
            }
          }
        ])
      });
    });
  });

  test('View ride history and receipts', async ({ page }) => {
    // Navigate to ride history
    await page.click('[data-testid="history-button"]');
    await expect(page).toHaveURL('/history');

    // Verify trip list loads
    await expect(page.locator('[data-testid="trip-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="trip-item"]')).toHaveCount(2);

    // Check first trip details
    const firstTrip = page.locator('[data-testid="trip-item"]').first();
    await expect(firstTrip.locator('[data-testid="trip-date"]')).toContainText('Jan 15, 2024');
    await expect(firstTrip.locator('[data-testid="trip-route"]')).toContainText('123 N Michigan Ave');
    await expect(firstTrip.locator('[data-testid="trip-route"]')).toContainText("O'Hare Airport");
    await expect(firstTrip.locator('[data-testid="trip-price"]')).toContainText('$45.50');

    // Click to view trip details
    await firstTrip.click();
    await expect(page.locator('[data-testid="trip-details-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="driver-info"]')).toContainText('John Driver');
    await expect(page.locator('[data-testid="vehicle-info"]')).toContainText('Black Toyota Camry');
    await expect(page.locator('[data-testid="trip-timestamp"]')).toContainText('10:30 AM');

    // Download receipt
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-receipt"]');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('receipt-trip-1');

    // Close modal
    await page.click('[data-testid="close-modal"]');
  });

  test('Submit driver ratings with tags', async ({ page }) => {
    // Navigate to ride history
    await page.click('[data-testid="history-button"]');

    // Click on first trip to rate
    const firstTrip = page.locator('[data-testid="trip-item"]').first();
    await firstTrip.click();

    // Rate the trip
    await page.click('[data-testid="rate-trip-button"]');
    await expect(page.locator('[data-testid="rating-modal"]')).toBeVisible();

    // Select 5-star rating
    await page.click('[data-testid="star-5"]');
    await expect(page.locator('[data-testid="selected-rating"]')).toContainText('5 stars');

    // Add rating tags
    await page.click('[data-testid="tag-friendly"]');
    await page.click('[data-testid="tag-clean-car"]');
    await page.click('[data-testid="tag-safe-driving"]');
    await expect(page.locator('[data-testid="selected-tags"]')).toHaveCount(3);

    // Add written comment
    await page.fill('[data-testid="rating-comment"]', 'Great ride! Driver was professional and car was very clean.');

    // Submit rating
    await page.click('[data-testid="submit-rating"]');
    await expect(page.locator('[data-testid="rating-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="rating-success"]')).toContainText('Thank you for your feedback!');

    // Verify rating is saved
    await page.click('[data-testid="close-modal"]');
    await firstTrip.click();
    await expect(page.locator('[data-testid="trip-rating"]')).toContainText('5.0');
    await expect(page.locator('[data-testid="already-rated"]')).toBeVisible();
  });

  test('Send in-trip messages (PII masked)', async ({ page }) => {
    // Mock active trip
    await page.route('/api/rider/active-trip', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'active-trip-1',
          status: 'in_progress',
          driver: {
            name: 'Mike Driver',
            phone: '+1-555-***-1234', // PII masked
            vehicle: 'Black Lexus ES350'
          },
          estimatedArrival: '5 minutes'
        })
      });
    });

    // Navigate to active trip
    await page.click('[data-testid="active-trip-button"]');
    await expect(page.locator('[data-testid="active-trip-info"]')).toBeVisible();

    // Open messaging
    await page.click('[data-testid="message-driver-button"]');
    await expect(page.locator('[data-testid="messaging-modal"]')).toBeVisible();

    // Verify PII masking
    await expect(page.locator('[data-testid="driver-phone"]')).toContainText('+1-555-***-1234');
    await expect(page.locator('[data-testid="driver-phone"]')).not.toContain('+1-555-555-1234');

    // Send message
    await page.fill('[data-testid="message-input"]', 'I\'m wearing a red jacket, please look for me at the main entrance.');
    await page.click('[data-testid="send-message"]');

    // Verify message appears
    await expect(page.locator('[data-testid="message-sent"]')).toContainText('I\'m wearing a red jacket');
    await expect(page.locator('[data-testid="message-timestamp"]')).toBeVisible();

    // Mock driver response
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      const event = new CustomEvent('driverMessage', {
        detail: {
          message: 'I see you! I\'ll be at the main entrance in 2 minutes.',
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(event);
    });

    // Verify driver message
    await expect(page.locator('[data-testid="driver-message"]')).toContainText('I\'ll be at the main entrance');
    await expect(page.locator('[data-testid="message-timestamp"]')).toBeVisible();
  });

  test('Create and track support disputes', async ({ page }) => {
    // Navigate to support page
    await page.click('[data-testid="support-button"]');
    await expect(page).toHaveURL('/support');

    // Create new dispute
    await page.click('[data-testid="create-dispute-button"]');
    await expect(page.locator('[data-testid="dispute-form"]')).toBeVisible();

    // Select trip for dispute
    await page.selectOption('[data-testid="dispute-trip"]', 'trip-1');
    await expect(page.locator('[data-testid="trip-details-preview"]')).toContainText('123 N Michigan Ave');

    // Select dispute type
    await page.selectOption('[data-testid="dispute-type"]', 'fare_dispute');

    // Enter dispute details
    await page.fill('[data-testid="dispute-description"]', 'I was charged more than the estimated price. The final amount was $45.50 but the estimate was $35.00.');

    // Add supporting evidence
    await page.click('[data-testid="add-evidence"]');
    await page.setInputFiles('[data-testid="evidence-upload"]', 'test-receipt.jpg');

    // Submit dispute
    await page.click('[data-testid="submit-dispute"]');
    await expect(page.locator('[data-testid="dispute-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="dispute-reference"]')).toBeVisible();

    // Verify dispute appears in history
    await page.click('[data-testid="dispute-history-tab"]');
    await expect(page.locator('[data-testid="dispute-item"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="dispute-status"]')).toContainText('Under Review');

    // Track dispute status
    const disputeItem = page.locator('[data-testid="dispute-item"]').first();
    await expect(disputeItem.locator('[data-testid="dispute-reference"]')).toContainText('DISP-');
    await expect(disputeItem.locator('[data-testid="dispute-created"]')).toBeVisible();
  });

  test('Manage legal consents', async ({ page }) => {
    // Navigate to profile
    await page.click('[data-testid="profile-button"]');
    await expect(page).toHaveURL('/profile');

    // Go to consent management
    await page.click('[data-testid="consent-management"]');
    await expect(page.locator('[data-testid="consent-page"]')).toBeVisible();

    // Review current consents
    await expect(page.locator('[data-testid="terms-consent"]')).toBeVisible();
    await expect(page.locator('[data-testid="privacy-consent"]')).toBeVisible();
    await expect(page.locator('[data-testid="marketing-consent"]')).toBeVisible();

    // Update marketing consent
    const marketingConsent = page.locator('[data-testid="marketing-consent-toggle"]');
    const currentStatus = await marketingConsent.isChecked();
    await marketingConsent.click();
    await expect(await marketingConsent.isChecked()).toBe(!currentStatus);

    // Add new consent (Data Processing)
    await page.click('[data-testid="add-consent"]');
    await page.selectOption('[data-testid="consent-type"]', 'data_processing');
    await page.click('[data-testid="accept-consent"]');
    await expect(page.locator('[data-testid="consent-success"]')).toBeVisible();

    // Verify consent history
    await page.click('[data-testid="consent-history"]');
    await expect(page.locator('[data-testid="consent-log"]')).toBeVisible();
    await expect(page.locator('[data-testid="consent-entry"]')).toContainText('Data Processing');
    await expect(page.locator('[data-testid="consent-timestamp"]')).toBeVisible();

    // Request data export (DSAR)
    await page.click('[data-testid="request-data-export"]');
    await page.selectOption('[data-testid="export-format"]', 'json');
    await page.fill('[data-testid="export-email"]', 'rider@test.com');
    await page.click('[data-testid="submit-export-request"]');

    await expect(page.locator('[data-testid="export-requested"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-reference"]')).toBeVisible();
  });
});
