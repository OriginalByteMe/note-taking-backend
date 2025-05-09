import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Support for ES modules in Node.js
// Load env variables from .env file if present (will not override existing env vars)
try {
  dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env') });
} catch (error) {
  console.log('No .env file found or error loading it, using environment variables');
}

// For debugging
console.log(`Using database connection info - Host: ${process.env.DB_HOST}, Database: ${process.env.DB_NAME}`);

const config = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || null,
    database: process.env.DB_NAME || 'notesdb_dev',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    // added for more reliable transaction testing
    transactionType: 'IMMEDIATE',
  },
  production: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || null,
    database: process.env.DB_NAME || 'notesdb_prod',
    host: process.env.DB_HOST || '127.0.0.1',
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
};

// For CommonJS compatibility (used by sequelize-cli)
export default config;

// For Sequelize CLI which uses CommonJS
if (typeof module !== 'undefined') {
  module.exports = config;
}
