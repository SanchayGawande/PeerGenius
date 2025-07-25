/**
 * 🧪 Enhanced Authentication Middleware Test Suite
 * Comprehensive tests for Firebase-based auth and authorization system
 */

const {
  verifyToken,
  optionalAuth,
  requireRole,
  requirePermission,
  requireOwnership,
  requireEmailVerification,
  rateLimitAuth,
  requireAdmin,
  requireEducator,
  requireModerator,
  USER_ROLES,
  PERMISSIONS
} = require('./authMiddleware');

// Mock Firebase Admin
jest.mock('../firebaseAdmin', () => ({
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn()
  }))
}));

const mockAdmin = require('../firebaseAdmin');

// Mock controller helpers
jest.mock('../utils/controllerHelpers', () => ({
  responses: {
    unauthorized: jest.fn(),
    forbidden: jest.fn(),
    serverError: jest.fn(),
    rateLimited: jest.fn()
  }
}));

const { responses: mockResponses } = require('../utils/controllerHelpers');

// Mock input sanitizer
jest.mock('../utils/inputSanitizer', () => ({
  sanitizeHtml: jest.fn((input) => input)
}));

// Mock response and request objects
const createMockResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    set: jest.fn(() => res)
  };
  return res;
};

const createMockRequest = (overrides = {}) => ({
  headers: {},
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' },
  method: 'GET',
  path: '/api/test',
  params: {},
  body: {},
  ...overrides
});

