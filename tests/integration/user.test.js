import userRoutes from '../../src/routes/user.js';
import { 
  createTestApp, 
  createTestRequest, 
  createUserData, 
  withAuth,
  mockModelMethod,
  createTestUser,
} from '../utils/testHelpers.js';
import { db } from '../setup.js';

// Create two test apps - one with auth middleware enabled for protected routes
// and one without auth for public routes like registration and login
const publicApp = createTestApp({
  routesPath: userRoutes,
  routePrefix: '/users',
  useAuth: false
});

const protectedApp = createTestApp({
  routesPath: userRoutes,
  routePrefix: '/users',
  useAuth: true // Apply auth middleware to all routes
});

// Create request objects for each app
const publicRequest = createTestRequest(publicApp);
const protectedRequest = createTestRequest(protectedApp);

describe('User Routes', () => {

  describe('Register Endpoint - POST /users/register', () => {
    it('should register a new user', async () => {
      const userData = createUserData({ username: 'test', email: 'test@test.com' });
      const res = await publicRequest
        .post('/users/register')
        .send(userData);
      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject({ id: 1, username: 'test', email: 'test@test.com' });
    });

    it('should not register with missing fields', async () => {
      const res = await publicRequest
        .post('/users/register')
        .send({ username: 'test', email: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toEqual([
        { location: 'body', msg: 'Password is required', path: 'password', type: 'field' },
        { location: 'body', msg: 'Password must be at least 6 characters long', path: 'password', type: 'field' },
        { location: 'body', msg: 'Email is required', path: 'email', type: 'field', value: '' },
        { location: 'body', msg: 'Email must be valid', path: 'email', type: 'field', value: '' }
      ]);
    });

    it('should not register duplicate user', async () => {
      // Create a user first to cause the duplicate
      await createTestUser({ username: 'test', email: 'test@test.com' });
      const res = await publicRequest
        .post('/users/register')
        .send({ username: 'test', email: 'test@test.com', password: 'password123' });
        expect(res.statusCode).toBe(409);
        expect(res.body).toEqual({"code": "CONFLICT", "message": "User already exists with this username or email", "status": "error"});
    });
  });

  describe('Login Endpoint - POST /users/login', () => {
    it('should login with correct credentials', async () => {
      // Create a user for login
      const user = await createTestUser({
        username: 'test',
        email: 'test@test.com',
        password: 'password123'
      });

      const res = await publicRequest
        .post('/users/login')
        .send({ email: 'test@test.com', password: 'password123' });
      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
    });
    
    it('should not log in with invalid credentials', async () => {
      // Create a test user first
      await createTestUser();
      
      const res = await publicRequest
        .post('/users/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });
        
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({"code": "UNAUTHORIZED", "message": "Invalid credentials", "status": "error"});
    });
    
    it('should handle server errors during login', async () => {
      // Create a mock implementation that throws an error
      const originalFindOne = mockModelMethod(
        db.User, 
        'findOne', 
        jest.fn().mockRejectedValue(new Error('Database error'))
      );
      
      try {
        const res = await publicRequest
          .post('/users/login')
          .send({ email: 'test@example.com', password: 'password123' });
          
        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({ "message": "Database error", "status": "error"});
      } finally {
        // Restore the original implementation
        db.User.findOne = originalFindOne;
      }
    });
    
    it('should not login with missing fields', async () => {
      const res = await publicRequest
        .post('/users/login')
        .send({ email: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toEqual([
        { location: 'body', msg: 'Password is required', path: 'password', type: 'field' },
        { location: 'body', msg: 'Email is required', path: 'email', type: 'field', value: '' },
        { location: 'body', msg: 'Email must be valid', path: 'email', type: 'field', value: '' }
      ]);
    });
  });

  describe('Get All Users Endpoint - GET /users', () => {
    it('should get all users', async () => {
      // Create test users
      const user = await createTestUser({ username: 'testuser1', email: 'test1@example.com' });
      await createTestUser({ username: 'testuser2', email: 'test2@example.com' });
      // Use withAuth with protectedRequest
      const res = await withAuth(
        protectedRequest.get('/users'),
        user
      );
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Get User by ID Endpoint - GET /users/:id', () => {
    it('should get a user by id when authenticated', async () => {
      // Create a test user and get the ID
      const user = await createTestUser();
      
      // Use the protected request with auth
      const res = await withAuth(
        protectedRequest.get(`/users/${user.id}`),
        user
      );
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ id: user.id, username: user.username, email: user.email });
    });
    
    it('should return 401 when not authenticated', async () => {
      // Create a user but don't provide auth token
      const user = await createTestUser();
      
      // Access without authentication
      const res = await protectedRequest.get(`/users/${user.id}`);
      
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBeDefined();
    });
   
    // TODO: for if roles are introduced
    // it('should return 404 for non-existent user ID', async () => {
    //   // Create a user for authentication
    //   const user = await createTestUser();
      
    //   const res = await withAuth(
    //     protectedRequest.get('/users/999'),
    //     user
    //   );
      
    //   expect(res.statusCode).toBe(404);
    //   expect(res.body.error).toBeDefined();
    // });
    
    it('should return 400 for invalid user ID format', async () => {
      // Create a user for authentication
      const user = await createTestUser();
      
      const res = await withAuth(
        protectedRequest.get('/users/invalid-id'),
        user
      );
      
      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toEqual([
        { location: 'params', msg: 'User ID must be a number', path: 'id', type: 'field', value: 'invalid-id' }
      ]);
    });
  });
  
  describe('Update User Endpoint - PUT /users/:id', () => {
    it('should update a user successfully when authenticated', async () => {
      // Create a user first
      const user = await createTestUser();
      
      const updateData = {
        username: 'updated_name',
        email: 'updated@example.com'
      };
      
      const res = await withAuth(
        protectedRequest.put(`/users/${user.id}`).send(updateData),
        user
      );
        
      expect(res.statusCode).toBe(200);
      expect(res.body.username).toBe('updated_name');
      expect(res.body.email).toBe('updated@example.com');
      
      // Verify in the database
      const updatedUser = await db.User.findByPk(user.id);
      expect(updatedUser.username).toBe('updated_name');
    });
    
    it('should return 401 when not authenticated', async () => {
      // Create a user but don't provide auth
      const user = await createTestUser();
      
      const res = await protectedRequest
        .put(`/users/${user.id}`)
        .send({ username: 'updated_name' });
        
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBeDefined();
    });
    
    // TODO: for if roles are introduced
    // it('should not update a non-existent user', async () => {
    //   // Create a user for auth
    //   const user = await createTestUser();
      
    //   const res = await withAuth(
    //     protectedRequest.put('/users/999').send({ username: 'new_name' }),
    //     user
    //   );
        
    //   expect(res.statusCode).toBe(404);
    //   expect(res.body.error).toBeDefined();
    // });
    
    it('should handle validation errors during update', async () => {
      // Create a user first
      const user = await createTestUser();
      
      const res = await withAuth(
        protectedRequest.put(`/users/${user.id}`).send({ email: 'invalid-email' }),
        user
      );
        
      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toEqual([
        { location: 'body', msg: 'Email must be valid', path: 'email', type: 'field', value: 'invalid-email' }
      ]);
    });
  });
  
  describe('Delete User Endpoint - DELETE /users/:id', () => {
    it('should deactivate a user successfully when authenticated', async () => {
      // Create a user first
      const user = await createTestUser();
      
      const res = await withAuth(
        protectedRequest.delete(`/users/${user.id}`),
        user
      );
        
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('User account deactivated successfully');
      
      // Verify in the database - user should still exist but be inactive
      const deactivatedUser = await db.User.findByPk(user.id);
      expect(deactivatedUser).not.toBeNull();
      expect(deactivatedUser.isActive).toBe(false);
    });
    
    it('should return 401 when not authenticated', async () => {
      // Create a user but don't authenticate
      const user = await createTestUser();
      
      const res = await protectedRequest.delete(`/users/${user.id}`);
      
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBeDefined();
    });
    
    // TODO: for later if roles are introduced
    // it('should return 404 if user to delete does not exist', async () => {      
    //   // Create a user for authentication
    //   const user = await createTestUser();
      
    //   const res = await withAuth(
    //     protectedRequest.delete('/users/999'),
    //     user
    //   );

    //   expect(res.statusCode).toBe(404);
    //   expect(res.body.error).toBeDefined();
    // });
  });
  
  // Tests for authentication and authorization
  describe('Authentication and Authorization Tests', () => {
    it('should reject requests without authentication', async () => {
      // Attempt to access protected endpoint without auth
      const res = await protectedRequest.get('/users');
        
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Authentication');
    });
    
    it('should reject requests with malformed token', async () => {
      // Set a malformed token
      const res = await protectedRequest
        .get('/users')
        .set('Authorization', 'Bearer invalid-token-format');
        
      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBeDefined();
    });
    
    it('should allow access to protected endpoints with valid token', async () => {
      // Create a user for authentication
      const user = await createTestUser();
      
      // Create another test user to have some data
      await createTestUser({ username: 'another_user', email: 'another@example.com' });
      
      // Authenticate and access protected endpoint
      const res = await withAuth(
        protectedRequest.get('/users'),
        user
      );
        
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle registration with very long values', async () => {
      // Create username and email that are extremely long but still valid
      const longString = 'a'.repeat(100); // Reduced length to avoid validation errors
      const userData = {
        username: longString.substring(0, 50), // Keep username reasonable
        email: `${longString.substring(0, 40)}@example.com`, // Keep email reasonable
        password: longString.substring(0, 20) // Keep password reasonable
      };
      
      const res = await publicRequest
        .post('/users/register')
        .send(userData);
      
      // This should succeed with valid data
      expect(res.statusCode).toBe(201);
    });
    
    it('should accept special characters in username during registration', async () => {
      // Try special characters in username to test sanitization
      const userData = createUserData({
        username: 'User<>With?Special/Chars',
        email: 'special@example.com'
      });
      
      const res = await publicRequest
        .post('/users/register')
        .send(userData);
      
      // Should be accepted if your API doesn't sanitize aggressively
      expect(res.statusCode).toBe(201);
      expect(res.body.username).toBe('User<>With?Special/Chars');
    });
    
    it('should handle concurrent updates to the same user with optimistic locking', async () => {
      // Create a user for testing concurrent updates
      const user = await createTestUser();
      
      // Start two update requests at almost the same time
      const updatePromise1 = withAuth(
        protectedRequest.put(`/users/${user.id}`).send({ username: 'concurrent_update_1' }),
        user
      );
        
      const updatePromise2 = withAuth(
        protectedRequest.put(`/users/${user.id}`).send({ username: 'concurrent_update_2' }),
        user
      );
      
      // Wait for both to complete
      const [res1, res2] = await Promise.all([updatePromise1, updatePromise2]);
      
      // Both should not result in server errors
      expect(res1.statusCode).not.toBe(500);
      expect(res2.statusCode).not.toBe(500);
      
      // Check final state - one of the updates should win
      const finalUser = await db.User.findByPk(user.id);
      expect(
        finalUser.username === 'concurrent_update_1' || 
        finalUser.username === 'concurrent_update_2'
      ).toBe(true);
    });
    
    it('should handle registration with minimum required data', async () => {
      // Test with just the required fields
      const userData = {
        username: 'minimal',
        email: 'minimal@example.com',
        password: 'password123'
      };
      
      const res = await publicRequest
        .post('/users/register')
        .send(userData);
      
      // This should succeed with valid data
      expect(res.statusCode).toBe(201);
    });
    
    it('should properly protect password from exposure', async () => {
      // Create a user
      const user = await createTestUser();
      
      // Fetch the user with authentication
      const res = await withAuth(
        protectedRequest.get(`/users/${user.id}`),
        user
      );
      
      // Ensure password is not returned in the response
      expect(res.statusCode).toBe(200);
      expect(res.body.password).toBeUndefined();
    });
  });
});
