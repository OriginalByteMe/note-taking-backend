// This file is used by Jest to set up the testing environment
import { setupDatabase, teardownDatabase } from './setup.js';

// Global setup and teardown
beforeAll(async () => {
  await setupDatabase();
});

afterAll(async () => {
  await teardownDatabase();
});
