import { jest } from '@jest/globals';

// Global test setup
beforeAll(() => {
  // Set up global test environment
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock fetch for API calls
global.fetch = jest.fn() as jest.Mock;

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  on: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock CustomEvent
global.CustomEvent = jest.fn().mockImplementation((type, eventInitDict) => ({
  type,
  bubbles: eventInitDict?.bubbles || false,
  cancelable: eventInitDict?.cancelable || false,
  detail: eventInitDict?.detail
}));

// Mock setTimeout and setInterval
global.setTimeout = jest.fn((fn, delay) => {
  return setTimeout(fn, delay);
}) as any;

global.setInterval = jest.fn((fn, interval) => {
  return setInterval(fn, interval);
}) as any;

// Clear mocks after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});
