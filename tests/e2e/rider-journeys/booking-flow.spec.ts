import { test, expect } from '@playwright/test';

test.describe('Rider Booking Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
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

  test('Complete on-demand booking flow', async ({ page }) => {
    // Navigate to booking page
    await page.click('[data-testid="book-ride-button"]');
    await expect(page).toHaveURL('/book');

    // Enter pickup location
    await page.fill('[data-testid="pickup-input"]', '123 N Michigan Ave, Chicago, IL');
    await page.press('[data-testid="pickup-input"]', 'Enter');

    // Enter dropoff location
    await page.fill('[data-testid="dropoff-input"]', "O'Hare Airport, Chicago, IL");
    await page.press('[data-testid="dropoff-input"]', 'Enter');

    // Select vehicle category
    await page.click('[data-testid="vehicle-category-black-sedan"]');
    await expect(page.locator('[data-testid="selected-vehicle"]')).toContainText('Black Sedan');

    // Verify pricing estimate
    await expect(page.locator('[data-testid="price-estimate"]')).toBeVisible();
    const priceText = await page.textContent('[data-testid="price-estimate"]');
    expect(priceText).toMatch(/\$\d+\.\d{2}/);

    // Proceed to payment
    await page.click('[data-testid="proceed-to-payment"]');

    // Select payment method
    await page.click('[data-testid="payment-method-card"]');
    await expect(page.locator('[data-testid="payment-selected"]')).toContainText('Credit Card');

    // Confirm booking
    await page.click('[data-testid="confirm-booking"]');

    // Verify booking confirmation
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="trip-details"]')).toContainText('123 N Michigan Ave');
    await expect(page.locator('[data-testid="trip-details"]')).toContainText("O'Hare Airport");
  });

  test('Scheduled booking with future date/time', async ({ page }) => {
    // Navigate to scheduled booking
    await page.click('[data-testid="scheduled-booking-button"]');

    // Set pickup location
    await page.fill('[data-testid="pickup-input"]', '455 N Wells St, Chicago, IL');
    await page.press('[data-testid="pickup-input"]', 'Enter');

    // Set dropoff location
    await page.fill('[data-testid="dropoff-input"]', 'Union Station, Chicago, IL');
    await page.press('[data-testid="dropoff-input"]', 'Enter');

    // Select future date
    await page.click('[data-testid="schedule-date"]');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    await page.fill('[data-testid="schedule-date"]', dateStr);

    // Select future time
    await page.click('[data-testid="schedule-time"]');
    await page.click('[data-testid="time-option-14:00"]'); // 2:00 PM

    // Verify scheduling summary
    await expect(page.locator('[data-testid="schedule-summary"]')).toContainText('Tomorrow');
    await expect(page.locator('[data-testid="schedule-summary"]')).toContainText('2:00 PM');

    // Proceed with booking
    await page.click('[data-testid="proceed-to-payment"]');
    await page.click('[data-testid="confirm-booking"]');

    // Verify scheduled booking confirmation
    await expect(page.locator('[data-testid="scheduled-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="scheduled-time"]')).toContainText('Tomorrow at 2:00 PM');
  });

  test('Hourly booking with 2-12 hour duration', async ({ page }) => {
    // Navigate to hourly booking
    await page.click('[data-testid="hourly-booking-button"]');

    // Set pickup location
    await page.fill('[data-testid="pickup-input"]', 'Chicago Loop, Chicago, IL');
    await page.press('[data-testid="pickup-input"]', 'Enter');

    // Select hourly duration
    await page.click('[data-testid="hourly-duration"]');
    await page.click('[data-testid="duration-4-hours"]');

    // Verify hourly pricing
    await expect(page.locator('[data-testid="hourly-rate"]')).toBeVisible();
    const rateText = await page.textContent('[data-testid="hourly-rate"]');
    expect(rateText).toMatch(/\$\d+\/hour/);

    // Calculate total price
    await expect(page.locator('[data-testid="total-price"]')).toBeVisible();
    const totalPrice = await page.textContent('[data-testid="total-price"]');
    expect(totalPrice).toMatch(/\$\d+\.\d{2}/);

    // Proceed with hourly booking
    await page.click('[data-testid="proceed-to-payment"]');
    await page.click('[data-testid="confirm-booking"]');

    // Verify hourly booking confirmation
    await expect(page.locator('[data-testid="hourly-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-duration"]')).toContainText('4 hours');
  });

  test('Split payment with multiple participants', async ({ page }) => {
    // Start booking flow
    await page.click('[data-testid="book-ride-button"]');
    await page.fill('[data-testid="pickup-input"]', '500 N Michigan Ave, Chicago, IL');
    await page.fill('[data-testid="dropoff-input"]', 'Navy Pier, Chicago, IL');
    await page.press('[data-testid="dropoff-input"]', 'Enter');

    // Enable split payment
    await page.click('[data-testid="split-payment-toggle"]');

    // Add first participant
    await page.click('[data-testid="add-participant"]');
    await page.fill('[data-testid="participant-1-name"]', 'John Doe');
    await page.fill('[data-testid="participant-1-email"]', 'john@example.com');

    // Add second participant
    await page.click('[data-testid="add-participant"]');
    await page.fill('[data-testid="participant-2-name"]', 'Jane Smith');
    await page.fill('[data-testid="participant-2-email"]', 'jane@example.com');

    // Select split type (equal)
    await page.selectOption('[data-testid="split-type"]', 'equal');

    // Verify split calculations
    await expect(page.locator('[data-testid="split-per-person"]')).toBeVisible();
    const perPersonAmount = await page.textContent('[data-testid="split-per-person"]');
    expect(perPersonAmount).toMatch(/\$\d+\.\d{2}/);

    // Proceed with split booking
    await page.click('[data-testid="proceed-to-payment"]');
    await page.click('[data-testid="confirm-booking"]');

    // Verify split booking confirmation
    await expect(page.locator('[data-testid="split-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="participant-list"]')).toContainText('John Doe');
    await expect(page.locator('[data-testid="participant-list"]')).toContainText('Jane Smith');
  });

  test('Vehicle category selection and pricing', async ({ page }) => {
    await page.click('[data-testid="book-ride-button"]');
    await page.fill('[data-testid="pickup-input"]', 'Millennium Park, Chicago, IL');
    await page.fill('[data-testid="dropoff-input"]', 'Wrigley Field, Chicago, IL');
    await page.press('[data-testid="dropoff-input"]', 'Enter');

    // Test Black Sedan
    await page.click('[data-testid="vehicle-category-black-sedan"]');
    const sedanPrice = await page.textContent('[data-testid="price-estimate"]');
    expect(sedanPrice).toMatch(/\$\d+\.\d{2}/);

    // Test SUV
    await page.click('[data-testid="vehicle-category-suv"]');
    const suvPrice = await page.textContent('[data-testid="price-estimate"]');
    expect(suvPrice).toMatch(/\$\d+\.\d{2}/);
    expect(parseFloat(suvPrice.replace('$', ''))).toBeGreaterThan(parseFloat(sedanPrice.replace('$', '')));

    // Test Luxury
    await page.click('[data-testid="vehicle-category-luxury"]');
    const luxuryPrice = await page.textContent('[data-testid="price-estimate"]');
    expect(luxuryPrice).toMatch(/\$\d+\.\d{2}/);
    expect(parseFloat(luxuryPrice.replace('$', ''))).toBeGreaterThan(parseFloat(suvPrice.replace('$', '')));

    // Verify vehicle details
    await expect(page.locator('[data-testid="vehicle-details"]')).toContainText('4 passengers');
    await expect(page.locator('[data-testid="vehicle-features"]')).toBeVisible();
  });

  test('Payment method selection and processing', async ({ page }) => {
    await page.click('[data-testid="book-ride-button"]');
    await page.fill('[data-testid="pickup-input"]', 'Art Institute of Chicago, IL');
    await page.fill('[data-testid="dropoff-input"]', 'Museum Campus, Chicago, IL');
    await page.press('[data-testid="dropoff-input"]', 'Enter');

    await page.click('[data-testid="proceed-to-payment"]');

    // Test credit card payment
    await page.click('[data-testid="payment-method-card"]');
    await expect(page.locator('[data-testid="card-form"]')).toBeVisible();
    await page.fill('[data-testid="card-number"]', '4111111111111111');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="card-zip"]', '60601');

    // Test saved payment method
    await page.click('[data-testid="saved-payment-method"]');
    await expect(page.locator('[data-testid="saved-cards"]')).toBeVisible();

    // Test Apple Pay (if available)
    const applePayButton = page.locator('[data-testid="apple-pay-button"]');
    if (await applePayButton.isVisible()) {
      await applePayButton.click();
      await expect(page.locator('[data-testid="apple-pay-processing"]')).toBeVisible();
    }

    // Complete payment
    await page.click('[data-testid="confirm-payment"]');
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
  });
});
