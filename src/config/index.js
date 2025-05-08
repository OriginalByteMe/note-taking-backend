import { db, sequelize, initialize } from './database.js';
import redisClient from '../cache/redis.js';

const initializeConnections = async () => {
  try {
    // Initialize database and models
    await initialize();
    
    // Redis client handles its own connection in cache/redis.js
    console.log('All database connections initialized');
    return {
      db,
      sequelize,
      redisClient
    };
  } catch (error) {
    console.error('Failed to initialize connections:', error);
    throw error;
  }
};

export { sequelize, redisClient, initializeConnections, db };
