import { test, expect } from '@playwright/test';

test.describe('Rider-Driver Journey Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Setup mock data for integration testing
    await page.goto('/rider-app');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'mock-rider-token');
      localStorage.setItem('riderProfile', JSON.stringify({
        id: 'rider-123',
        name: 'Test Rider',
        email: 'rider@test.com'
      }));
    });
  });

  test('End-to-end booking fulfillment', async ({ page }) => {
    // Mock driver availability and matching
    await page.route('/api/dispatch/match-driver', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          driver: {
            id: 'driver-123',
            name: 'John Driver',
            rating: 4.8,
            vehicle: 'Black Toyota Camry',
            licensePlate: 'ABC-123',
            phone: '+1-555-***-1234',
            location: { lat: 41.8781, lng: -87.6298 },
            eta: 8
          },
          trip: {
            id: 'trip-123',
            status: 'driver_assigned',
            pickup: '123 N Michigan Ave, Chicago, IL',
            dropoff: "O'Hare Airport, Chicago, IL",
            price: 45.50,
            estimatedTime: 25
          }
        })
      });
    });

    // Mock trip status updates
    await page.route('/api/rider/trip/*/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'trip-123',
          status: 'in_progress',
          driverLocation: { lat: 41.8781, lng: -87.6298 },
          estimatedArrival: '8 minutes'
        })
      });
    });

    // Start booking flow
    await page.click('[data-testid="book-ride-button"]');
    await page.fill('[data-testid="pickup-input"]', '123 N Michigan Ave, Chicago, IL');
    await page.fill('[data-testid="dropoff-input"]', "O'Hare Airport, Chicago, IL");
    await page.press('[data-testid="dropoff-input"]', 'Enter');

    // Select vehicle and proceed
    await page.click('[data-testid="vehicle-category-black-sedan"]');
    await page.click('[data-testid="proceed-to-payment"]');
    await page.click('[data-testid="payment-method-card"]');
    await page.click('[data-testid="confirm-booking"]');

    // Verify driver assignment
    await expect(page.locator('[data-testid="driver-assigned"]')).toBeVisible();
    await expect(page.locator('[data-testid="driver-name"]')).toContainText('John Driver');
    await expect(page.locator('[data-testid="driver-rating"]')).toContainText('4.8');
    await expect(page.locator('[data-testid="vehicle-info"]')).toContainText('Black Toyota Camry');
    await expect(page.locator('[data-testid="eta"]')).toContainText('8 minutes');

    // Verify real-time updates
    await expect(page.locator('[data-testid="live-tracking"]')).toBeVisible();
    await expect(page.locator('[data-testid="driver-location"]')).toBeVisible();

    // Mock driver arrival
    await page.evaluate(() => {
      const event = new CustomEvent('driverArrived', {
        detail: {
          message: 'Your driver has arrived!',
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(event);
    });

    await expect(page.locator('[data-testid="driver-arrived-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-trip-button"]')).toBeVisible();

    // Start trip
    await page.click('[data-testid="start-trip-button"]');
    await expect(page.locator('[data-testid="trip-in-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="trip-timer"]')).toBeVisible();
  });

  test('Real-time location sharing', async ({ page }) => {
    // Mock active trip with location sharing
    await page.route('/api/rider/active-trip', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'trip-123',
          status: 'in_progress',
          driver: {
            id: 'driver-123',
            name: 'John Driver',
            vehicle: 'Black Toyota Camry'
          },
          route: {
            pickup: '123 N Michigan Ave',
            dropoff: "O'Hare Airport",
            currentLocation: { lat: 41.8781, lng: -87.6298 }
          }
        })
      });
    });

    // Navigate to active trip
    await page.click('[data-testid="active-trip-button"]');
    await expect(page.locator('[data-testid="trip-map"]')).toBeVisible();

    // Mock real-time location updates
    const locations = [
      { lat: 41.8781, lng: -87.6298 },
      { lat: 41.8791, lng: -87.6308 },
      { lat: 41.8801, lng: -87.6318 }
    ];

    for (const location of locations) {
      await page.evaluate((loc) => {
        const event = new CustomEvent('locationUpdate', {
          detail: {
            driverId: 'driver-123',
            location: loc,
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(event);
      }, location);

      await expect(page.locator('[data-testid="driver-marker"]')).toBeVisible();
      await page.waitForTimeout(1000);
    }

    // Verify location accuracy indicator
    await expect(page.locator('[data-testid="location-accuracy"]')).toBeVisible();
    await expect(page.locator('[data-testid="last-update"]')).toBeVisible();
  });

  test('Payment processing integration', async ({ page }) => {
    // Mock completed trip for payment
    await page.route('/api/rider/trip/*/complete', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          trip: {
            id: 'trip-123',
            status: 'completed',
            finalPrice: 45.50,
            duration: 1250, // seconds
            distance: 12.5, // miles
            route: '123 N Michigan Ave → O\'Hare Airport'
          },
          payment: {
            id: 'payment-123',
            status: 'pending',
            amount: 45.50,
            method: 'card'
          }
        })
      });
    });

    // Mock payment processing
    await page.route('/api/payments/process', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          paymentId: 'payment-123',
          status: 'completed',
          amount: 45.50,
          processedAt: new Date().toISOString(),
          receiptUrl: '/api/payments/payment-123/receipt'
        })
      });
    });

    // Navigate to completed trip
    await page.click('[data-testid="history-button"]');
    await page.click('[data-testid="trip-item"]:first-child');
    await page.click('[data-testid="pay-now-button"]');

    // Verify payment flow
    await expect(page.locator('[data-testid="payment-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="final-price"]')).toContainText('$45.50');
    await expect(page.locator="[data-testid='trip-duration']").toContainText('20 minutes 50 seconds');
    await expect(page.locator('[data-testid="trip-distance"]')).toContainText('12.5 miles');

    // Process payment
    await page.click('[data-testid="confirm-payment"]');
    await expect(page.locator('[data-testid="payment-processing"]')).toBeVisible();

    // Verify payment completion
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="receipt-available"]')).toBeVisible();
    await page.click('[data-testid="view-receipt"]');
    await expect(page.locator('[data-testid="receipt-modal"]')).toBeVisible();
  });

  test('Rating exchange system', async ({ page }) => {
    // Mock completed trip ready for rating
    await page.route('/api/rider/trip/*/rate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          rating: {
            id: 'rating-123',
            score: 5,
            tags: ['friendly', 'clean_car', 'safe_driving'],
            comment: 'Great ride!',
            createdAt: new Date().toISOString()
          }
        })
      });
    });

    // Navigate to rating flow
    await page.click('[data-testid="history-button"]');
    await page.click('[data-testid="trip-item"]:first-child');
    await page.click('[data-testid="rate-trip-button"]');

    // Verify rating interface
    await expect(page.locator('[data-testid="rating-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="driver-info"]')).toContainText('John Driver');
    await expect(page.locator('[data-testid="vehicle-info"]')).toContainText('Black Toyota Camry');

    // Submit rating
    await page.click('[data-testid="star-5"]');
    await page.click('[data-testid="tag-friendly"]');
    await page.click('[data-testid="tag-clean-car"]');
    await page.click('[data-testid="tag-safe-driving"]');
    await page.fill('[data-testid="rating-comment"]', 'Great ride! Driver was professional and car was very clean.');
    await page.click('[data-testid="submit-rating"]');

    // Verify rating success
    await expect(page.locator('[data-testid="rating-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="rating-confirmation"]')).toContainText('Thank you for your feedback!');

    // Verify rating appears in trip history
    await page.click('[data-testid="close-modal"]');
    await expect(page.locator('[data-testid="trip-rating"]')).toContainText('5.0');
    await expect(page.locator('[data-testid="rating-tags"]')).toHaveCount(3);
  });

  test('Dispute resolution workflow', async ({ page }) => {
    // Mock dispute creation and resolution
    await page.route('/api/rider/disputes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dispute: {
            id: 'dispute-123',
            tripId: 'trip-123',
            type: 'fare_dispute',
            status: 'under_review',
            createdAt: new Date().toISOString()
          }
        })
      });
    });

    // Mock dispute resolution
    await page.route('/api/rider/disputes/*/resolve', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dispute: {
            id: 'dispute-123',
            status: 'resolved',
            resolution: 'partial_refund',
            refundAmount: 10.00,
            resolvedAt: new Date().toISOString()
          }
        })
      });
    });

    // Create dispute
    await page.click('[data-testid="support-button"]');
    await page.click('[data-testid="create-dispute-button"]');
    await page.selectOption('[data-testid="dispute-trip"]', 'trip-123');
    await page.selectOption('[data-testid="dispute-type"]', 'fare_dispute');
    await page.fill('[data-testid="dispute-description"]', 'I was charged more than the estimated price.');
    await page.click('[data-testid="submit-dispute"]');

    // Verify dispute created
    await expect(page.locator('[data-testid="dispute-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="dispute-reference"]')).toContainText('DISP-');

    // Mock resolution notification
    await page.evaluate(() => {
      const event = new CustomEvent('disputeResolved', {
        detail: {
          disputeId: 'dispute-123',
          resolution: 'partial_refund',
          refundAmount: 10.00,
          message: 'Your dispute has been resolved with a partial refund of $10.00'
        }
      });
      window.dispatchEvent(event);
    });

    // Verify resolution notification
    await expect(page.locator('[data-testid="dispute-resolved-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="refund-amount"]')).toContainText('$10.00');
  });
});
