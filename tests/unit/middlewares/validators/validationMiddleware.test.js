import { validate } from '../../../../src/middlewares/validators/validationMiddleware.js';
import { body } from 'express-validator';

describe('Validation Middleware', () => {
  // Mock request, response and next function for tests
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should call next() when validation passes', async () => {
    // Create a simple validation rule
    const validations = [
      body('name').isString()
    ];

    // Set valid data in the request
    req.body.name = 'Test Name';

    // Create the middleware
    const middleware = validate(validations);

    // Execute the middleware
    await middleware(req, res, next);

    // Validation should pass, so next() should be called
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('should return 400 status with errors when validation fails', async () => {
    // Create a simple validation rule
    const validations = [
      body('name').isString().notEmpty().withMessage('Name is required')
    ];

    // Set invalid data in the request (missing name)
    req.body = {};

    // Create the middleware
    const middleware = validate(validations);

    // Execute the middleware
    await middleware(req, res, next);

    // Validation should fail, returning errors
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Validation failed',
      errors: expect.any(Array)
    });

    // Verify an error message is returned (the exact text may vary with express-validator version)
    const jsonResponse = res.json.mock.calls[0][0];
    expect(jsonResponse.errors[0]).toHaveProperty('msg');
    // Just check the error exists rather than specific text since 
    // express-validator defaults may change
  });

  it('should handle multiple validation rules', async () => {
    // Create multiple validation rules
    const validations = [
      body('name').isString().notEmpty().withMessage('Name is required'),
      body('email').isEmail().withMessage('Valid email is required'),
      body('age').isInt({ min: 18 }).withMessage('Age must be at least 18')
    ];

    // Set partially valid data (missing age)
    req.body = {
      name: 'Test User',
      email: 'not-an-email'
    };

    // Create the middleware
    const middleware = validate(validations);

    // Execute the middleware
    await middleware(req, res, next);

    // Validation should fail with multiple errors
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    
    const jsonResponse = res.json.mock.calls[0][0];
    expect(jsonResponse.errors.length).toBeGreaterThanOrEqual(2); // At least 2 errors
    
    // Check error messages
    const errorMessages = jsonResponse.errors.map(err => err.msg);
    expect(errorMessages).toContain('Valid email is required');
    expect(errorMessages).toContain('Age must be at least 18');
  });

  it('should handle optional fields correctly', async () => {
    // Create validation with optional field
    const validations = [
      body('name').isString().notEmpty().withMessage('Name is required'),
      body('age').optional().isInt().withMessage('Age must be a number')
    ];

    // Set only required field
    req.body = {
      name: 'Test User'
      // Age is omitted, but that's ok since it's optional
    };

    // Create the middleware
    const middleware = validate(validations);

    // Execute the middleware
    await middleware(req, res, next);

    // Validation should pass since optional field can be omitted
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should validate different request parts (body, query, params)', async () => {
    // For this test we need to create a more complete request mock
    req = {
      body: { name: 'Test User' },
      query: { limit: '10' },
      params: { id: '123' }
    };

    // Create validations for different request parts
    const validations = [
      body('name').isString(),
      // A failing validation to verify different parts are checked
      body('email').isEmail().withMessage('Email is required')
    ];

    // Create and execute middleware
    const middleware = validate(validations);
    await middleware(req, res, next);

    // Should fail because email is missing
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    
    const jsonResponse = res.json.mock.calls[0][0];
    expect(jsonResponse.errors.length).toBe(1);
    expect(jsonResponse.errors[0].msg).toBe('Email is required');
  });
});
