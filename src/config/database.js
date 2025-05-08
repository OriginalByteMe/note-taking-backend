import { Sequelize } from 'sequelize';
import config from './config.js';
import { initializeModels } from '../models/index.js';

// Environment setup
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging === undefined ? console.log : dbConfig.logging,
    pool: dbConfig.pool || {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Database object to store models
const db = {};


// Database initialization and connection testing
const initialize = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log(`MySQL connection to ${env} database has been established successfully.`);
    
    // Initialize models using the function from models/index.js
    // Pass the sequelize instance to the model loader
    const models = await initializeModels(sequelize);
    
    // Copy all models to our db object
    Object.assign(db, models);
    
    // Attach models to the sequelize instance for direct access
    sequelize.models = db;
    
    console.log('Models initialized successfully.');
    
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Initialize on import (non-blocking)
initialize().catch(err => {
  console.error('Failed to initialize database:', err);
});

export { db, sequelize, initialize };
export default sequelize;
