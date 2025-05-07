import sequelize from './database.js';
import redisClient from '../cache/redis.js';

const initializeConnections = async () => {
  try {

    console.log('All database connections initialized');
    return {
      sequelize,
      redisClient
    };
  } catch (error) {
    console.error('Failed to initialize connections:', error);
    throw error;
  }
};

export { sequelize, redisClient, initializeConnections };
