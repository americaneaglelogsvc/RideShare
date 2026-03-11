import { jest } from '@jest/globals';

export const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  then: jest.fn().mockImplementation((callback) => {
    return callback({
      data: null,
      error: null
    });
  })
};

export const mockWebSocket = {
  on: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

export const mockNotificationService = {
  sendPushNotification: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'notif-123'
  }),
  sendEmailNotification: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'email-123'
  }),
  sendSMSNotification: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'sms-123'
  })
};

export const mockDriverProfile = {
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
  totalTrips: 342,
  location: { lat: 41.8781, lng: -87.6298 }
};

export const mockRiderProfile = {
  id: 'rider-123',
  name: 'Test Rider',
  email: 'rider@test.com',
  phone: '+1-555-987-6543',
  preferredVehicle: 'black_sedan',
  savedLocations: [
    { name: 'Home', address: '123 N Michigan Ave, Chicago, IL' },
    { name: 'Work', address: '500 N Wells St, Chicago, IL' }
  ],
  paymentMethods: [
    { id: 'pm-1', type: 'card', last4: '1234', brand: 'visa', isDefault: true }
  ],
  stats: {
    totalTrips: 47,
    totalSpent: 1250.75,
    averageRating: 4.9,
    memberSince: '2023-06-15'
  }
};

export const mockTripData = {
  id: 'trip-123',
  status: 'driver_assigned',
  pickup: '123 N Michigan Ave, Chicago, IL',
  dropoff: "O'Hare Airport, Chicago, IL",
  price: 45.50,
  distance: 12.5,
  duration: 1250,
  driver: mockDriverProfile,
  rider: mockRiderProfile,
  createdAt: new Date().toISOString(),
  estimatedArrival: '8 minutes'
};

export const mockOfferData = {
  id: 'offer-123',
  pickup: '123 N Michigan Ave',
  dropoff: "O'Hare Airport",
  price: 45.50,
  distance: 3.2,
  estimatedTime: 15,
  rider: { name: 'Test Rider', rating: 4.9 },
  expiresAt: new Date(Date.now() + 300000).toISOString() // 5 minutes from now
};

export const mockGeofenceData = {
  id: 'geo-1',
  tenantId: 'tenant-1',
  airportCode: 'ORD',
  zoneType: 'staging',
  zoneName: 'Main Staging Area',
  coordinates: {
    type: 'circle',
    center: { lat: 41.9742, lng: -87.9073 },
    radius: 500
  },
  createdAt: new Date().toISOString()
};

export const createMockResponse = (data: any, status = 200) => ({
  status,
  ok: status >= 200 && status < 300,
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  headers: new Map([['content-type', 'application/json']])
});

export const createMockPage = () => ({
  goto: jest.fn(),
  click: jest.fn(),
  fill: jest.fn(),
  press: jest.fn(),
  selectOption: jest.fn(),
  check: jest.fn(),
  uncheck: jest.fn(),
  waitForSelector: jest.fn(),
  waitForTimeout: jest.fn(),
  evaluate: jest.fn(),
  route: jest.fn(),
  locator: jest.fn().mockReturnValue({
    isVisible: jest.fn().mockResolvedValue(true),
    click: jest.fn(),
    fill: jest.fn(),
    textContent: jest.fn().mockResolvedValue(''),
    count: jest.fn().mockResolvedValue(1),
    first: jest.fn().mockReturnThis(),
    last: jest.fn().mockReturnThis(),
    nth: jest.fn().mockReturnThis()
  }),
  expect: jest.fn().mockReturnValue({
    toBeVisible: jest.fn(),
    toContainText: jest.fn(),
    toHaveURL: jest.fn(),
    toBeChecked: jest.fn(),
    not: {
      toBeChecked: jest.fn(),
      toBeVisible: jest.fn()
    }
  })
});

export const mockTestScenarios = {
  bookingFlow: {
    pickup: '123 N Michigan Ave, Chicago, IL',
    dropoff: "O'Hare Airport, Chicago, IL",
    vehicleCategory: 'black_sedan',
    paymentMethod: 'card',
    expectedPrice: 45.50
  },
  splitPayment: {
    participants: [
      { name: 'John Doe', email: 'john@example.com' },
      { name: 'Jane Smith', email: 'jane@example.com' }
    ],
    splitType: 'equal',
    totalAmount: 45.50,
    perPersonAmount: 22.75
  },
  scheduledRide: {
    pickup: '455 N Wells St, Chicago, IL',
    dropoff: 'Union Station, Chicago, IL',
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    time: '14:00',
    advanceTime: 24 // hours
  },
  hourlyBooking: {
    pickup: 'Chicago Loop, Chicago, IL',
    duration: 4, // hours
    hourlyRate: 35.00,
    totalPrice: 140.00
  }
};

export const mockApiResponses = {
  pricingQuote: {
    basePrice: 35.00,
    distanceFee: 8.50,
    timeFee: 2.00,
    surgeMultiplier: 1.0,
    totalPrice: 45.50,
    currency: 'USD',
    estimatedTime: 25
  },
  driverMatch: {
    driver: mockDriverProfile,
    eta: 8,
    distance: 2.1,
    confidence: 0.95
  },
  tripStatus: {
    status: 'in_progress',
    driverLocation: { lat: 41.8781, lng: -87.6298 },
    estimatedArrival: '5 minutes',
    progress: 0.65
  },
  paymentProcessing: {
    paymentId: 'payment-123',
    status: 'completed',
    amount: 45.50,
    processedAt: new Date().toISOString(),
    receiptUrl: '/api/payments/payment-123/receipt'
  }
};
