import request from 'supertest';
import express from 'express';
import userRoutes from '../src/routes/user.js';
import { clearDatabase, createTestUser } from './setup.js';
import { db } from '../src/config/database.js';

const app = express();
app.use(express.json());
app.use('/users', userRoutes);

describe('User Routes', () => {
  // Clear database after each test for isolation
  afterEach(async () => {
    await clearDatabase();
  });

  describe('POST /users/register', () => {
    it('should register a new user', async () => {

      const res = await request(app)
        .post('/users/register')
        .send({ username: 'test', email: 'test@test.com', password: 'password123' });
      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject({ id: 1, username: 'test', email: 'test@test.com' });
    });

    it('should not register with missing fields', async () => {
      const res = await request(app)
        .post('/users/register')
        .send({ username: 'test', email: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should not register duplicate user', async () => {
      // Create a user first to cause the duplicate
      await createTestUser({ username: 'test', email: 'test@test.com' });
      const res = await request(app)
        .post('/users/register')
        .send({ username: 'test', email: 'test@test.com', password: 'pass' });
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /users/login', () => {
    it('should login with correct credentials', async () => {
      // Create a user for login
      const user = await createTestUser({
        username: 'test',
        email: 'test@test.com',
        password: 'password123'
      });

      const res = await request(app)
        .post('/users/login')
        .send({ email: 'test@test.com', password: 'password123' });
      expect(res.statusCode).toBe(200);
      expect(res.body.user).toMatchObject({ id: user.id, username: user.username, email: user.email });
    });

    it('should not login with wrong credentials', async () => {
      // Create a user for login
      await createTestUser({
        email: 'test@test.com',
        password: 'password123'
      });
      const res = await request(app)
        .post('/users/login')
        .send({ email: 'test@test.com', password: 'wrong' });
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('should not login with missing fields', async () => {
      const res = await request(app)
        .post('/users/login')
        .send({ email: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /users', () => {
    it('should get all users', async () => {
      // Create test users
      await createTestUser({ username: 'testuser1', email: 'test1@example.com' });
      await createTestUser({ username: 'testuser2', email: 'test2@example.com' });
      const res = await request(app).get('/users');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /users/:id', () => {
    it('should get a user by id', async () => {
      // Create a test user and get the ID
      const user = await createTestUser();
      const res = await request(app).get(`/users/${user.id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ id: user.id, username: user.username, email: user.email });
    });

    it('should return 404 if user not found', async () => {
      const res = await request(app).get('/users/999');
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });
});
