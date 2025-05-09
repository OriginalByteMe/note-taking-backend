import { 
  AppError, 
  NotFoundError, 
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  asyncHandler,
  errorHandler
} from '../../../src/middlewares/errorHandler.js';

describe('Error Handler Middleware', () => {
  // Mock response and next objects
  let res, next;

  beforeEach(() => {
    // Prepare mock response
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
    
    // Spy on console.error
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    // Restore console.error
    console.error.mockRestore();
  });

  describe('Custom Error Classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('TEST_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create NotFoundError with correct defaults', () => {
      const error = new NotFoundError();
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('RESOURCE_NOT_FOUND');
    });

    it('should create NotFoundError with custom message', () => {
      const error = new NotFoundError('User not found');
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe('RESOURCE_NOT_FOUND');
    });

    it('should create UnauthorizedError with correct defaults', () => {
      const error = new UnauthorizedError();
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Unauthorized access');
      expect(error.statusCode).toBe(401);
      expect(error.errorCode).toBe('UNAUTHORIZED');
    });

    it('should create ForbiddenError with correct defaults', () => {
      const error = new ForbiddenError();
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Forbidden access');
      expect(error.statusCode).toBe(403);
      expect(error.errorCode).toBe('FORBIDDEN');
    });

    it('should create ValidationError with errors array', () => {
      const validationErrors = [
        { field: 'email', message: 'Email is required' }
      ];
      const error = new ValidationError('Validation failed', validationErrors);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Validation failed');
      expect(error.statusCode).toBe(400);
      expect(error.errorCode).toBe('VALIDATION_ERROR');
      expect(error.errors).toEqual(validationErrors);
    });

    it('should create ConflictError with details', () => {
      const details = {
        clientVersion: 1,
        serverVersion: 2
      };
      const error = new ConflictError('Version conflict', details);
      
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Version conflict');
      expect(error.statusCode).toBe(409);
      expect(error.errorCode).toBe('CONFLICT');
      expect(error.details).toEqual(details);
    });
  });

  describe('asyncHandler', () => {
    it('should pass the result of the function to the next middleware', async () => {
      // Mock request
      const req = {};
      
      // Create a controller function that returns a value
      const controllerFn = jest.fn().mockResolvedValue({ data: 'success' });
      
      // Wrap it in asyncHandler
      const wrappedFn = asyncHandler(controllerFn);
      
      // Set up a mock response object that we can resolve in our controller
      const mockResponse = { json: jest.fn() };
      
      // Call the wrapped function
      await wrappedFn(req, mockResponse, next);
      
      // The original function should have been called
      expect(controllerFn).toHaveBeenCalledWith(req, mockResponse, next);
      
      // Next should not have been called since our mock resolved successfully
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next with error when function throws', async () => {
      // Mock request
      const req = {};
      
      // Create a controller function that throws an error
      const error = new Error('Test error');
      const controllerFn = jest.fn().mockRejectedValue(error);
      
      // Wrap it in asyncHandler
      const wrappedFn = asyncHandler(controllerFn);
      
      // Call the wrapped function
      await wrappedFn(req, res, next);
      
      // The original function should have been called
      expect(controllerFn).toHaveBeenCalledWith(req, res, next);
      
      // Next should have been called with the error
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('errorHandler', () => {
    it('should respond with correct status and message for AppError', () => {
      const error = new AppError('Custom error', 400, 'CUSTOM_ERROR');
      
      // Call the error handler middleware
      errorHandler(error, {}, res, next);
      
      // Check that the error was logged
      expect(console.error).toHaveBeenCalled();
      
      // Check that appropriate error response was sent
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Custom error',
        code: 'CUSTOM_ERROR'
      });
    });

    it('should respond with 404 status for NotFoundError', () => {
      const error = new NotFoundError('Resource not found');
      
      // Call the error handler middleware
      errorHandler(error, {}, res, next);
      
      // Check that appropriate error response was sent
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Resource not found',
        code: 'RESOURCE_NOT_FOUND'
      });
    });

    it('should include validation errors for ValidationError', () => {
      const validationErrors = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is too short' }
      ];
      const error = new ValidationError('Validation failed', validationErrors);
      
      // Call the error handler middleware
      errorHandler(error, {}, res, next);
      
      // Check that appropriate error response was sent
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: validationErrors
      });
    });

    it('should include conflict details for ConflictError', () => {
      const details = {
        clientVersion: 1,
        serverVersion: 2
      };
      const error = new ConflictError('Version conflict', details);
      
      // Call the error handler middleware
      errorHandler(error, {}, res, next);
      
      // Check that appropriate error response was sent
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Version conflict',
        code: 'CONFLICT',
        details
      });
    });

    it('should respond with 500 status for non-operational errors', () => {
      const error = new Error('Unexpected error');
      
      // Call the error handler middleware
      errorHandler(error, {}, res, next);
      
      // Check that appropriate error response was sent
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unexpected error'
      });
    });

    it('should use default message for errors without message', () => {
      const error = new Error();
      error.message = undefined;
      
      // Call the error handler middleware
      errorHandler(error, {}, res, next);
      
      // Check that appropriate error response was sent
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal Server Error'
      });
    });
  });
});
