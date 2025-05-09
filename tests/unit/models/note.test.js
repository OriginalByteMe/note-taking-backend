import { db } from '../../setup.js';
import { createTestUser, cleanupTestData } from '../../utils/testDataGenerator.js';

describe('Note Model', () => {
  let testUser;
  let testData = {
    users: [],
    notes: []
  };

  beforeEach(async () => {
    // Create a test user to associate with notes
    const userData = await createTestUser({
      username: 'testuser',
      email: 'test@example.com'
    });
    testUser = userData.user;
    testData.users.push(testUser);
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData(testData);
    testData.users = [];
    testData.notes = [];
  });

  it('should create a note with valid data', async () => {
    const noteData = {
      title: 'Test Note',
      content: 'This is a test note content',
      userId: testUser.id,
      version: 1
    };

    const note = await db.Note.create(noteData);
    testData.notes.push(note);
    expect(note.id).toBeDefined();
    expect(note.title).toBe(noteData.title);
    expect(note.content).toBe(noteData.content);
    expect(note.userId).toBe(testUser.id);
    expect(note.version).toBe(1);
    expect(note.isDeleted).toBe(false); // Default value
  });

  it('should not create a note without a title', async () => {
    const noteData = {
      title: null,
      content: 'This is a test note content',
      userId: testUser.id,
      version: 1
    };

    await expect(db.Note.create(noteData)).rejects.toThrow();
  });

  it('should not create a note without content', async () => {
    const noteData = {
      title: 'Test Note',
      content: null,
      userId: testUser.id,
      version: 1
    };

    await expect(db.Note.create(noteData)).rejects.toThrow();
  });

  it('should not create a note without a userId', async () => {
    const noteData = {
      title: 'Test Note',
      content: 'This is a test note content',
      userId: null,
      version: 1
    };

    await expect(db.Note.create(noteData)).rejects.toThrow();
  });

  it('should create a note with default version when not specified', async () => {
    const noteData = {
      title: 'Test Note',
      content: 'This is a test note content',
      userId: testUser.id
      // version not specified, should default to 1
    };

    const note = await db.Note.create(noteData);
    testData.notes.push(note);
    expect(note.version).toBe(1);
  });

  it('should associate a note with a user', async () => {
    const note = await db.Note.create({
      title: 'Test Note',
      content: 'This is a test note content',
      userId: testUser.id,
      version: 1
    });
    testData.notes.push(note);

    // Ensure association works by fetching the note with its user
    const noteWithUser = await db.Note.findByPk(note.id, {
      include: [{ model: db.User }]
    });

    expect(noteWithUser.User).toBeDefined();
    expect(noteWithUser.User.id).toBe(testUser.id);
    expect(noteWithUser.User.username).toBe('testuser');
  });

  it('should soft delete a note', async () => {
    const note = await db.Note.create({
      title: 'Test Note',
      content: 'This is a test note content',
      userId: testUser.id,
      version: 1
    });
    testData.notes.push(note);

    // Soft delete by setting isDeleted flag
    await note.update({ isDeleted: true });

    // The note should still exist in the database
    const deletedNote = await db.Note.findByPk(note.id);
    expect(deletedNote).not.toBeNull();
    expect(deletedNote.isDeleted).toBe(true);
  });

  it('should handle optimistic locking with version field', async () => {
    const note = await db.Note.create({
      title: 'Test Note',
      content: 'This is a test note content',
      userId: testUser.id,
      version: 1
    });
    testData.notes.push(note);

    // Update with version increment
    await note.update({
      title: 'Updated Test Note',
      content: 'Updated content',
      version: note.version + 1
    });

    // Refetch the note
    const updatedNote = await db.Note.findByPk(note.id);
    expect(updatedNote.version).toBe(2);
    expect(updatedNote.title).toBe('Updated Test Note');
  });
});
