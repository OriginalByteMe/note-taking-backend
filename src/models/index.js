import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Sequelize from 'sequelize';

// For ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const basename = path.basename(__filename);

/**
 * Initializes and loads all models
 * 
 * @param {Sequelize} sequelize - The Sequelize instance from database.js
 * @returns {Object} db - Object containing all models and Sequelize instances
 */
export const initializeModels = async (sequelize) => {
  const db = {};
  
  // Get all model files except index.js
  const modelFiles = fs
    .readdirSync(__dirname)
    .filter(file => {
      return (
        file.indexOf('.') !== 0 &&
        file !== basename &&
        file.slice(-3) === '.js' &&
        file.indexOf('.test.js') === -1
      );
    });

  // Import and initialize each model
  for (const file of modelFiles) {
    try {
      const modulePath = path.join(__dirname, file);
      const module = await import(modulePath);
      const model = module.default(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    } catch (error) {
      console.error(`Error loading model ${file}:`, error);
    }
  }

  // Set up model associations after all models are loaded
  Object.keys(db).forEach(modelName => {
    if (db[modelName].associate) {
      db[modelName].associate(db);
    }
  });

  // Add Sequelize references to the db object
  db.sequelize = sequelize;
  db.Sequelize = Sequelize;
  
  console.log(`Loaded ${Object.keys(db).length - 2} models successfully`);
  
  return db;
};

// Export a dummy db object for compatibility
// The real db will be initialized by database.js
const db = {};
export default db;
