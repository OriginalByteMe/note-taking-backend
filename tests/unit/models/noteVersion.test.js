import { db } from '../../setup.js';
import { createTestUser, createTestNote, cleanupTestData } from '../../utils/testDataGenerator.js';

describe('NoteVersion Model', () => {
  let testUser;
  let testNote;
  let testData = {
    users: [],
    notes: [],
    noteVersions: []
  };

  beforeEach(async () => {
    // Create a test user to associate with notes
    const userData = await createTestUser({
      username: 'testuser',
      email: 'test@example.com'
    });
    testUser = userData.user;
    testData.users.push(testUser);

    // Create a test note to associate with versions
    testNote = await createTestNote(testUser.id, {
      title: 'Test Note',
      content: 'This is a test note content'
    });
    testData.notes.push(testNote);
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData(testData);
    testData.users = [];
    testData.notes = [];
    testData.noteVersions = [];
  });

  it('should create a note version with valid data', async () => {
    const versionData = {
      noteId: testNote.id,
      title: testNote.title,
      content: testNote.content,
      version: 1,
      createdBy: testUser.id
    };

    const noteVersion = await db.NoteVersion.create(versionData);
    testData.noteVersions.push(noteVersion);
    expect(noteVersion.id).toBeDefined();
    expect(noteVersion.noteId).toBe(testNote.id);
    expect(noteVersion.title).toBe(testNote.title);
    expect(noteVersion.content).toBe(testNote.content);
    expect(noteVersion.version).toBe(1);
    expect(noteVersion.createdBy).toBe(testUser.id);
    // The revertedFrom can be null or undefined depending on how the model is configured
    expect(noteVersion.revertedFrom == null).toBe(true); // Check that it's either null or undefined
  });

  it('should not create a note version without a noteId', async () => {
    const versionData = {
      noteId: null,
      title: 'Test Note',
      content: 'This is a test note content',
      version: 1,
      createdBy: testUser.id
    };

    await expect(db.NoteVersion.create(versionData)).rejects.toThrow();
  });

  it('should not create a note version without a title', async () => {
    const versionData = {
      noteId: testNote.id,
      title: null,
      content: 'This is a test note content',
      version: 1,
      createdBy: testUser.id
    };

    await expect(db.NoteVersion.create(versionData)).rejects.toThrow();
  });

  it('should not create a note version without content', async () => {
    const versionData = {
      noteId: testNote.id,
      title: 'Test Note',
      content: null,
      version: 1,
      createdBy: testUser.id
    };

    await expect(db.NoteVersion.create(versionData)).rejects.toThrow();
  });

  it('should not create a note version without a version number', async () => {
    const versionData = {
      noteId: testNote.id,
      title: 'Test Note',
      content: 'This is a test note content',
      version: null,
      createdBy: testUser.id
    };

    await expect(db.NoteVersion.create(versionData)).rejects.toThrow();
  });

  it('should not create a note version without a createdBy user', async () => {
    const versionData = {
      noteId: testNote.id,
      title: 'Test Note',
      content: 'This is a test note content',
      version: 1,
      createdBy: null
    };

    await expect(db.NoteVersion.create(versionData)).rejects.toThrow();
  });

  it('should create a note version with revertedFrom field', async () => {
    const versionData = {
      noteId: testNote.id,
      title: 'Test Note',
      content: 'This is a test note content',
      version: 2,
      createdBy: testUser.id,
      revertedFrom: 1
    };

    const noteVersion = await db.NoteVersion.create(versionData);
    testData.noteVersions.push(noteVersion);
    expect(noteVersion.revertedFrom).toBe(1);
  });

  it('should associate a note version with a note', async () => {
    const noteVersion = await db.NoteVersion.create({
      noteId: testNote.id,
      title: 'Test Note',
      content: 'This is a test note content',
      version: 1,
      createdBy: testUser.id
    });

    // Ensure association works by fetching the version with its note
    const versionWithNote = await db.NoteVersion.findByPk(noteVersion.id, {
      include: [{ model: db.Note }]
    });

    expect(versionWithNote.Note).toBeDefined();
    expect(versionWithNote.Note.id).toBe(testNote.id);
    expect(versionWithNote.Note.title).toBe('Test Note');
  });

  it('should associate a note version with a user (creator)', async () => {
    const noteVersion = await db.NoteVersion.create({
      noteId: testNote.id,
      title: 'Test Note',
      content: 'This is a test note content',
      version: 1,
      createdBy: testUser.id
    });

    // Ensure association works by fetching the version with its creator
    const versionWithUser = await db.NoteVersion.findByPk(noteVersion.id, {
      include: [{ model: db.User }]
    });

    expect(versionWithUser.User).toBeDefined();
    expect(versionWithUser.User.id).toBe(testUser.id);
    expect(versionWithUser.User.username).toBe('testuser');
  });

  it('should retrieve multiple versions of a note', async () => {
    // Since validation and updates are handled by the api, workflow is:
    // 1. Update note
    // 2. Create version history
    // 3. repeat
    await testNote.update({
      title: 'Updated Test Note',
      content: 'Updated content',
      version: 2 
    });
    
    const version2 = await db.NoteVersion.create({
      noteId: testNote.id,
      title: 'Updated Test Note',
      content: 'Updated content',
      version: 2,
      createdBy: testUser.id
    });
    testData.noteVersions.push(version2);

    await testNote.update({
      title: 'Updated Test Note Again',
      content: 'Updated content again',
      version: 3
    });
    
    const version3 = await db.NoteVersion.create({
      noteId: testNote.id,
      title: 'Updated Test Note Again',
      content: 'Updated content again',
      version: 3,
      createdBy: testUser.id
    });
    testData.noteVersions.push(version3);

    const versions = await db.NoteVersion.findAll({
      where: { noteId: testNote.id },
      order: [['version', 'ASC']]
    });

    expect(versions.length).toBe(3);
    expect(versions[0].version).toBe(1);
    expect(versions[1].version).toBe(2);
    expect(versions[2].version).toBe(3);
    
    expect(versions[0].title).toBe('Test Note');
    expect(versions[1].title).toBe('Updated Test Note');
    expect(versions[2].title).toBe('Updated Test Note Again');
  });
});
