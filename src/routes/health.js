import express from 'express';
import { sequelize, redisClient } from '../config/index.js';

const router = express.Router();

/**
 * Health check endpoint to verify all services are working
 * Returns:
 * - 200 OK if all services are healthy
 * - 503 Service Unavailable if any service is down
 */
router.get('/', async (req, res) => {
  const health = {
    status: 'UP',
    timestamp: new Date(),
    services: {
      mysql: { status: 'UNKNOWN' },
      redis: { status: 'UNKNOWN' }
    }
  };
  
  try {
    // Check MySQL connection
    await sequelize.authenticate();
    health.services.mysql.status = 'UP';
  } catch (error) {
    health.services.mysql.status = 'DOWN';
    health.services.mysql.error = error.message;
    health.status = 'DOWN';
  }
  
  try {
    // Check Redis connection
    if (!redisClient.isReady) {
      throw new Error('Redis client not ready');
    }
    const pingResult = await redisClient.ping();
    health.services.redis.status = pingResult === 'PONG' ? 'UP' : 'DOWN';
  } catch (error) {
    health.services.redis.status = 'DOWN';
    health.services.redis.error = error.message;
    health.status = 'DOWN';
  }
  
  // Set appropriate HTTP status code
  const httpStatus = health.status === 'UP' ? 200 : 503;
  
  res.status(httpStatus).json(health);
});

export default router;
