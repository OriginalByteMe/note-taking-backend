/**
 * Test utilities and helper functions
 */
import express from 'express';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { authenticate, generateToken } from '../../src/middlewares/auth.js';
import { errorHandler } from '../../src/middlewares/errorHandler.js';
import { db } from '../setup.js';

/**
 * Create an Express application for testing with proper middleware
 * @param {Object} routeConfig - Configuration for the app routes
 * @returns {Object} Express app configured for testing
 */
export const createTestApp = (routeConfig) => {
  const { 
    routesPath, 
    routePrefix = '',
    useAuth = false
  } = routeConfig;
  
  // Create Express app
  const app = express();
  
  // Add standard Express middleware
  app.use(express.json());
  
  // Add authentication middleware if required
  if (useAuth) {
    app.use(routePrefix, authenticate);
  }
  
  // Add routes
  app.use(routePrefix, routesPath);
  
  // Add error handler at the end of middleware chain
  app.use(errorHandler);
  
  return app;
};

/**
 * Create a test user in the database
 * @param {Object} overrides - Properties to override default values
 * @returns {Promise<Object>} The created user object
 */
export async function createTestUser(overrides = {}) {
  if (!db) {
    throw new Error('Database not initialized. Call setupDatabase() first.');
  }

  return db.User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    ...overrides
  });
}

/**
 * Create a test note with versioning support (for optimistic locking)
 * @param {number} userId - User ID who owns the note
 * @param {Object} overrides - Properties to override default values
 * @returns {Promise<Object>} The created note object
 */
export async function createTestNote(userId, overrides = {}) {
  if (!db) {
    throw new Error('Database not initialized. Call setupDatabase() first.');
  }

  const note = await db.Note.create({
    title: 'Test Note',
    content: 'This is a test note content',
    userId,
    version: 1,
    ...overrides
  });

  // Create initial note version
  await db.NoteVersion.create({
    noteId: note.id,
    title: note.title,
    content: note.content,
    version: 1,
    createdBy: userId
  });

  return note;
}

/**
 * Mock a database error for testing error handling
 * @param {string} modelName - Name of the model to mock (e.g., 'User')
 * @param {string} methodName - Name of the method to mock (e.g., 'findOne')
 * @returns {Object} The original method for restoring later
 */
export function mockDbError(modelName, methodName) {
  if (!db || !db[modelName] || !db[modelName][methodName]) {
    throw new Error(`Method ${methodName} not found on model ${modelName}`);
  }
  
  const original = db[modelName][methodName];
  db[modelName][methodName] = jest.fn().mockRejectedValue(new Error('Database error'));
  
  return original;
}

/**
 * Restore an original method after mocking
 * @param {string} modelName - Name of the model to restore
 * @param {string} methodName - Name of the method to restore
 * @param {Function} originalMethod - The original method to restore
 */
export function restoreDbMethod(modelName, methodName, originalMethod) {
  if (!db || !db[modelName]) {
    throw new Error(`Model ${modelName} not found`);
  }
  
  db[modelName][methodName] = originalMethod;
}

/**
 * Create a test request object with supertest
 * @param {Object} app - Express application
 * @returns {Object} Supertest request object
 */
export const createTestRequest = (app) => {
  return request(app);
};

/**
 * Add authentication token to a request
 * @param {Object} request - Supertest request object  
 * @param {Object} user - User object to generate token for
 * @returns {Object} Request with auth header set
 */
export const withAuth = (request, user) => {
  const token = generateToken(user);
  return request.set('Authorization', `Bearer ${token}`);
};

/**
 * Create standard test user data
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} User data object
 */
export const createUserData = (overrides = {}) => {
  return {
    username: faker.internet.userName(),
    email: faker.internet.email(),
    password: faker.internet.password(12),
    ...overrides
  };
};


/**
 * Create test note data with version for optimistic locking
 * @param {Number} userId - User ID who owns the note
 * @param {Object} overrides - Properties to override defaults
 * @returns {Object} Note data object
 */
export const createNoteData = (userId, overrides = {}) => {
  return {
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(2),
    userId,
    version: 1, // Version for optimistic locking
    ...overrides
  };
};

/**
 * Mock the findOne method on a model (useful for testing db errors)
 * @param {Object} model - The database model to mock
 * @param {Function} mockFn - The mock implementation
 * @returns {Function} The original function for restoration
 */
export const mockModelMethod = (model, method, mockFn) => {
  const original = model[method];
  model[method] = mockFn;
  return original;
};
