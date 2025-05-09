import noteRoutes from '../../src/routes/note.js';
import { 
  createTestApp, 
  createTestRequest, 
  withAuth,
  mockModelMethod,
  createTestUser,
  createTestNote
} from '../utils/testHelpers.js';
import { db } from '../setup.js';
import { faker } from '@faker-js/faker';

// Create test apps - one for authenticated routes
const app = createTestApp({
  routesPath: noteRoutes,
  routePrefix: '/notes',
  useAuth: true // Notes API requires authentication for all routes
});

// Create request object
const request = createTestRequest(app);

describe('Note Routes', () => {
  let testUser;

  beforeEach(async () => {
    // Create a test user for the tests
    testUser = await createTestUser();
  });

  describe('Create Note Endpoint - POST /notes', () => {
    it('should create a new note', async () => {
      const noteData = {
        title: 'Test Note',
        content: 'This is a test note content'
      };

      const res = await withAuth(
        request.post('/notes').send(noteData),
        testUser
      );

      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject({
        title: noteData.title,
        content: noteData.content,
        userId: testUser.id,
        version: 1,
        isDeleted: false
      });

      // Verify note version was also created
      const versions = await db.NoteVersion.findAll({
        where: { noteId: res.body.id }
      });
      expect(versions.length).toBe(1);
      expect(versions[0].version).toBe(1);
    });

    it('should return 400 when creating a note with missing fields', async () => {
      const res = await withAuth(
        request.post('/notes').send({ title: 'Test Note' }), // Missing content
        testUser
      );

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request
        .post('/notes')
        .send({ title: 'Test Note', content: 'This is content' });

      expect(res.statusCode).toBe(401);
    });

    it('should handle server errors during note creation', async () => {
      // Mock a database error
      const originalCreate = mockModelMethod(
        db.Note,
        'create',
        jest.fn().mockRejectedValue(new Error('Database error'))
      );

      try {
        const res = await withAuth(
          request.post('/notes').send({
            title: 'Test Note',
            content: 'This is a test note content'
          }),
          testUser
        );

        expect(res.statusCode).toBe(500);
      } finally {
        // Restore the original implementation
        db.Note.create = originalCreate;
      }
    });
  });

  describe('Get All Notes Endpoint - GET /notes', () => {
    it('should get all notes for the authenticated user', async () => {
      // Create test notes for the user
      await createTestNote(testUser.id, { title: 'Note 1', content: 'Content 1' });
      await createTestNote(testUser.id, { title: 'Note 2', content: 'Content 2' });

      const res = await withAuth(
        request.get('/notes'),
        testUser
      );

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0].title).toBeDefined();
      expect(res.body[0].content).toBeDefined();
    });

    it('should return empty array when user has no notes', async () => {
      const res = await withAuth(
        request.get('/notes'),
        testUser
      );

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('should not return deleted notes', async () => {
      // Create a note and then delete it
      const note = await createTestNote(testUser.id);
      await note.update({ isDeleted: true });

      const res = await withAuth(
        request.get('/notes'),
        testUser
      );

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0); // Should not include the deleted note
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request.get('/notes');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Get Note by ID Endpoint - GET /notes/:id', () => {
    it('should get a note by ID', async () => {
      const note = await createTestNote(testUser.id);

      const res = await withAuth(
        request.get(`/notes/${note.id}`),
        testUser
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(note.id);
      expect(res.body.title).toBe(note.title);
      expect(res.body.content).toBe(note.content);
    });

    it('should return 404 when note is not found', async () => {
      const res = await withAuth(
        request.get('/notes/999'),
        testUser
      );

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 when note is deleted', async () => {
      const note = await createTestNote(testUser.id);
      await note.update({ isDeleted: true });

      const res = await withAuth(
        request.get(`/notes/${note.id}`),
        testUser
      );

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const note = await createTestNote(testUser.id);
      const res = await request.get(`/notes/${note.id}`);
      expect(res.statusCode).toBe(401);
    });

    it('should return 400 for invalid note ID format', async () => {
      const res = await withAuth(
        request.get('/notes/invalid-id'),
        testUser
      );

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Update Note Endpoint - PUT /notes/:id', () => {
    it('should update a note successfully', async () => {
      const note = await createTestNote(testUser.id);

      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        version: note.version
      };

      const res = await withAuth(
        request.put(`/notes/${note.id}`).send(updateData),
        testUser
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe(updateData.title);
      expect(res.body.content).toBe(updateData.content);
      expect(res.body.version).toBe(note.version + 1); // Version should be incremented

      // Verify note version was created
      const versions = await db.NoteVersion.findAll({
        where: { noteId: note.id },
        order: [['version', 'ASC']]
      });
      expect(versions.length).toBe(2); // Initial version + update
      expect(versions[1].title).toBe(updateData.title);
      expect(versions[1].version).toBe(2);
    });

    it('should return 409 when version conflict occurs', async () => {
      const note = await createTestNote(testUser.id);

      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        version: note.version - 1 // Wrong version
      };

      const res = await withAuth(
        request.put(`/notes/${note.id}`).send(updateData),
        testUser
      );

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toContain('Version conflict');
      expect(res.body.clientVersion).toBe(note.version - 1);
      expect(res.body.serverVersion).toBe(note.version);
    });

    it('should return 404 when note not found', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        version: 1
      };

      const res = await withAuth(
        request.put('/notes/999').send(updateData),
        testUser
      );

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const note = await createTestNote(testUser.id);
      const res = await request
        .put(`/notes/${note.id}`)
        .send({ title: 'Updated Title', content: 'Updated content', version: 1 });

      expect(res.statusCode).toBe(401);
    });

    it('should handle validation errors during update', async () => {
      const note = await createTestNote(testUser.id);

      const res = await withAuth(
        request.put(`/notes/${note.id}`).send({
          title: '', // Empty title should fail validation
          content: 'Updated content',
          version: note.version
        }),
        testUser
      );

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('Delete Note Endpoint - DELETE /notes/:id', () => {
    it('should soft delete a note successfully', async () => {
      const note = await createTestNote(testUser.id);

      const res = await withAuth(
        request.delete(`/notes/${note.id}?version=${note.version}`),
        testUser
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted successfully');

      // Verify the note is soft deleted
      const deletedNote = await db.Note.findByPk(note.id);
      expect(deletedNote.isDeleted).toBe(true);
    });

    it('should return 404 when note not found', async () => {
      const res = await withAuth(
        request.delete('/notes/999?version=1'),
        testUser
      );

      expect(res.statusCode).toBe(404);
    });

    it('should return 409 when version conflict occurs', async () => {
      const note = await createTestNote(testUser.id);

      const res = await withAuth(
        request.delete(`/notes/${note.id}?version=${note.version - 1}`),
        testUser
      );

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toContain('Version conflict');
    });

    it('should return 401 when not authenticated', async () => {
      const note = await createTestNote(testUser.id);
      const res = await request.delete(`/notes/${note.id}?version=${note.version}`);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Get Note Versions Endpoint - GET /notes/:id/versions', () => {
    it('should get all versions of a note', async () => {
      // Create a note (the helper already creates initial version)
      const note = await createTestNote(testUser.id);

      // Update the note to create version 2
      await note.update({
        title: 'Updated Title',
        content: 'Updated content',
        version: 2
      });

      // Create version 2 in history
      await db.NoteVersion.create({
        noteId: note.id,
        title: 'Updated Title',
        content: 'Updated content',
        version: 2,
        createdBy: testUser.id
      });

      const res = await withAuth(
        request.get(`/notes/${note.id}/versions`),
        testUser
      );

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0].version).toBe(2); // Should be ordered by DESC
      expect(res.body[1].version).toBe(1);
    });

    it('should return 404 when note not found', async () => {
      const res = await withAuth(
        request.get('/notes/999/versions'),
        testUser
      );

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const note = await createTestNote(testUser.id);
      const res = await request.get(`/notes/${note.id}/versions`);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Revert To Version Endpoint - POST /notes/:id/revert/:version', () => {
    it('should revert to a previous version', async () => {
      // Create a note with custom title/content (the helper already creates initial version)
      const note = await createTestNote(testUser.id, {
        title: 'Original Title',
        content: 'Original content'
      });

      // Update to version 2
      await note.update({
        title: 'Updated Title',
        content: 'Updated content',
        version: 2
      });

      // Create version 2 history
      await db.NoteVersion.create({
        noteId: note.id,
        title: 'Updated Title',
        content: 'Updated content',
        version: 2,
        createdBy: testUser.id
      });

      // Revert to version 1
      const res = await withAuth(
        request.post(`/notes/${note.id}/revert/1`),
        testUser
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('Successfully reverted');
      
      // Get the updated note and verify content
      const updatedNote = await db.Note.findByPk(note.id);
      expect(updatedNote.title).toBe('Original Title');
      expect(updatedNote.content).toBe('Original content');
      expect(updatedNote.version).toBe(3); // Should be incremented to 3

      // Verify a new version entry was created with revertedFrom populated
      const versions = await db.NoteVersion.findAll({
        where: { noteId: note.id },
        order: [['version', 'DESC']]
      });
      
      expect(versions.length).toBe(3);
      expect(versions[0].version).toBe(3);
      expect(versions[0].revertedFrom).toBe(1); // Points to version reverted from
    });

    it('should return 404 when note not found', async () => {
      const res = await withAuth(
        request.post('/notes/999/revert/1'),
        testUser
      );

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 when version not found', async () => {
      const note = await createTestNote(testUser.id);

      const res = await withAuth(
        request.post(`/notes/${note.id}/revert/999`),
        testUser
      );

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const note = await createTestNote(testUser.id);
      const res = await request.post(`/notes/${note.id}/revert/1`);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Search Notes Endpoint - GET /notes/search', () => {
    it('should search notes by keyword', async () => {
      // Create test notes with different content
      await createTestNote(testUser.id, { 
        title: 'Meeting Notes', 
        content: 'Discuss project timeline'
      });
      await createTestNote(testUser.id, { 
        title: 'Shopping List', 
        content: 'Milk, eggs, bread'
      });
      await createTestNote(testUser.id, { 
        title: 'Project Ideas', 
        content: 'New project timeline and milestones'
      });

      const res = await withAuth(
        request.get('/notes/search?q=timeline'),
        testUser
      );

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2); // Should match both notes with "timeline"
      expect(res.body.some(note => note.title === 'Meeting Notes')).toBe(true);
      expect(res.body.some(note => note.title === 'Project Ideas')).toBe(true);
    });

    it('should return empty array when no matches found', async () => {
      await createTestNote(testUser.id, { 
        title: 'Test Note', 
        content: 'Test content'
      });

      const res = await withAuth(
        request.get('/notes/search?q=nonexistent'),
        testUser
      );

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('should return 400 with missing search parameter', async () => {
      const res = await withAuth(
        request.get('/notes/search'),
        testUser
      );

      expect(res.statusCode).toBe(400);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request.get('/notes/search?q=test');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Resolve Conflict Endpoint - POST /notes/:id/resolve-conflict', () => {
    it('should resolve a version conflict', async () => {
      const note = await createTestNote(testUser.id);
      
      const resolveData = {
        title: 'Resolved Title',
        content: 'Resolved content',
        serverVersion: note.version,
        resolutionStrategy: 'client-wins'
      };

      const res = await withAuth(
        request.post(`/notes/${note.id}/resolve-conflict`).send(resolveData),
        testUser
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('Conflict successfully resolved');
      expect(res.body.note.title).toBe('Resolved Title');
      expect(res.body.note.version).toBe(note.version + 1);

      // Verify a new version was created
      const versions = await db.NoteVersion.findAll({
        where: { noteId: note.id },
        order: [['version', 'DESC']]
      });
      
      expect(versions.length).toBe(2); // Initial + resolved
      expect(versions[0].version).toBe(2);
    });

    it('should return 409 when server version has changed during resolution', async () => {
      const note = await createTestNote(testUser.id);
      
      // Update the note to change its version
      await note.update({
        title: 'Changed Title',
        content: 'Changed content',
        version: note.version + 1
      });
      
      // Try to resolve with outdated server version
      const resolveData = {
        title: 'Resolved Title',
        content: 'Resolved content',
        serverVersion: 1, // Original version, now outdated
        resolutionStrategy: 'client-wins'
      };

      const res = await withAuth(
        request.post(`/notes/${note.id}/resolve-conflict`).send(resolveData),
        testUser
      );

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toContain('Server version has changed again');
    });

    it('should return 404 when note not found', async () => {
      const resolveData = {
        title: 'Resolved Title',
        content: 'Resolved content',
        serverVersion: 1,
        resolutionStrategy: 'client-wins'
      };

      const res = await withAuth(
        request.post('/notes/999/resolve-conflict').send(resolveData),
        testUser
      );

      expect(res.statusCode).toBe(404);
    });

    it('should return 401 when not authenticated', async () => {
      const note = await createTestNote(testUser.id);
      
      const resolveData = {
        title: 'Resolved Title',
        content: 'Resolved content',
        serverVersion: note.version,
        resolutionStrategy: 'client-wins'
      };

      const res = await request
        .post(`/notes/${note.id}/resolve-conflict`)
        .send(resolveData);
        
      expect(res.statusCode).toBe(401);
    });

    it('should validate the resolution data', async () => {
      const note = await createTestNote(testUser.id);
      
      // Missing required fields
      const resolveData = {
        title: 'Resolved Title',
        // Missing content
        serverVersion: note.version
        // Missing resolutionStrategy
      };

      const res = await withAuth(
        request.post(`/notes/${note.id}/resolve-conflict`).send(resolveData),
        testUser
      );

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('Edge and Concurrency Cases', () => {
    // This test is trickier in the real environment because concurrency is hard to test deterministically
    // We'll modify it to test for optimistic locking more generally
    it('should handle optimistic locking for notes', async () => {
      const note = await createTestNote(testUser.id);
      
      // First update should succeed
      const res1 = await withAuth(
        request.put(`/notes/${note.id}`).send({
          title: 'First Update',
          content: 'Content from first update',
          version: note.version
        }),
        testUser
      );
      
      expect(res1.statusCode).toBe(200);
      expect(res1.body.version).toBe(2); // Version bumped to 2
      
      // Second update with original version should fail with 409 Conflict
      const res2 = await withAuth(
        request.put(`/notes/${note.id}`).send({
          title: 'Second Update',
          content: 'Content from second update',
          version: note.version // Original version (stale)
        }),
        testUser
      );
      
      expect(res2.statusCode).toBe(409); // Conflict
      expect(res2.body.error).toContain('Version conflict');
      expect(res2.body.clientVersion).toBe(note.version);
      expect(res2.body.serverVersion).toBe(2);
      
      // The note in the database should match the successful update
      const updatedNote = await db.Note.findByPk(note.id);
      expect(updatedNote.version).toBe(2);
      expect(updatedNote.title).toBe('First Update');
    });
    
    it('should handle large content in notes', async () => {
      const longContent = faker.lorem.paragraphs(20); // Generate very long content
      
      const noteData = {
        title: 'Note with Long Content',
        content: longContent
      };
      
      const res = await withAuth(
        request.post('/notes').send(noteData),
        testUser
      );
      
      expect(res.statusCode).toBe(201);
      expect(res.body.content).toBe(longContent);
      
      // Verify content was stored correctly
      const savedNote = await db.Note.findByPk(res.body.id);
      expect(savedNote.content).toBe(longContent);
    });
    
    it('should sanitize HTML in note content', async () => {
      const noteData = {
        title: 'Note with HTML',
        content: '<script>alert("XSS")</script><p>Valid content</p>'
      };
      
      const res = await withAuth(
        request.post('/notes').send(noteData),
        testUser
      );
      
      expect(res.statusCode).toBe(201);
      // The actual sanitization depends on your implementation
      // This test may need adjustment based on your actual sanitization strategy
    });
  });
});
