import { validationResult } from 'express-validator';

/**
 * Middleware to validate requests
 * Validates input against provided rules and returns errors if validation fails
 * @returns Express middleware function
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    // Execute all validations and await results
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next(); // No errors, continue to controller
    }

    // Format and return validation errors
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array()
    });
  };
};
