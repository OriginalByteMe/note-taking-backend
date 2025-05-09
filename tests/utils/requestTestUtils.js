/**
 * Request Test Utilities
 * Helpers for HTTP integration testing with supertest
 */
import request from 'supertest';
import app from '../../src/app.js';
import { createTestUser } from './testDataGenerator.js';

/**
 * Make an authenticated request to the API
 * @param {string} method - HTTP method (get, post, put, delete)
 * @param {string} endpoint - API endpoint to call
 * @param {Object} options - Request options
 * @param {Object} options.body - Request body
 * @param {Object} options.query - Query parameters
 * @param {string} options.token - Auth token (if not provided, a new user will be created)
 * @returns {Promise<Object>} Supertest response
 */
export const authenticatedRequest = async (method, endpoint, options = {}) => {
  const { body, query, token: providedToken } = options;
  
  // If no token provided, create a test user and generate token
  let token = providedToken;
  if (!token) {
    const { token: newToken } = await createTestUser();
    token = newToken;
  }
  
  // Build the request
  let req = request(app)[method](endpoint);
  
  // Add auth header
  req = req.set('Authorization', `Bearer ${token}`);
  
  // Add query parameters if provided
  if (query) {
    req = req.query(query);
  }
  
  // Add body if provided and method supports it
  if (body && ['post', 'put', 'patch'].includes(method)) {
    req = req.send(body);
  }
  
  return await req;
};

/**
 * Convenience methods for common HTTP verbs
 */
export const get = (endpoint, options) => authenticatedRequest('get', endpoint, options);
export const post = (endpoint, options) => authenticatedRequest('post', endpoint, options);
export const put = (endpoint, options) => authenticatedRequest('put', endpoint, options);
export const del = (endpoint, options) => authenticatedRequest('delete', endpoint, options);

/**
 * Test a validation error response
 * @param {Object} response - Supertest response object
 */
export const expectValidationError = (response) => {
  expect(response.status).toBe(400);
  expect(response.body).toHaveProperty('status', 'error');
  expect(response.body).toHaveProperty('message', 'Validation failed');
  expect(response.body).toHaveProperty('errors');
  expect(Array.isArray(response.body.errors)).toBe(true);
};

/**
 * Test an unauthorized error response
 * @param {Object} response - Supertest response object
 */
export const expectUnauthorized = (response) => {
  expect(response.status).toBe(401);
  expect(response.body).toHaveProperty('error');
};

/**
 * Test a not found error response
 * @param {Object} response - Supertest response object
 */
export const expectNotFound = (response) => {
  expect(response.status).toBe(404);
  expect(response.body).toHaveProperty('error');
};

/**
 * Test a conflict error response
 * @param {Object} response - Supertest response object
 */
export const expectConflict = (response) => {
  expect(response.status).toBe(409);
  expect(response.body).toHaveProperty('error');
  expect(response.body).toHaveProperty('clientVersion');
  expect(response.body).toHaveProperty('serverVersion');
};
