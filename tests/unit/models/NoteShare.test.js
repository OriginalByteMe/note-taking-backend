import { db } from '../../../src/config/database.js';

describe('NoteShare Model', () => {
  let testUser1, testUser2, testNote;

  beforeAll(async () => {
    await db.sequelize.authenticate();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  // Before each test, set up the test data
  beforeEach(async () => {
    // Clear database tables
    await db.NoteShare.destroy({ where: {} });
    await db.NoteVersion.destroy({ where: {} });
    await db.Note.destroy({ where: {} });
    await db.User.destroy({ where: {} });

    // Create test users
    testUser1 = await db.User.create({
      name: 'Test User 1',
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'password123'
    });

    testUser2 = await db.User.create({
      name: 'Test User 2',
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123'
    });

    // Create a test note
    testNote = await db.Note.create({
      title: 'Test Note',
      content: 'This is a test note for sharing',
      userId: testUser1.id,
      version: 1,
      isDeleted: false
    });

    // Create first version
    await db.NoteVersion.create({
      noteId: testNote.id,
      title: 'Test Note',
      content: 'This is a test note for sharing',
      version: 1,
      createdBy: testUser1.id
    });
  });

  test('should create a note share record', async () => {
    // Create a share record
    await db.NoteShare.create({
      noteId: testNote.id,
      ownerId: testUser1.id,
      sharedWithId: testUser2.id,
      permission: 'read'
    });
    
    // Count record to verify existence
    const count = await db.NoteShare.count({
      where: {
        noteId: testNote.id,
        sharedWithId: testUser2.id
      }
    });
    
    // The record was successfully created if count is 1
    expect(count).toBe(1);
  });

  test('should fetch note with associations', async () => {
    // Create a share record
    await db.NoteShare.create({
      noteId: testNote.id,
      ownerId: testUser1.id,
      sharedWithId: testUser2.id,
      permission: 'read'
    });

    // Fetch the note with includes - Note that we don't use an alias since none is defined in the model
    const foundNote = await db.Note.findOne({
      where: { id: testNote.id },
      include: [
        {
          model: db.NoteShare,
          include: [
            { model: db.User, as: 'owner' },
            { model: db.User, as: 'sharedWith' }
          ]
        }
      ]
    });

    // Verify the associations are working
    expect(foundNote).toBeDefined();
    expect(foundNote.NoteShares).toBeDefined();
    expect(foundNote.NoteShares.length).toBe(1);
    expect(foundNote.NoteShares[0].owner).toBeDefined();
    expect(foundNote.NoteShares[0].owner.id).toBe(testUser1.id);
    expect(foundNote.NoteShares[0].sharedWith).toBeDefined();
    expect(foundNote.NoteShares[0].sharedWith.id).toBe(testUser2.id);
  });

  test('should fetch shared notes for a user', async () => {
    // Create a share record
    await db.NoteShare.create({
      noteId: testNote.id,
      ownerId: testUser1.id,
      sharedWithId: testUser2.id,
      permission: 'read'
    });

    // Fetch notes shared with testUser2 using the NoteShare model directly
    const sharedNotesData = await db.NoteShare.findAll({
      where: { sharedWithId: testUser2.id },
      include: [
        { model: db.Note },
        { model: db.User, as: 'owner' }
      ]
    });

    // Verify shared notes are found
    expect(sharedNotesData).toBeDefined();
    expect(sharedNotesData.length).toBe(1);
    expect(sharedNotesData[0].Note.id).toBe(testNote.id);
    expect(sharedNotesData[0].Note.title).toBe('Test Note');
    expect(sharedNotesData[0].owner.id).toBe(testUser1.id);
  });

  test('should delete a note share', async () => {
    // Create a share record
    const noteShare = await db.NoteShare.create({
      noteId: testNote.id,
      ownerId: testUser1.id,
      sharedWithId: testUser2.id,
      permission: 'read'
    });

    // Delete the share
    await noteShare.destroy();

    // Try to find the share record
    const foundShare = await db.NoteShare.findByPk(noteShare.id);
    
    // Verify it's deleted
    expect(foundShare).toBeNull();
  });
});