describe('Enhanced Authentication Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  describe('USER_ROLES and PERMISSIONS constants', () => {
    it('should define user roles correctly', () => {
      expect(USER_ROLES).toEqual({
        STUDENT: 'student',
        TEACHER: 'teacher',
        ADMIN: 'admin',
        MODERATOR: 'moderator'
      });
    });

    it('should define permissions correctly', () => {
      expect(PERMISSIONS).toEqual({
        READ: 'read',
        WRITE: 'write',
        DELETE: 'delete',
        MODERATE: 'moderate',
        ADMIN: 'admin'
      });
    });
  });

  describe('verifyToken', () => {
    let mockVerifyIdToken;

    beforeEach(() => {
      mockVerifyIdToken = mockAdmin.auth().verifyIdToken;
    });

    it('should verify valid token and set user context', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-token-123' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      const mockDecodedToken = {
        uid: 'user123',
        email: 'test@example.com',
        email_verified: true,
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        exp: Date.now() / 1000 + 3600 // 1 hour from now
      };

      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      await verifyToken(req, res, next);

      expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token-123');
      expect(req.user).toEqual({
        uid: 'user123',
        email: 'test@example.com',
        emailVerified: true,
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
        role: USER_ROLES.STUDENT,
        permissions: [PERMISSIONS.READ],
        lastLogin: expect.any(String),
        tokenExpiry: expect.any(String),
        provider: 'unknown'
      });
      expect(next).toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(mockResponses.unauthorized).toHaveBeenCalledWith(
        res,
        'No valid authorization token provided'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid authorization header format', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Invalid token-format' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(mockResponses.unauthorized).toHaveBeenCalledWith(
        res,
        'No valid authorization token provided'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with empty token', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer ' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(mockResponses.unauthorized).toHaveBeenCalledWith(
        res,
        'No token provided'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer short' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      await verifyToken(req, res, next);

      expect(mockResponses.unauthorized).toHaveBeenCalledWith(
        res,
        'Invalid token format'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle expired token error', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer expired-token-with-sufficient-length-to-pass-basic-validation' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      const expiredError = new Error('Token expired');
      expiredError.code = 'auth/id-token-expired';
      mockVerifyIdToken.mockRejectedValue(expiredError);

      await verifyToken(req, res, next);

      expect(mockResponses.unauthorized).toHaveBeenCalledWith(
        res,
        'Authentication token has expired'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle invalid token error', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid-token-with-sufficient-length-to-pass-basic-validation' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      const invalidError = new Error('Invalid token');
      invalidError.code = 'auth/invalid-id-token';
      mockVerifyIdToken.mockRejectedValue(invalidError);

      await verifyToken(req, res, next);

      expect(mockResponses.unauthorized).toHaveBeenCalledWith(
        res,
        'Invalid authentication token'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle revoked token error', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer revoked-token-with-sufficient-length-to-pass-basic-validation' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      const revokedError = new Error('Token revoked');
      revokedError.code = 'auth/id-token-revoked';
      mockVerifyIdToken.mockRejectedValue(revokedError);

      await verifyToken(req, res, next);

      expect(mockResponses.unauthorized).toHaveBeenCalledWith(
        res,
        'Authentication token has been revoked'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle disabled user error', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer disabled-user-token-with-sufficient-length-to-pass-basic-validation' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      const disabledError = new Error('User disabled');
      disabledError.code = 'auth/user-disabled';
      mockVerifyIdToken.mockRejectedValue(disabledError);

      await verifyToken(req, res, next);

      expect(mockResponses.forbidden).toHaveBeenCalledWith(
        res,
        'User account has been disabled'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle project configuration error', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer config-error-token-with-sufficient-length-to-pass-basic-validation' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      const configError = new Error('Project not found');
      configError.code = 'auth/project-not-found';
      mockVerifyIdToken.mockRejectedValue(configError);

      await verifyToken(req, res, next);

      expect(mockResponses.serverError).toHaveBeenCalledWith(
        res,
        'Authentication service unavailable'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle generic authentication errors', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer generic-error-token-with-sufficient-length-to-pass-basic-validation' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      const genericError = new Error('Generic auth error');
      mockVerifyIdToken.mockRejectedValue(genericError);

      await verifyToken(req, res, next);

      expect(mockResponses.unauthorized).toHaveBeenCalledWith(
        res,
        'Authentication failed'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should include Firebase provider in user context', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer provider-token-with-sufficient-length-to-pass-basic-validation' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      const mockDecodedToken = {
        uid: 'user123',
        email: 'test@example.com',
        firebase: { provider: 'google.com' },
        exp: Date.now() / 1000 + 3600
      };

      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      await verifyToken(req, res, next);

      expect(req.user.provider).toBe('google.com');
      expect(next).toHaveBeenCalled();
    });

    it('should use production logging in production environment', async () => {
      process.env.NODE_ENV = 'production';
      
      const req = createMockRequest({
        headers: { authorization: 'Bearer production-token-with-sufficient-length-to-pass-basic-validation' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      const mockDecodedToken = {
        uid: 'user123',
        email: 'test@example.com',
        exp: Date.now() / 1000 + 3600
      };

      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      await verifyToken(req, res, next);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Auth success: tes***')
      );
      expect(next).toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    let mockVerifyIdToken;

    beforeEach(() => {
      mockVerifyIdToken = mockAdmin.auth().verifyIdToken;
    });

    it('should continue as guest when no authorization header', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      await optionalAuth(req, res, next);

      expect(req.user).toBe(null);
      expect(req.isGuest).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    it('should verify token when authorization header provided', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-optional-token-with-sufficient-length-to-pass-validation' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      const mockDecodedToken = {
        uid: 'user123',
        email: 'test@example.com',
        exp: Date.now() / 1000 + 3600
      };

      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      await optionalAuth(req, res, next);

      expect(req.user).not.toBe(null);
      expect(req.isGuest).toBe(false);
      expect(next).toHaveBeenCalled();
    });

    it('should continue as guest when token verification fails', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer invalid-optional-token-with-sufficient-length-to-pass-validation' }
      });
      const res = createMockResponse();
      const next = jest.fn();

      const authError = new Error('Token invalid');
      mockVerifyIdToken.mockRejectedValue(authError);

      await optionalAuth(req, res, next);

      expect(req.user).toBe(null);
      expect(req.isGuest).toBe(true);
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Optional auth failed, continuing as guest:')
      );
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access for users with correct role', () => {
      const middleware = requireRole(USER_ROLES.TEACHER);
      const req = createMockRequest();
      req.user = { email: 'teacher@example.com', role: USER_ROLES.TEACHER };
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Role check passed: teacher')
      );
    });

    it('should allow access for users with any of multiple required roles', () => {
      const middleware = requireRole([USER_ROLES.TEACHER, USER_ROLES.ADMIN]);
      const req = createMockRequest();
      req.user = { email: 'admin@example.com', role: USER_ROLES.ADMIN };
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for users without required role', () => {
      const middleware = requireRole(USER_ROLES.ADMIN);
      const req = createMockRequest();
      req.user = { email: 'student@example.com', role: USER_ROLES.STUDENT };
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(mockResponses.forbidden).toHaveBeenCalledWith(
        res,
        'Insufficient permissions'
      );
      expect(next).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Role check failed')
      );
    });

    it('should deny access for unauthenticated users', () => {
      const middleware = requireRole(USER_ROLES.STUDENT);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(mockResponses.unauthorized).toHaveBeenCalledWith(
        res,
        'Authentication required'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should default to student role when user has no role', () => {
      const middleware = requireRole(USER_ROLES.STUDENT);
      const req = createMockRequest();
      req.user = { email: 'user@example.com' }; // No role specified
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should allow access for users with required permission', () => {
      const middleware = requirePermission(PERMISSIONS.WRITE);
      const req = createMockRequest();
      req.user = { 
        email: 'user@example.com', 
        permissions: [PERMISSIONS.READ, PERMISSIONS.WRITE] 
      };
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Permission check passed: write')
      );
    });

    it('should allow access for users with any of multiple required permissions', () => {
      const middleware = requirePermission([PERMISSIONS.MODERATE, PERMISSIONS.ADMIN]);
      const req = createMockRequest();
      req.user = { 
        email: 'moderator@example.com', 
        permissions: [PERMISSIONS.READ, PERMISSIONS.MODERATE] 
      };
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for users without required permission', () => {
      const middleware = requirePermission(PERMISSIONS.DELETE);
      const req = createMockRequest();
      req.user = { 
        email: 'user@example.com', 
        permissions: [PERMISSIONS.READ] 
      };
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(mockResponses.forbidden).toHaveBeenCalledWith(
        res,
        'Insufficient permissions'
      );
      expect(next).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Permission check failed')
      );
    });

    it('should deny access for unauthenticated users', () => {
      const middleware = requirePermission(PERMISSIONS.READ);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(mockResponses.unauthorized).toHaveBeenCalledWith(
        res,
        'Authentication required'
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should default to read permission when user has no permissions', () => {
      const middleware = requirePermission(PERMISSIONS.READ);
      const req = createMockRequest();
      req.user = { email: 'user@example.com' }; // No permissions specified
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireOwnership', () => {
    it('should allow access when ownership check passes', async () => {
      const ownershipCheck = jest.fn().mockResolvedValue(true);
      const middleware = requireOwnership(ownershipCheck);
      
      const req = createMockRequest({ params: { id: 'resource123' } });
      req.user = { uid: 'user123', email: 'owner@example.com' };
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(ownershipCheck).toHaveBeenCalledWith(
        req.user,
        req.params,
        req.body
      );
      expect(next).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Ownership check passed')
      );
    });

    it('should deny access when ownership check fails', async () => {
      const ownershipCheck = jest.fn().mockResolvedValue(false);
      const middleware = requireOwnership(ownershipCheck);
      
      const req = createMockRequest({ params: { id: 'resource123' } });
      req.user = { uid: 'user456', email: 'notowner@example.com' };
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(mockResponses.forbidden).toHaveBeenCalledWith(
        res,
        'Access denied - not resource owner'
      );
      expect(next).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Ownership check failed')
      );
    });

    it('should handle ownership check errors', async () => {
      const ownershipCheck = jest.fn().mockRejectedValue(new Error('Database error'));
      const middleware = requireOwnership(ownershipCheck);
      
      const req = createMockRequest();
      req.user = { uid: 'user123', email: 'user@example.com' };
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(mockResponses.serverError).toHaveBeenCalledWith(
        res,
        'Authorization check failed'
      );
      expect(next).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Ownership check error:'),
        'Database error'
      );
    });

    it('should deny access for unauthenticated users', async () => {
      const ownershipCheck = jest.fn();
      const middleware = requireOwnership(ownershipCheck);
      
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      await middleware(req, res, next);

      expect(mockResponses.unauthorized).toHaveBeenCalledWith(
        res,
        'Authentication required'
      );
      expect(ownershipCheck).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireEmailVerification', () => {
    it('should allow access for users with verified email', () => {
      const req = createMockRequest();
      req.user = { email: 'verified@example.com', emailVerified: true };
      const res = createMockResponse();
      const next = jest.fn();

      requireEmailVerification(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access for users with unverified email', () => {
      const req = createMockRequest();
      req.user = { email: 'unverified@example.com', emailVerified: false };
      const res = createMockResponse();
      const next = jest.fn();

      requireEmailVerification(req, res, next);

      expect(mockResponses.forbidden).toHaveBeenCalledWith(
        res,
        'Email verification required'
      );
      expect(next).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Email verification required')
      );
    });

    it('should deny access for unauthenticated users', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      requireEmailVerification(req, res, next);

      expect(mockResponses.unauthorized).toHaveBeenCalledWith(
        res,
        'Authentication required'
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('rateLimitAuth', () => {
    it('should allow requests within rate limit', () => {
      const middleware = rateLimitAuth({ maxAttempts: 5, windowMs: 60000 });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block requests exceeding rate limit', () => {
      const middleware = rateLimitAuth({ maxAttempts: 2, windowMs: 60000 });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      // Make 3 requests (exceeding limit of 2)
      middleware(req, res, next);
      middleware(req, res, next);
      middleware(req, res, next);

      expect(mockResponses.rateLimited).toHaveBeenCalledWith(
        res,
        'Too many authentication attempts. Account temporarily blocked.',
        expect.any(Number)
      );
    });

    it('should track requests per IP address', () => {
      const middleware = rateLimitAuth({ maxAttempts: 2, windowMs: 60000 });
      const req1 = createMockRequest({ ip: '192.168.1.1' });
      const req2 = createMockRequest({ ip: '192.168.1.2' });
      const res = createMockResponse();
      const next = jest.fn();

      // Each IP should have its own limit
      middleware(req1, res, next);
      middleware(req1, res, next);
      middleware(req2, res, next);
      middleware(req2, res, next);

      expect(next).toHaveBeenCalledTimes(4);
    });

    it('should use default options when not provided', () => {
      const middleware = rateLimitAuth();
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should clean old attempts outside time window', (done) => {
      const middleware = rateLimitAuth({ maxAttempts: 2, windowMs: 50 });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      // Make 2 requests (at limit)
      middleware(req, res, next);
      middleware(req, res, next);

      // Wait for window to expire, then make another request
      setTimeout(() => {
        middleware(req, res, next);
        expect(next).toHaveBeenCalledTimes(3);
        done();
      }, 60);
    });

    it('should handle blocked IPs with retry time', () => {
      const middleware = rateLimitAuth({ 
        maxAttempts: 1, 
        windowMs: 60000, 
        blockDuration: 120000 
      });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      // Exceed limit to trigger block
      middleware(req, res, next);
      middleware(req, res, next);

      expect(mockResponses.rateLimited).toHaveBeenCalledWith(
        res,
        'Too many authentication attempts. Account temporarily blocked.',
        120
      );
    });
  });

  describe('Convenience middleware', () => {
    it('should define requireAdmin correctly', () => {
      expect(typeof requireAdmin).toBe('function');
      
      const req = createMockRequest();
      req.user = { email: 'admin@example.com', role: USER_ROLES.ADMIN };
      const res = createMockResponse();
      const next = jest.fn();

      requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should define requireEducator correctly', () => {
      expect(typeof requireEducator).toBe('function');
      
      const req = createMockRequest();
      req.user = { email: 'teacher@example.com', role: USER_ROLES.TEACHER };
      const res = createMockResponse();
      const next = jest.fn();

      requireEducator(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should define requireModerator correctly', () => {
      expect(typeof requireModerator).toBe('function');
      
      const req = createMockRequest();
      req.user = { email: 'mod@example.com', role: USER_ROLES.MODERATOR };
      const res = createMockResponse();
      const next = jest.fn();

      requireModerator(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow admin for educator-required endpoints', () => {
      const req = createMockRequest();
      req.user = { email: 'admin@example.com', role: USER_ROLES.ADMIN };
      const res = createMockResponse();
      const next = jest.fn();

      requireEducator(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow admin for moderator-required endpoints', () => {
      const req = createMockRequest();
      req.user = { email: 'admin@example.com', role: USER_ROLES.ADMIN };
      const res = createMockResponse();
      const next = jest.fn();

      requireModerator(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});