import express from 'express';
import { sequelize, redisClient } from '../config/index.js';

const router = express.Router();

/**
 * @api {get} /health Health check
 * @apiName HealthCheck
 * @apiGroup System
 * @apiVersion 1.0.0
 *
 * @apiDescription Check the health status of all services (MySQL and Redis)
 *
 * @apiSuccess {String} status Overall system status (UP/DOWN)
 * @apiSuccess {Date} timestamp Current timestamp of the health check
 * @apiSuccess {Object} services Status of individual services
 * @apiSuccess {Object} services.mysql MySQL database status
 * @apiSuccess {String} services.mysql.status Status of MySQL (UP/DOWN/UNKNOWN)
 * @apiSuccess {String} [services.mysql.error] Error message if MySQL is down
 * @apiSuccess {Object} services.redis Redis cache status
 * @apiSuccess {String} services.redis.status Status of Redis (UP/DOWN/UNKNOWN)
 * @apiSuccess {String} [services.redis.error] Error message if Redis is down
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "status": "UP",
 *       "timestamp": "2025-05-09T15:23:45.000Z",
 *       "services": {
 *         "mysql": { "status": "UP" },
 *         "redis": { "status": "UP" }
 *       }
 *     }
 *
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 503 Service Unavailable
 *     {
 *       "status": "DOWN",
 *       "timestamp": "2025-05-09T15:23:45.000Z",
 *       "services": {
 *         "mysql": { "status": "UP" },
 *         "redis": { 
 *           "status": "DOWN",
 *           "error": "Redis client not ready" 
 *         }
 *       }
 *     }
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
