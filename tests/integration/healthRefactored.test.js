import request from 'supertest';
import express from 'express';
import healthRoutes from '../../src/routes/health.js';
import { sequelize, redisClient } from '../../src/config/index.js';

// Mock the sequelize and redisClient
jest.mock('../../src/config/index.js', () => {
  const mockSequelize = {
    authenticate: jest.fn()
  };
  const mockRedisClient = {
    isReady: true,
    ping: jest.fn()
  };
  return {
    sequelize: mockSequelize,
    redisClient: mockRedisClient
  };
});

/**
 * Enhanced health check tests with improved assertions and utilities
 */
describe('Health Check Endpoint (Refactored)', () => {
  let app;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Create a fresh Express app with just the health route for each test
    app = express();
    app.use('/health', healthRoutes);
  });

  /**
   * Test helper for health endpoint testing
   * @param {Object} options - Test options
   * @param {boolean} options.mysqlHealthy - Whether MySQL should be healthy
   * @param {boolean} options.redisHealthy - Whether Redis should be healthy
   * @param {number} options.expectedStatus - Expected HTTP status code
   * @returns {Promise<Object>} Test response
   */
  const testHealthEndpoint = async ({ 
    mysqlHealthy = true, 
    redisHealthy = true,
    expectedStatus = 200 
  }) => {
    // Configure mock responses based on health status
    if (mysqlHealthy) {
      sequelize.authenticate.mockResolvedValue();
    } else {
      sequelize.authenticate.mockRejectedValue(new Error('Connection error'));
    }
    
    if (redisHealthy) {
      redisClient.ping.mockResolvedValue('PONG');
    } else {
      redisClient.ping.mockRejectedValue(new Error('Redis error'));
    }
    
    // Make request
    const response = await request(app).get('/health');
    
    // Basic assertions
    expect(response.statusCode).toBe(expectedStatus);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('services');
    expect(response.body.services).toHaveProperty('mysql');
    expect(response.body.services).toHaveProperty('redis');
    
    return response;
  };

  it('should return 200 and UP status when all services are healthy', async () => {
    const response = await testHealthEndpoint({
      mysqlHealthy: true,
      redisHealthy: true,
      expectedStatus: 200
    });
    
    expect(response.body.status).toBe('UP');
    expect(response.body.services.mysql.status).toBe('UP');
    expect(response.body.services.redis.status).toBe('UP');
    
    // Verify mocks were called
    expect(sequelize.authenticate).toHaveBeenCalledTimes(1);
    expect(redisClient.ping).toHaveBeenCalledTimes(1);
  });

  it('should return 503 when MySQL is down', async () => {
    const response = await testHealthEndpoint({
      mysqlHealthy: false,
      redisHealthy: true,
      expectedStatus: 503
    });
    
    expect(response.body.status).toBe('DOWN');
    expect(response.body.services.mysql.status).toBe('DOWN');
    expect(response.body.services.mysql).toHaveProperty('error');
    expect(response.body.services.redis.status).toBe('UP');
  });

  it('should return 503 when Redis is down', async () => {
    const response = await testHealthEndpoint({
      mysqlHealthy: true,
      redisHealthy: false,
      expectedStatus: 503
    });
    
    expect(response.body.status).toBe('DOWN');
    expect(response.body.services.mysql.status).toBe('UP');
    expect(response.body.services.redis.status).toBe('DOWN');
    expect(response.body.services.redis).toHaveProperty('error');
  });

  it('should return 503 when both services are down', async () => {
    const response = await testHealthEndpoint({
      mysqlHealthy: false,
      redisHealthy: false,
      expectedStatus: 503
    });
    
    expect(response.body.status).toBe('DOWN');
    expect(response.body.services.mysql.status).toBe('DOWN');
    expect(response.body.services.mysql).toHaveProperty('error');
    expect(response.body.services.redis.status).toBe('DOWN');
    expect(response.body.services.redis).toHaveProperty('error');
  });

  it('should include a timestamp in the response', async () => {
    const response = await testHealthEndpoint({
      mysqlHealthy: true,
      redisHealthy: true
    });
    
    // Verify the response has a timestamp
    expect(response.body).toHaveProperty('timestamp');
    
    // Validate the timestamp is a valid ISO string
    expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
  });
});
