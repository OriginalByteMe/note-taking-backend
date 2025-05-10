import noteShareRoutes from '../../src/routes/noteShare.js';
import noteRoutes from '../../src/routes/note.js';
import { 
  createTestApp, 
  createTestRequest, 
  withAuth,
  clearDatabase,
  createTestUser,
  createTestNote
} from '../utils/testHelpers.js';
import { db } from '../setup.js';

jest.mock('../../src/cache/noteCache.js', () => ({
  __esModule: true,
  default: {
    getUserNotesKey: jest.fn(userId => `user:${userId}:notes`),
    getNoteKey: jest.fn(noteId => `note:${noteId}`),
    getNoteVersionsKey: jest.fn(noteId => `note:${noteId}:versions`),
    getSearchKey: jest.fn((userId, query) => `user:${userId}:search:${query}`),
    
    // Cache operations
    cacheUserNotes: jest.fn().mockResolvedValue(),
    getUserNotes: jest.fn(),
    cacheNote: jest.fn().mockResolvedValue(),
    getNote: jest.fn(),
    cacheNoteVersions: jest.fn().mockResolvedValue(),
    getNoteVersions: jest.fn(),
    cacheSearchResults: jest.fn().mockResolvedValue(),
    getSearchResults: jest.fn(),
    
    // Cache invalidation
    invalidateUserNotes: jest.fn().mockResolvedValue(),
    invalidateNote: jest.fn().mockResolvedValue(),
    invalidateNoteVersions: jest.fn().mockResolvedValue(),
    invalidateAllNoteCache: jest.fn().mockResolvedValue(),
    invalidateSearchResults: jest.fn().mockResolvedValue()
  }
}));

import noteCache from '../../src/cache/noteCache.js';

const request = createTestRequest(createTestApp({
  routesPath: noteShareRoutes,
  routePrefix: '/notes',
  useAuth: true
}));


