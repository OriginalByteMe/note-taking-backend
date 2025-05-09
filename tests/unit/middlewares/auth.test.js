// Mock the database module entirely before any imports
jest.mock('../../../src/config/database.js', () => {
  const mockSequelize = {
    sync: jest.fn().mockResolvedValue(),
    authenticate: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    define: jest.fn(),
    query: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockSequelize,
    sequelize: mockSequelize,
    db: {
      User: { findByPk: jest.fn() },
      sequelize: mockSequelize,
    },
    initialize: jest.fn().mockResolvedValue(),
    connectToDatabase: jest.fn().mockResolvedValue(),
  };
});

// Mock JWT library
jest.mock('jsonwebtoken');

// Import modules under test after mocks
const { generateToken, authenticate } = require('../../../src/middlewares/auth.js');
const { db } = require('../../../src/config/database.js');
const jwt = require('jsonwebtoken');

// Prepare request/response/next for each test
let req, res, next;
beforeEach(() => {
  jest.clearAllMocks();
  req = { headers: {} };
  res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  next = jest.fn();
});

// Sample user data for tests
const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com'
};

describe('Authentication Middleware', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      // Mock the sign function to return a test token
      jwt.sign.mockReturnValue('test-token');
      
      const token = generateToken(mockUser);
      
      expect(jwt.sign).toHaveBeenCalledWith(
        { 
          id: mockUser.id, 
          username: mockUser.username, 
          email: mockUser.email 
        },
        expect.any(String),
        { expiresIn: '1h' }
      );
      
      expect(token).toBe('test-token');
    });
  });

  describe('authenticate', () => {
    it('should pass authentication with valid token', async () => {
      // Mock token verification
      jwt.verify.mockReturnValue({ id: mockUser.id });
      
      // Mock user lookup
      db.User.findByPk.mockResolvedValue(mockUser);
      
      // Set authorization header with Bearer token
      req.headers.authorization = 'Bearer valid-token';
      
      // Call the middleware
      await authenticate(req, res, next);
      
      // Check that token was verified
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      
      // Check that user was looked up
      expect(db.User.findByPk).toHaveBeenCalledWith(mockUser.id);
      
      // Check that user was added to the request
      expect(req.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        email: mockUser.email
      });
      
      // Check that next() was called
      expect(next).toHaveBeenCalled();
      
      // Check that response methods were not called
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should return 401 when no authorization header is provided', async () => {
      // No authorization header
      req.headers.authorization = undefined;
      
      // Call the middleware
      await authenticate(req, res, next);
      
      // Check that appropriate error response was sent
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required. Please provide a valid token.'
      });
      
      // Check that next() was not called
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header is not Bearer', async () => {
      // Invalid format
      req.headers.authorization = 'Basic some-credentials';
      
      // Call the middleware
      await authenticate(req, res, next);
      
      // Check that appropriate error response was sent
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication required. Please provide a valid token.'
      });
      
      // Check that next() was not called
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is missing', async () => {
      // Missing token
      req.headers.authorization = 'Bearer ';
      
      // Call the middleware
      await authenticate(req, res, next);
      
      // Check that appropriate error response was sent
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Authentication token is missing'
      });
      
      // Check that next() was not called
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token verification fails', async () => {
      // Mock token verification failure
      jwt.verify.mockImplementation(() => {
        throw { name: 'JsonWebTokenError' };
      });
      
      // Set authorization header with invalid token
      req.headers.authorization = 'Bearer invalid-token';
      
      // Call the middleware
      await authenticate(req, res, next);
      
      // Check that appropriate error response was sent
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid token'
      });
      
      // Check that next() was not called
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', async () => {
      // Mock token expiration
      jwt.verify.mockImplementation(() => {
        throw { name: 'TokenExpiredError' };
      });
      
      // Set authorization header with expired token
      req.headers.authorization = 'Bearer expired-token';
      
      // Call the middleware
      await authenticate(req, res, next);
      
      // Check that appropriate error response was sent
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Token expired'
      });
      
      // Check that next() was not called
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not found', async () => {
      // Mock token verification
      jwt.verify.mockReturnValue({ id: 999 }); // Non-existent user ID
      
      // Mock user not found
      db.User.findByPk.mockResolvedValue(null);
      
      // Set authorization header with valid token
      req.headers.authorization = 'Bearer valid-token';
      
      // Call the middleware
      await authenticate(req, res, next);
      
      // Check that appropriate error response was sent
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User not found'
      });
      
      // Check that next() was not called
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 500 when an unexpected error occurs', async () => {
      // Mock database error
      db.User.findByPk.mockRejectedValue(new Error('Database connection failed'));
      
      // Mock token verification
      jwt.verify.mockReturnValue({ id: mockUser.id });
      
      // Set authorization header with valid token
      req.headers.authorization = 'Bearer valid-token';
      
      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        // Call the middleware
        await authenticate(req, res, next);
        
        // Check that error was logged
        expect(consoleSpy).toHaveBeenCalled();
        
        // Check that appropriate error response was sent
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Internal server error during authentication'
        });
        
        // Check that next() was not called
        expect(next).not.toHaveBeenCalled();
      } finally {
        // Restore console.error
        consoleSpy.mockRestore();
      }
    });
  });
});
