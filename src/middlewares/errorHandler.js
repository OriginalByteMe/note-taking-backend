/**
 * Custom error class for application-specific errors
 */
export class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // Indicates this is an expected error

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error for resource not found
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'RESOURCE_NOT_FOUND');
  }
}

/**
 * Error for unauthorized access
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Error for forbidden access
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Error for conflict situations (e.g., optimistic locking conflicts)
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, 'CONFLICT');
    this.details = details;
  }
}

/**
 * Async handler to wrap controller functions and pass errors to next()
 * @param {Function} fn - Controller function to wrap
 * @returns {Function} - Express middleware function
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware for Express
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default status code and error message
  const statusCode = err.statusCode || 500;
  
  // Response structure
  const errorResponse = {
    status: 'error',
    message: err.message || 'Internal Server Error'
  };

  // Add error code if available
  if (err.errorCode) {
    errorResponse.code = err.errorCode;
  }

  // Add validation errors if available (for validation errors)
  if (err.errors) {
    errorResponse.errors = err.errors;
  }

  // Add conflict details if available (for optimistic locking)
  if (err.details) {
    errorResponse.details = err.details;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};
