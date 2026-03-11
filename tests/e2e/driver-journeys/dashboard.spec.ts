import { test, expect } from '@playwright/test';

test.describe('Driver Dashboard Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Mock driver authentication
    await page.goto('/driver-app');
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'mock-driver-token');
      localStorage.setItem('driverProfile', JSON.stringify({
        id: 'driver-123',
        name: 'John Driver',
        email: 'driver@test.com',
        phone: '+1-555-123-4567',
        status: 'offline',
        vehicle: {
          make: 'Toyota',
          model: 'Camry',
          year: 2022,
          color: 'Black',
          licensePlate: 'ABC-123'
        },
        rating: 4.8,
        totalTrips: 342
      }));
    });

    // Mock dashboard data
    await page.route('/api/driver/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          driver: {
            id: 'driver-123',
            status: 'offline',
            location: 'Downtown Chicago',
            earnings: {
              today: 145.50,
              week: 892.25,
              month: 3456.75
            },
            stats: {
              tripsToday: 8,
              tripsWeek: 42,
              tripsMonth: 156,
              acceptanceRate: 85,
              rating: 4.8
            }
          },
          currentOffer: null,
          recentTrips: [
            {
              id: 'trip-1',
              pickup: '123 N Michigan Ave',
              dropoff: "O'Hare Airport",
              price: 45.50,
              completedAt: '2024-01-15T14:30:00Z',
              riderRating: 5
            }
          ]
        })
      });
    });
  });

  test('Toggle online/offline status', async ({ page }) => {
    // Navigate to dashboard
    await expect(page.locator('[data-testid="dashboard-page"]')).toBeVisible();

    // Verify initial offline status
    await expect(page.locator('[data-testid="driver-status"]')).toContainText('Offline');
    await expect(page.locator('[data-testid="status-toggle"]')).not.toBeChecked();

    // Toggle to online
    await page.click('[data-testid="status-toggle"]');
    await expect(page.locator('[data-testid="status-confirm-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="status-confirm-text"]')).toContainText('Are you ready to start accepting rides?');

    // Confirm going online
    await page.click('[data-testid="confirm-online"]');
    await expect(page.locator('[data-testid="driver-status"]')).toContainText('Online');
    await expect(page.locator('[data-testid="status-toggle"]')).toBeChecked();

    // Verify API call was made
    await page.waitForResponse('/api/driver/status');
    await expect(page.locator('[data-testid="online-indicator"]')).toBeVisible();

    // Toggle back to offline
    await page.click('[data-testid="status-toggle"]');
    await expect(page.locator('[data-testid="offline-reason-modal"]')).toBeVisible();
    await page.selectOption('[data-testid="offline-reason"]', 'break');
    await page.fill('[data-testid="offline-duration"]', '30');
    await page.click('[data-testid="confirm-offline"]');

    await expect(page.locator('[data-testid="driver-status"]')).toContainText('Offline');
    await expect(page.locator('[data-testid="status-toggle"]')).not.toBeChecked();
  });

  test('Accept and decline ride offers', async ({ page }) => {
    // Mock incoming ride offer
    await page.route('/api/driver/offers/stream', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"type":"offer","data":{"id":"offer-1","pickup":"123 N Michigan Ave","dropoff":"O\'Hare Airport","price":45.50","distance":3.2,"estimatedTime":15,"rider":{"name":"Test Rider","rating":4.9}}}\n\n'
      });
    });

    // Go online first
    await page.click('[data-testid="status-toggle"]');
    await page.click('[data-testid="confirm-online"]');

    // Wait for offer notification
    await expect(page.locator('[data-testid="offer-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="offer-pickup"]')).toContainText('123 N Michigan Ave');
    await expect(page.locator="[data-testid='offer-dropoff']").toContainText("O'Hare Airport");
    await expect(page.locator('[data-testid="offer-price"]')).toContainText('$45.50');
    await expect(page.locator('[data-testid="offer-distance"]')).toContainText('3.2 mi');
    await expect(page.locator('[data-testid="offer-time"]')).toContainText('15 min');

    // Test declining offer
    await page.click('[data-testid="decline-offer"]');
    await expect(page.locator('[data-testid="decline-reason-modal"]')).toBeVisible();
    await page.selectOption('[data-testid="decline-reason"]', 'too_far');
    await page.click('[data-testid="confirm-decline"]');

    await expect(page.locator('[data-testid="offer-notification"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="offer-declined-toast"]')).toBeVisible();

    // Mock another offer
    await page.evaluate(() => {
      const event = new CustomEvent('newOffer', {
        detail: {
          id: 'offer-2',
          pickup: '500 N Wells St',
          dropoff: 'Union Station',
          price: 32.25,
          distance: 2.1,
          estimatedTime: 12,
          rider: { name: 'Jane Rider', rating: 4.7 }
        }
      });
      window.dispatchEvent(event);
    });

    // Wait for new offer
    await expect(page.locator('[data-testid="offer-notification"]')).toBeVisible();

    // Test accepting offer
    await page.click('[data-testid="accept-offer"]');
    await expect(page.locator('[data-testid="offer-accepted"]')).toBeVisible();
    await expect(page.locator('[data-testid="trip-started"]')).toContainText('Navigate to pickup location');
  });

  test('Real-time offer updates', async ({ page }) => {
    // Go online
    await page.click('[data-testid="status-toggle"]');
    await page.click('[data-testid="confirm-online"]');

    // Mock multiple offers coming in
    const offers = [
      { id: 'offer-1', price: 45.50, distance: 3.2, time: 15 },
      { id: 'offer-2', price: 38.25, distance: 2.8, time: 12 },
      { id: 'offer-3', price: 52.75, distance: 4.1, time: 18 }
    ];

    // Simulate offers appearing and disappearing
    for (const offer of offers) {
      await page.evaluate((offerData) => {
        const event = new CustomEvent('newOffer', { detail: offerData });
        window.dispatchEvent(event);
      }, offer);

      await expect(page.locator('[data-testid="offer-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="offer-price"]')).toContainText(`$${offer.price}`);

      // Offer expires after 10 seconds
      await page.waitForTimeout(2000);
      await page.evaluate(() => {
        const event = new CustomEvent('offerExpired');
        window.dispatchEvent(event);
      });
      await expect(page.locator('[data-testid="offer-notification"]')).not.toBeVisible();
    }

    // Verify offer history
    await page.click('[data-testid="offer-history"]');
    await expect(page.locator('[data-testid="offer-history-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="offer-history-item"]')).toHaveCount(3);
  });

  test('Destination mode configuration', async ({ page }) => {
    // Go online
    await page.click('[data-testid="status-toggle"]');
    await page.click('[data-testid="confirm-online"]');

    // Enable destination mode
    await page.click('[data-testid="destination-mode-toggle"]');
    await expect(page.locator('[data-testid="destination-input-modal"]')).toBeVisible();

    // Search for destination
    await page.fill('[data-testid="destination-search"]', 'O\'Hare Airport');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="destination-suggestion-0"]');

    // Verify destination set
    await expect(page.locator('[data-testid="selected-destination"]')).toContainText("O'Hare Airport");
    await page.click('[data-testid="confirm-destination"]');

    // Verify destination mode indicator
    await expect(page.locator('[data-testid="destination-mode-indicator"]')).toBeVisible();
    await expect(page.locator("[data-testid='destination-text']").toContainText("O'Hare Airport");

    // Test destination-based filtering
    await page.route('/api/driver/offers/filtered', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          offers: [
            {
              id: 'offer-1',
              pickup: 'Downtown Chicago',
              dropoff: "O'Hare Airport",
              price: 45.50,
              matchesDestination: true
            },
            {
              id: 'offer-2',
              pickup: 'Loop',
              dropoff: 'Union Station',
              price: 32.25,
              matchesDestination: false
            }
          ]
        })
      });
    });

    // Verify only matching offers are shown
    await page.evaluate(() => {
      const event = new CustomEvent('newOffer', {
        detail: {
          id: 'offer-1',
          pickup: 'Downtown Chicago',
          dropoff: "O'Hare Airport",
          price: 45.50,
          matchesDestination: true
        }
      });
      window.dispatchEvent(event);
    });

    await expect(page.locator('[data-testid="offer-notification"]')).toBeVisible();
    await expect(page.locator("[data-testid='destination-match-badge']").toBeVisible();

    // Disable destination mode
    await page.click('[data-testid="destination-mode-toggle"]');
    await expect(page.locator('[data-testid="destination-mode-indicator"]')).not.toBeVisible();
  });

  test('Earnings overview and details', async ({ page }) => {
    // Navigate to earnings section
    await page.click('[data-testid="earnings-tab"]');

    // Verify earnings overview
    await expect(page.locator('[data-testid="today-earnings"]')).toContainText('$145.50');
    await expect(page.locator('[data-testid="week-earnings"]')).toContainText('$892.25');
    await expect(page.locator('[data-testid="month-earnings"]')).toContainText('$3,456.75');

    // View detailed earnings breakdown
    await page.click('[data-testid="view-earnings-details"]');
    await expect(page.locator('[data-testid="earnings-modal"]')).toBeVisible();

    // Verify trip breakdown
    await expect(page.locator('[data-testid="trip-earnings-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="trip-earning-item"]')).toHaveCount.greaterThan(0);

    // Check first trip details
    const firstTrip = page.locator('[data-testid="trip-earning-item"]').first();
    await expect(firstTrip.locator('[data-testid="trip-amount"]')).toContainText('$45.50');
    await expect(firstTrip.locator('[data-testid="trip-route"]')).toContainText('123 N Michigan Ave');
    await expect(firstTrip.locator("[data-testid='trip-route']")).toContainText("O'Hare Airport");

    // View earnings by time period
    await page.selectOption('[data-testid="earnings-period"]', 'week');
    await expect(page.locator('[data-testid="week-breakdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="daily-earnings"]')).toHaveCount(7);

    // View earnings by vehicle type
    await page.click('[data-testid="earnings-by-vehicle"]');
    await expect(page.locator('[data-testid="vehicle-earnings-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="black-sedan-earnings"]')).toBeVisible();
    await expect(page.locator('[data-testid="suv-earnings"]')).toBeVisible();

    // View payment history
    await page.click('[data-testid="payment-history"]');
    await expect(page.locator('[data-testid="payment-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-item"]')).toHaveCount.greaterThan(0);
    await expect(page.locator('[data-testid="payment-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-amount"]')).toBeVisible();
  });
});
