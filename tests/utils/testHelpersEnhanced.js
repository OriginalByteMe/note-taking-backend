/**
 * Enhanced Test utilities and helper functions
 * Combines existing test helpers with new utility functions
 */
import express from 'express';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { authenticate, generateToken } from '../../src/middlewares/auth.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { db } from '../setup.js';
import app from '../../src/app.js';

// Export all existing helpers from the original file
export * from './testHelpers.js';

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
  const { body, query, token: providedToken, user } = options;
  
  // If no token provided, create a test user and generate token
  let token = providedToken;
  if (!token && user) {
    token = generateToken(user);
  } else if (!token) {
    // Create a new user if needed
    const newUser = await db.User.create({
      username: `testuser_${Date.now()}`,
      email: `testuser_${Date.now()}@example.com`,
      password: 'hashedpassword123'
    });
    token = generateToken(newUser);
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

/**
 * Clean up test data created during tests
 * @param {Object} data - Object containing arrays of test data to clean up
 * @returns {Promise<void>}
 */
export const cleanupTestData = async (data = {}) => {
  const { users = [], notes = [], noteVersions = [] } = data;
  
  // Clean up note versions
  if (noteVersions.length) {
    await db.NoteVersion.destroy({
      where: { id: noteVersions.map(v => v.id) }
    });
  } else if (notes.length) {
    // If no specific versions provided, clean up based on notes
    await db.NoteVersion.destroy({
      where: { noteId: notes.map(n => n.id) }
    });
  }
  
  // Clean up notes
  if (notes.length) {
    await db.Note.destroy({
      where: { id: notes.map(n => n.id) }
    });
  } else if (users.length) {
    // If no specific notes provided, clean up based on users
    await db.Note.destroy({
      where: { userId: users.map(u => u.id) }
    });
  }
  
  // Clean up users
  if (users.length) {
    await db.User.destroy({
      where: { id: users.map(u => u.id) }
    });
  }
};
