// Fix for unicode issues with MySQL
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ES6 module equivalent of __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

// Global variables for test suite
let db;

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
        console.log('Test database initialized successfully with SQLite');
        
        return db;
    } catch (error) {
        console.error('Error setting up test database:', error);
        throw error;
    }
}

// Teardown - runs after all tests
export async function teardownDatabase() {
    if (db && db.sequelize) {
        await db.sequelize.close();
        console.log('Test database connection closed');
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
                console.log(`Cleared table: ${tableName}`);
            }
        }

        // Re-enable foreign key checks
        await db.sequelize.query('PRAGMA foreign_keys = ON;');

        console.log('Database cleared successfully');
    } catch (error) {
        console.error('Error clearing database:', error);
        throw error;
    }
}

// Create test user
export async function createTestUser(overrides = {}) {
    if (!db) {
        throw new Error('Database not initialized. Call setupDatabase() first.');
    }

    return db.User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        ...overrides
    });
}

// Create test note with versioning support (for optimistic locking)
export async function createTestNote(userId, overrides = {}) {
    if (!db) {
        throw new Error('Database not initialized. Call setupDatabase() first.');
    }

    const note = await db.Note.create({
        title: 'Test Note',
        content: 'This is a test note content',
        userId,
        version: 1,
        ...overrides
    });

    // Create initial note version
    await db.NoteVersion.create({
        noteId: note.id,
        title: note.title,
        content: note.content,
        version: 1,
        createdBy: userId
    });

    return note;
}