describe('Note Share Routes', () => {
  let ownerUser, sharedUser, note;
  
  beforeEach(async () => {
    // Create two test users - one owner and one to share with
    ownerUser = await createTestUser({ email: 'owner@example.com', username: 'owner', password: 'ownerPass123' });
    sharedUser = await createTestUser({ email: 'shared@example.com', username: 'shared', password: 'sharedPass123' });
    // Create a test note owned by ownerUser
    note = await createTestNote(ownerUser.id);
  });

  describe('Share Note Endpoint - POST /notes/:noteId/share', () => {
    it('should share a note with another user successfully', async () => {
      const shareData = {
        userId: sharedUser.id, 
        permission: 'read' 
      };


      const res = await withAuth(
        request.post(`/notes/${note.id}/share`).send(shareData),
        ownerUser
      );
      expect(res.body).toEqual()
      expect(res.statusCode).toBe(201);
      expect(res.body.noteId).toBe(note.id);
      expect(res.body.ownerId).toBe(ownerUser.id);
      expect(res.body.sharedWithId).toBe(sharedUser.id);
      expect(res.body.permission).toBe(shareData.permission);

      // Verify the share exists in the database
      const share = await db.NoteShare.findOne({
        where: {
          noteId: note.id,
          ownerId: ownerUser.id,
          sharedWithId: sharedUser.id
        }
      });
      expect(share).not.toBeNull();
      expect(share.permission).toBe(shareData.permission);
    });

    it('should return 400 if trying to share a note with yourself', async () => {
      const shareData = {
        userId: ownerUser.id, // Same as the owner
        permission: 'read'
      };

      const res = await withAuth(
        request.post(`/notes/${note.id}/share`).send(shareData),
        ownerUser
      );

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('cannot share a note with yourself');
    });

    it('should return 404 if note not found', async () => {
      const shareData = {
        userId: sharedUser.id,
        permission: 'read'
      };

      const nonExistentNoteId = 99999;
      const res = await withAuth(
        request.post(`/notes/${nonExistentNoteId}/share`).send(shareData),
        ownerUser
      );

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toContain('Note not found');
    });

    it('should return 404 if user to share with not found', async () => {
      const shareData = {
        userId: 99999, // Non-existent user ID
        permission: 'read'
      };

      const res = await withAuth(
        request.post(`/notes/${note.id}/share`).send(shareData),
        ownerUser
      );

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toContain('User not found');
    });

    it('should return 403 if user is not the owner of the note', async () => {
      const shareData = {
        userId: ownerUser.id, // Try to share with the actual owner
        permission: 'read'
      };

      // Try to share the note as the shared user (not the owner)
      const res = await withAuth(
        request.post(`/notes/${note.id}/share`).send(shareData),
        sharedUser
      );

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('not the owner');
    });

    it('should return 401 when not authenticated', async () => {
      const shareData = {
        userId: sharedUser.id,
        permission: 'read'
      };

      // Call without authentication
      const res = await request.post(`/notes/${note.id}/share`).send(shareData);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Get Shared Notes Endpoint - GET /shared-notes', () => {
    beforeEach(async () => {
      // Create a share record for testing
      await db.NoteShare.create({
        noteId: note.id,
        ownerId: ownerUser.id,
        sharedWithId: sharedUser.id,
        permission: 'read'
      });
    });

    it('should get all notes shared with the user', async () => {
      const res = await withAuth(
        request.get('/shared-notes'),
        sharedUser
      );

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(note.id);
      expect(res.body[0].title).toBe(note.title);
      expect(res.body[0].content).toBe(note.content);
      // Should include share information
      expect(res.body[0].share).toBeDefined();
      expect(res.body[0].share.ownerId).toBe(ownerUser.id);
      expect(res.body[0].share.permission).toBe('read');
    });

    it('should return an empty array if no notes are shared with the user', async () => {
      // Create a new user with no shares
      const newUser = await createTestUser({ email: 'no-shares@example.com' });
      
      const res = await withAuth(
        request.get('/shared-notes'),
        newUser
      );

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request.get('/shared-notes');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Get Note Shares Endpoint - GET /notes/:noteId/shares', () => {
    beforeEach(async () => {
      // Create a share record for testing
      await db.NoteShare.create({
        noteId: note.id,
        ownerId: ownerUser.id,
        sharedWithId: sharedUser.id,
        permission: 'read'
      });
    });

    it('should get all users a note is shared with', async () => {
      const res = await withAuth(
        request.get(`/notes/${note.id}/shares`),
        ownerUser
      );

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBeDefined();
      expect(res.body[0].noteId).toBe(note.id);
      expect(res.body[0].sharedWithId).toBe(sharedUser.id);
      expect(res.body[0].permission).toBe('read');
      // Should include user information
      expect(res.body[0].sharedWith).toBeDefined();
      expect(res.body[0].sharedWith.email).toBe(sharedUser.email);
    });

    it('should return 404 if note not found', async () => {
      const nonExistentNoteId = 99999;
      const res = await withAuth(
        request.get(`/notes/${nonExistentNoteId}/shares`),
        ownerUser
      );

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toContain('Note not found');
    });

    it('should return 403 if user is not the owner of the note', async () => {
      // Try to get shares as the shared user (not the owner)
      const res = await withAuth(
        request.get(`/notes/${note.id}/shares`),
        sharedUser
      );

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('not the owner');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request.get(`/notes/${note.id}/shares`);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Remove Share Endpoint - DELETE /notes/:noteId/shares/:shareId', () => {
    let shareId;

    beforeEach(async () => {
      // Create a share record for testing
      const share = await db.NoteShare.create({
        noteId: note.id,
        ownerId: ownerUser.id,
        sharedWithId: sharedUser.id,
        permission: 'read'
      });
      shareId = share.id;
    });

    it('should remove a share successfully', async () => {
      const res = await withAuth(
        request.delete(`/notes/${note.id}/shares/${shareId}`),
        ownerUser
      );

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('successfully');

      // Verify the share is removed from the database
      const share = await db.NoteShare.findByPk(shareId);
      expect(share).toBeNull();
    });

    it('should return 404 if note not found', async () => {
      const nonExistentNoteId = 99999;
      const res = await withAuth(
        request.delete(`/notes/${nonExistentNoteId}/shares/${shareId}`),
        ownerUser
      );

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toContain('Note not found');
    });

    it('should return 404 if share not found', async () => {
      const nonExistentShareId = 99999;
      const res = await withAuth(
        request.delete(`/notes/${note.id}/shares/${nonExistentShareId}`),
        ownerUser
      );

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toContain('Share not found');
    });

    it('should return 403 if user is not the owner of the note', async () => {
      // Try to remove share as the shared user (not the owner)
      const res = await withAuth(
        request.delete(`/notes/${note.id}/shares/${shareId}`),
        sharedUser
      );

      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('not the owner');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request.delete(`/notes/${note.id}/shares/${shareId}`);
      expect(res.statusCode).toBe(401);
    });
  });
});
