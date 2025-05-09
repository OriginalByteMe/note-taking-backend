// This file is used by Jest to set up the testing environment
import { setupDatabase, teardownDatabase, clearDatabase } from './setup.js';

// Global setup for all tests
beforeAll(async () => {
  console.log('Setting up database for tests...');
  await setupDatabase();
});

// Clean database between tests
beforeEach(async () => {
  await clearDatabase();
});

// Global teardown after all tests
afterAll(async () => {
  console.log('Tearing down database after tests...');
  await teardownDatabase();
});
