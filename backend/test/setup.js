// backend/test/setup.js - Backend test setup
const sinon = require('sinon');

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  sinon.restore();
});

afterEach(() => {
  // Cleanup after each test
  sinon.restore();
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

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://localhost:27017/peergenius-test';
process.env.GROQ_API_KEY = 'test-groq-key';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_PRIVATE_KEY = 'test-private-key';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test.com';

// Global test utilities
global.createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: { uid: 'test-uid', email: 'test@example.com' },
  ...overrides,
});

global.createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};

global.createMockNext = () => jest.fn();

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  credential: {
    cert: jest.fn(),
  },
  initializeApp: jest.fn(),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn().mockResolvedValue({
      uid: 'test-uid',
      email: 'test@example.com',
    }),
  })),
}));

// Mock Groq API
jest.mock('groq-sdk', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mock AI response',
            },
          }],
        }),
      },
    },
  }));
});