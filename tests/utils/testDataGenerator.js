/**
 * Test Data Generator
 * Utility functions to create test data objects consistently across tests
 */
import { db } from '../setup.js';
import { generateToken } from '../../src/middlewares/auth.js';

/**
 * Creates a test user in the database
 * @param {Object} options - Optional user properties
 * @returns {Promise<Object>} The created user instance and auth token
 */
export const createTestUser = async (options = {}) => {
  const defaults = {
    username: `testuser_${Date.now()}`,
    email: `testuser_${Date.now()}@example.com`,
    password: 'hashedpassword123'
  };

  const userData = { ...defaults, ...options };
  const user = await db.User.create(userData);
  const token = generateToken(user);

  return { user, token };
};

/**
 * Creates a test note in the database
 * @param {number} userId - The user ID who owns the note
 * @param {Object} options - Optional note properties
 * @returns {Promise<Object>} The created note instance
 */
export const createTestNote = async (userId, options = {}) => {
  const defaults = {
    title: `Test Note ${Date.now()}`,
    content: 'This is a test note content',
    version: 1,
    isDeleted: false
  };

  const noteData = { ...defaults, ...options, userId };
  const note = await db.Note.create(noteData);
  
  // Create initial version
  await createTestNoteVersion(note.id, userId, {
    title: note.title,
    content: note.content,
    version: note.version
  });
  
  return note;
};

/**
 * Creates a test note version in the database
 * @param {number} noteId - The note ID this version belongs to
 * @param {number} userId - The user ID who created this version
 * @param {Object} options - Optional note version properties
 * @returns {Promise<Object>} The created note version instance
 */
export const createTestNoteVersion = async (noteId, userId, options = {}) => {
  const defaults = {
    title: `Test Note Version ${Date.now()}`,
    content: 'This is a test note version content',
    version: 1
  };

  const versionData = { 
    ...defaults, 
    ...options, 
    noteId, 
    createdBy: userId 
  };
  
  return await db.NoteVersion.create(versionData);
};

/**
 * Creates multiple test notes for a user
 * @param {number} userId - The user ID who owns the notes
 * @param {number} count - Number of notes to create
 * @param {Object} options - Optional note properties
 * @returns {Promise<Array>} Array of created note instances
 */
export const createTestNotes = async (userId, count = 5, options = {}) => {
  const notes = [];
  
  for (let i = 0; i < count; i++) {
    const note = await createTestNote(userId, {
      title: `${options.title || 'Test Note'} ${i + 1}`,
      content: `${options.content || 'Test content'} ${i + 1}`,
      ...options
    });
    
    notes.push(note);
  }
  
  return notes;
};

/**
 * Clean up test data created during tests
 * @param {Object} data - Object containing arrays of test data to clean up
 * @returns {Promise<void>}
 */
export const cleanupTestData = async (data = {}) => {
  const { users = [], notes = [], noteVersions = [] } = data;
  
  // Clean up note versions
  if (noteVersions.length) {
    await db.NoteVersion.destroy({
      where: { id: noteVersions.map(v => v.id) }
    });
  } else if (notes.length) {
    // If no specific versions provided, clean up based on notes
    await db.NoteVersion.destroy({
      where: { noteId: notes.map(n => n.id) }
    });
  }
  
  // Clean up notes
  if (notes.length) {
    await db.Note.destroy({
      where: { id: notes.map(n => n.id) }
    });
  } else if (users.length) {
    // If no specific notes provided, clean up based on users
    await db.Note.destroy({
      where: { userId: users.map(u => u.id) }
    });
  }
  
  // Clean up users
  if (users.length) {
    await db.User.destroy({
      where: { id: users.map(u => u.id) }
    });
  }
};
