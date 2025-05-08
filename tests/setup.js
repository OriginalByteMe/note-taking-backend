// Fix for unicode issues with MySQL
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES6 module equivalent of __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

// Global variables for test suite
export let db;

// Setup - runs before all tests
export async function setupDatabase() {
    try {
        // Dynamically import the database to ensure it gets the test environment
        // Note: Default export is sequelize, db is a named export
        const databaseModule = await import('../src/config/database.js');
        const sequelize = databaseModule.default;
        db = databaseModule.db;
        
        // Wait for the database initialization to complete
        await databaseModule.initialize();
        
        // Force sync all models (recreate tables)
        await sequelize.sync({ force: true });
     
        
        return db;
    } catch (error) {
        console.error('Error setting up test database:', error);
        throw error;
    }
}

// Teardown - runs after all tests
export async function teardownDatabase() {
    try {
        if (db && db.sequelize) {
            // Close the connection pool
            await db.sequelize.close();
            // Explicitly set to null to help garbage collection
            db.sequelize = null;
        }
    } catch (error) {
        console.error('Error closing database connection:', error);
    }
}

// Test helpers
export async function clearDatabase() {
    if (!db || !db.sequelize) {
        throw new Error('Database not initialized. Call setupDatabase() first.');
    }

    try {
        // Disable foreign key checks temporarily to allow deletion in any order
        await db.sequelize.query('PRAGMA foreign_keys = OFF;');

        // Get all table names
        const tables = Object.keys(db)
            .filter(key => {
                // Filter out Sequelize and sequelize, and check that it's a model
                return (
                    key !== 'Sequelize' && 
                    key !== 'sequelize' && 
                    db[key] && 
                    db[key].tableName
                );
            });

        // Order matters - delete in reverse dependency order
        // First delete tables with foreign keys, then parent tables
        // Common order: NoteVersion → Note → User
        const orderedTables = [
            'NoteVersion', 
            'Note', 
            'User'
        ].filter(table => tables.includes(table));

        // Delete from remaining tables (those not explicitly ordered)
        const remainingTables = tables.filter(table => !orderedTables.includes(table));

        // Truncate each table - use direct SQL for most reliable cleanup
        for (const tableName of [...orderedTables, ...remainingTables]) {
            if (db[tableName]) {
                await db[tableName].destroy({ 
                    where: {}, 
                    force: true, 
                    truncate: true,
                    cascade: true,
                    restartIdentity: true 
                });
            }
        }

        // Re-enable foreign key checks
        await db.sequelize.query('PRAGMA foreign_keys = ON;');
    } catch (error) {
        console.error('Error clearing database:', error);
        throw error;
    }
}

