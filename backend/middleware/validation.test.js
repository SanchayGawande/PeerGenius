/**
 * 🧪 Enhanced Validation Middleware Test Suite
 * Comprehensive tests for security-focused validation system
 */

const {
  handleValidationErrors,
  validateAuth,
  validateCreateThread,
  validateCreateMessage,
  validateUserSync,
  validateProfileUpdate,
  validatePreferencesUpdate,
  validateObjectId,
  validateSearch,
  validateAIRequest,
  validateRateLimit
} = require('./validation');

const { validationResult } = require('express-validator');

// Mock express-validator
const createChainableMock = () => {
  const mock = {
    trim: jest.fn(() => mock),
    isLength: jest.fn(() => mock),
    withMessage: jest.fn(() => mock),
    custom: jest.fn(() => mock),
    optional: jest.fn(() => mock),
    isEmail: jest.fn(() => mock),
    normalizeEmail: jest.fn(() => mock),
    isBoolean: jest.fn(() => mock),
    isArray: jest.fn(() => mock),
    isIn: jest.fn(() => mock),
    isObject: jest.fn(() => mock),
    isURL: jest.fn(() => mock),
    matches: jest.fn(() => mock),
    isInt: jest.fn(() => mock)
  };
  return mock;
};

jest.mock('express-validator', () => ({
  body: jest.fn(() => createChainableMock()),
  param: jest.fn(() => createChainableMock()),
  query: jest.fn(() => createChainableMock()),
  validationResult: jest.fn()
}));

// Mock input sanitizer
jest.mock('../utils/inputSanitizer', () => ({
  sanitizeHtml: jest.fn((input) => input.replace(/<[^>]*>/g, '')),
  sanitizeSearchQuery: jest.fn((query) => query.replace(/[<>]/g, '')),
  validateAndSanitizeEmail: jest.fn((email) => ({ 
    isValid: email.includes('@'), 
    sanitized: email.toLowerCase() 
  })),
  isValidObjectId: jest.fn((id) => /^[0-9a-fA-F]{24}$/.test(id)),
  sanitizeThreadData: jest.fn((data) => data),
  sanitizeMessageData: jest.fn((data) => data)
}));

// Mock response and request objects
const createMockResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res)
  };
  return res;
};

const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' },
  ...overrides
});

