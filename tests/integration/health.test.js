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

describe('Health Check Endpoint', () => {
  let app;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Create a fresh Express app with just the health route for each test
    app = express();
    app.use('/health', healthRoutes);
  });

  it('should return 200 and UP status when all services are healthy', async () => {
    // Mock successful responses
    sequelize.authenticate.mockResolvedValue();
    redisClient.ping.mockResolvedValue('PONG');
    
    const res = await request(app).get('/health');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.services.mysql.status).toBe('UP');
    expect(res.body.services.redis.status).toBe('UP');
  });

  it('should return 503 when MySQL is down', async () => {
    // Mock MySQL error
    sequelize.authenticate.mockRejectedValue(new Error('Connection error'));
    redisClient.ping.mockResolvedValue('PONG');
    
    const res = await request(app).get('/health');
    
    expect(res.statusCode).toBe(503);
    expect(res.body.status).toBe('DOWN');
    expect(res.body.services.mysql.status).toBe('DOWN');
    expect(res.body.services.mysql.error).toBe('Connection error');
    expect(res.body.services.redis.status).toBe('UP');
  });

  it('should return 503 when Redis is down', async () => {
    // Mock Redis error
    sequelize.authenticate.mockResolvedValue();
    redisClient.ping.mockRejectedValue(new Error('Redis error'));
    
    const res = await request(app).get('/health');
    
    expect(res.statusCode).toBe(503);
    expect(res.body.status).toBe('DOWN');
    expect(res.body.services.mysql.status).toBe('UP');
    expect(res.body.services.redis.status).toBe('DOWN');
    expect(res.body.services.redis.error).toBe('Redis error');
  });

  it('should return 503 when Redis client is not ready', async () => {
    // Mock Redis not ready
    sequelize.authenticate.mockResolvedValue();
    redisClient.isReady = false;
    
    const res = await request(app).get('/health');
    
    expect(res.statusCode).toBe(503);
    expect(res.body.status).toBe('DOWN');
    expect(res.body.services.mysql.status).toBe('UP');
    expect(res.body.services.redis.status).toBe('DOWN');
    expect(res.body.services.redis.error).toBe('Redis client not ready');
  });

  it('should return 503 when both MySQL and Redis are down', async () => {
    // Mock both services down
    sequelize.authenticate.mockRejectedValue(new Error('Connection error'));
    redisClient.ping.mockRejectedValue(new Error('Redis error'));
    
    const res = await request(app).get('/health');
    
    expect(res.statusCode).toBe(503);
    expect(res.body.status).toBe('DOWN');
    expect(res.body.services.mysql.status).toBe('DOWN');
    expect(res.body.services.redis.status).toBe('DOWN');
  });

  it('should include a timestamp in the response', async () => {
    // Mock successful responses
    sequelize.authenticate.mockResolvedValue();
    redisClient.ping.mockResolvedValue('PONG');
    
    const res = await request(app).get('/health');
    
    expect(res.body.timestamp).toBeDefined();
    expect(new Date(res.body.timestamp)).toBeInstanceOf(Date);
  });
});