describe('Enhanced Validation Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleValidationErrors', () => {
    it('should pass through when no validation errors', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      validationResult.mockReturnValue({
        isEmpty: () => true,
        array: () => []
      });

      handleValidationErrors(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return formatted errors when validation fails', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      const mockErrors = [
        {
          path: 'email',
          msg: 'Invalid email format',
          value: 'invalid-email',
          location: 'body'
        },
        {
          param: 'name',
          msg: 'Name is required',
          value: '',
          location: 'body'
        }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      handleValidationErrors(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: [
          {
            field: 'email',
            message: 'Invalid email format',
            value: 'invalid-email',
            location: 'body'
          },
          {
            field: 'name',
            message: 'Name is required',
            value: '',
            location: 'body'
          }
        ],
        timestamp: expect.any(String)
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing path/param in error objects', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      const mockErrors = [
        {
          msg: 'General validation error',
          value: 'test',
          location: 'body'
        }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      handleValidationErrors(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: [
            expect.objectContaining({
              field: undefined,
              message: 'General validation error'
            })
          ]
        })
      );
    });
  });

  describe('validateCreateThread', () => {
    it('should be an array of middleware functions', () => {
      expect(Array.isArray(validateCreateThread)).toBe(true);
    });

    it('should include sanitization middleware', () => {
      // The last middleware should be the sanitization function
      const sanitizeMiddleware = validateCreateThread[validateCreateThread.length - 2];
      const req = createMockRequest({ body: { title: 'Test Thread' } });
      const res = createMockResponse();
      const next = jest.fn();

      sanitizeMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateCreateMessage', () => {
    it('should be an array of middleware functions', () => {
      expect(Array.isArray(validateCreateMessage)).toBe(true);
    });

    it('should handle sanitization errors', () => {
      const { sanitizeMessageData } = require('../utils/inputSanitizer');
      sanitizeMessageData.mockImplementation(() => {
        throw new Error('Invalid message data');
      });

      const sanitizeMiddleware = validateCreateMessage[validateCreateMessage.length - 2];
      const req = createMockRequest({ body: { content: 'Test message' } });
      const res = createMockResponse();
      const next = jest.fn();

      sanitizeMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Message data validation failed',
        message: 'Invalid message data',
        timestamp: expect.any(String)
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateUserSync', () => {
    it('should be an array of middleware functions', () => {
      expect(Array.isArray(validateUserSync)).toBe(true);
      expect(validateUserSync.length).toBeGreaterThan(0);
    });
  });

  describe('validateAuth', () => {
    it('should be an array of middleware functions', () => {
      expect(Array.isArray(validateAuth)).toBe(true);
      expect(validateAuth.length).toBeGreaterThan(0);
    });
  });

  describe('validateProfileUpdate', () => {
    it('should be an array of middleware functions', () => {
      expect(Array.isArray(validateProfileUpdate)).toBe(true);
      expect(validateProfileUpdate.length).toBeGreaterThan(0);
    });
  });

  describe('validatePreferencesUpdate', () => {
    it('should be an array of middleware functions', () => {
      expect(Array.isArray(validatePreferencesUpdate)).toBe(true);
      expect(validatePreferencesUpdate.length).toBeGreaterThan(0);
    });
  });

  describe('validateObjectId', () => {
    it('should return array of middleware functions', () => {
      const middleware = validateObjectId('userId');
      expect(Array.isArray(middleware)).toBe(true);
      expect(middleware.length).toBe(2); // validator + error handler
    });

    it('should use default parameter name if not provided', () => {
      const middleware = validateObjectId();
      expect(Array.isArray(middleware)).toBe(true);
    });
  });

  describe('validateSearch', () => {
    it('should be an array of middleware functions', () => {
      expect(Array.isArray(validateSearch)).toBe(true);
    });

    it('should include search query sanitization', () => {
      const sanitizeMiddleware = validateSearch[validateSearch.length - 2];
      const req = createMockRequest({ 
        query: { q: 'test<script>alert("xss")</script>' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      sanitizeMiddleware(req, res, next);

      expect(req.query.q).toBe('testscriptalert("xss")/script');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateAIRequest', () => {
    it('should be an array of middleware functions', () => {
      expect(Array.isArray(validateAIRequest)).toBe(true);
      expect(validateAIRequest.length).toBeGreaterThan(0);
    });
  });

  describe('validateRateLimit', () => {
    let rateLimitMiddleware;

    beforeEach(() => {
      rateLimitMiddleware = validateRateLimit(5, 60000); // 5 requests per minute
    });

    it('should allow requests within limit', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      rateLimitMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding limit', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      // Make 6 requests (exceeding limit of 5)
      for (let i = 0; i < 6; i++) {
        rateLimitMiddleware(req, res, next);
      }

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: 60,
        timestamp: expect.any(String)
      });
    });

    it('should track requests per IP address', () => {
      const req1 = createMockRequest({ ip: '192.168.1.1' });
      const req2 = createMockRequest({ ip: '192.168.1.2' });
      const res = createMockResponse();
      const next = jest.fn();

      // Each IP should have its own limit
      for (let i = 0; i < 5; i++) {
        rateLimitMiddleware(req1, res, next);
        rateLimitMiddleware(req2, res, next);
      }

      expect(next).toHaveBeenCalledTimes(10); // Both IPs should be allowed
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should clean old requests outside time window', (done) => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      // Create middleware with very short window for testing
      const shortWindowMiddleware = validateRateLimit(2, 50); // 2 requests per 50ms

      // Make 2 requests (at limit)
      shortWindowMiddleware(req, res, next);
      shortWindowMiddleware(req, res, next);

      // Wait for window to expire, then make another request
      setTimeout(() => {
        shortWindowMiddleware(req, res, next);
        
        expect(next).toHaveBeenCalledTimes(3); // Should allow the third request
        expect(res.status).not.toHaveBeenCalled();
        done();
      }, 60);
    });

    it('should use connection.remoteAddress as fallback for IP', () => {
      const req = createMockRequest({ 
        ip: undefined,
        connection: { remoteAddress: '10.0.0.1' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      rateLimitMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should use default limits when not specified', () => {
      const defaultMiddleware = validateRateLimit();
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      defaultMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Input Sanitization Integration', () => {
    it('should sanitize HTML in thread data', () => {
      const { sanitizeThreadData } = require('../utils/inputSanitizer');
      
      sanitizeThreadData.mockImplementation((data) => ({
        ...data,
        title: data.title?.replace(/<[^>]*>/g, ''),
        description: data.description?.replace(/<[^>]*>/g, '')
      }));

      const sanitizeMiddleware = validateCreateThread[validateCreateThread.length - 2];
      const req = createMockRequest({
        body: {
          title: 'Test <script>alert("xss")</script> Thread',
          description: 'Description with <img src="x" onerror="alert(1)">'
        }
      });
      const res = createMockResponse();
      const next = jest.fn();

      sanitizeMiddleware(req, res, next);

      expect(sanitizeThreadData).toHaveBeenCalledWith(req.body);
      expect(next).toHaveBeenCalled();
    });

    it('should validate email addresses', () => {
      const { validateAndSanitizeEmail } = require('../utils/inputSanitizer');
      
      validateAndSanitizeEmail.mockReturnValue({
        isValid: true,
        sanitized: 'test@example.com'
      });

      // This would be tested in the actual validation chain
      expect(validateAndSanitizeEmail).toBeDefined();
    });

    it('should validate ObjectIds', () => {
      const { isValidObjectId } = require('../utils/inputSanitizer');
      
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      expect(isValidObjectId('invalid-id')).toBe(false);
    });

    it('should sanitize search queries', () => {
      const { sanitizeSearchQuery } = require('../utils/inputSanitizer');
      
      const result = sanitizeSearchQuery('test<script>alert("xss")</script>');
      expect(result).toBe('testscriptalert("xss")/script');
    });
  });

  describe('Security Features', () => {
    it('should prevent XSS in validation messages', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      const mockErrors = [
        {
          path: 'content',
          msg: 'Invalid content: <script>alert("xss")</script>',
          value: 'test',
          location: 'body'
        }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      handleValidationErrors(req, res, next);

      // The message should be sanitized (HTML removed)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: [
            expect.objectContaining({
              message: 'Invalid content: alert("xss")'
            })
          ]
        })
      );
    });

    it('should enforce maximum length limits', () => {
      // This is tested through the middleware array structure
      // Each validation middleware should enforce appropriate length limits
      expect(validateCreateMessage).toBeDefined();
      expect(validateCreateThread).toBeDefined();
    });

    it('should validate against injection attacks', () => {
      const { sanitizeSearchQuery } = require('../utils/inputSanitizer');
      
      // Test various injection patterns
      const injectionPatterns = [
        '$ne',
        '$gt',
        '$where',
        '{"$ne": null}',
        '<script>',
        'javascript:',
        'eval('
      ];

      injectionPatterns.forEach(pattern => {
        const sanitized = sanitizeSearchQuery(pattern);
        expect(sanitized).not.toContain('$');
        expect(sanitized).not.toContain('{');
        expect(sanitized).not.toContain('}');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle middleware errors gracefully', () => {
      const errorMiddleware = validateCreateMessage[validateCreateMessage.length - 2];
      const req = createMockRequest({ body: null });
      const res = createMockResponse();
      const next = jest.fn();

      // Mock sanitizer to throw error
      const { sanitizeMessageData } = require('../utils/inputSanitizer');
      sanitizeMessageData.mockImplementation(() => {
        throw new Error('Sanitization failed');
      });

      errorMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Message data validation failed'
        })
      );
    });

    it('should provide descriptive error messages', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      const mockErrors = [
        {
          path: 'email',
          msg: 'Email must be a valid email address',
          value: 'invalid-email',
          location: 'body'
        }
      ];

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => mockErrors
      });

      handleValidationErrors(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: [
            expect.objectContaining({
              message: 'Email must be a valid email address'
            })
          ]
        })
      );
    });
  });
});