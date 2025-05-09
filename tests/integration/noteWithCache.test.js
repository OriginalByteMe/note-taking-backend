import noteRoutes from '../../src/routes/note.js';
import { 
  createTestApp, 
  createTestRequest, 
  withAuth,
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

import redisClient from '../../src/cache/redis.js';
import noteCache from '../../src/cache/noteCache.js';

// Create test app for authenticated routes
const app = createTestApp({
  routesPath: noteRoutes,
  routePrefix: '/notes',
  useAuth: true
});

// Create request object
const request = createTestRequest(app);

describe('Note Routes with Redis Cache', () => {
  let testUser;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a test user for the tests
    testUser = await createTestUser();
  });

  describe('GET /notes (getAllNotes)', () => {
    it('should return notes from cache when available', async () => {
      const cachedNotes = [
        { id: 1, title: 'Cached Note 1', content: 'Cached content 1', userId: testUser.id },
        { id: 2, title: 'Cached Note 2', content: 'Cached content 2', userId: testUser.id }
      ];
      
      // Setup the cache to return notes
      noteCache.getUserNotes.mockResolvedValueOnce(cachedNotes);
      
      const res = await withAuth(
        request.get('/notes'),
        testUser
      );
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(cachedNotes);
      expect(noteCache.getUserNotes).toHaveBeenCalledWith(testUser.id);
      
      // Verify that we didn't query the database
      expect(noteCache.cacheUserNotes).not.toHaveBeenCalled();
    });
    
    it('should fetch from database and cache when cache is empty', async () => {
      // Create some test notes in the database
      const note1 = await createTestNote(testUser.id);
      const note2 = await createTestNote(testUser.id);
      
      // Setup cache miss
      noteCache.getUserNotes.mockResolvedValueOnce(null);
      
      const res = await withAuth(
        request.get('/notes'),
        testUser
      );
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
      
      // Verify that the result was cached
      expect(noteCache.cacheUserNotes).toHaveBeenCalledWith(
        testUser.id,
        expect.arrayContaining([
          expect.objectContaining({ id: note1.id }),
          expect.objectContaining({ id: note2.id })
        ])
      );
    });
  });
  
  describe('GET /notes/:id (getNoteById)', () => {
    it('should return a note from cache when available', async () => {
      const note = await createTestNote(testUser.id);
      const cachedNote = { 
        id: note.id, 
        title: 'Cached Note', 
        content: 'Cached content', 
        userId: testUser.id,
        isDeleted: false
      };
      
      // Setup cache hit
      noteCache.getNote.mockResolvedValueOnce(cachedNote);
      
      const res = await withAuth(
        request.get(`/notes/${note.id}`),
        testUser
      );
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(cachedNote);
      expect(noteCache.getNote).toHaveBeenCalledWith(note.id.toString());
    });
    
    it('should fetch from database and cache when note is not in cache', async () => {
      const note = await createTestNote(testUser.id);
      
      // Setup cache miss
      noteCache.getNote.mockResolvedValueOnce(null);
      
      const res = await withAuth(
        request.get(`/notes/${note.id}`),
        testUser
      );
      
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(note.id);
      
      // Verify note was cached
      expect(noteCache.cacheNote).toHaveBeenCalledWith(
        expect.objectContaining({
          id: note.id
        })
      );
    });
  });
  
  describe('POST /notes (createNote)', () => {
    it('should invalidate user notes cache after creating a note', async () => {
      const noteData = {
        title: 'Test Note',
        content: 'This is a test note content'
      };
      
      const res = await withAuth(
        request.post('/notes').send(noteData),
        testUser
      );
      
      expect(res.statusCode).toBe(201);
      
      // Verify cache invalidation
      expect(noteCache.invalidateUserNotes).toHaveBeenCalledWith(testUser.id);
    });
  });
  
  describe('PUT /notes/:id (updateNote)', () => {
    it('should invalidate all related caches after updating a note', async () => {
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
      
      // Verify cache invalidation
      expect(noteCache.invalidateAllNoteCache).toHaveBeenCalledWith(
        note.id.toString(),
        testUser.id
      );
    });
  });
  
  describe('DELETE /notes/:id (deleteNote)', () => {
    it('should invalidate all related caches after permanently deleting a note', async () => {
      const note = await createTestNote(testUser.id);
      
      const res = await withAuth(
        request.delete(`/notes/${note.id}`),
        testUser
      );
      
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('permanently deleted');
      
      // Verify note and version cache invalidation
      expect(noteCache.invalidateAllNoteCache).toHaveBeenCalledWith(
        note.id.toString(),
        testUser.id
      );
      
      // Verify search results cache invalidation
      expect(noteCache.invalidateSearchResults).toHaveBeenCalledWith(testUser.id);
    });
  });
  
  describe('PUT /notes/:id/soft-delete (softDeleteNote)', () => {
    it('should invalidate all related caches after soft-deleting a note', async () => {
      const note = await createTestNote(testUser.id);
      
      const res = await withAuth(
        request.put(`/notes/${note.id}/soft-delete?version=${note.version}`),
        testUser
      );
      
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('soft-deleted');
      
      // Verify note and version cache invalidation
      expect(noteCache.invalidateAllNoteCache).toHaveBeenCalledWith(
        note.id.toString(),
        testUser.id
      );
      
      // Verify search results cache invalidation
      expect(noteCache.invalidateSearchResults).toHaveBeenCalledWith(testUser.id);
      
      // Verify the note was marked as deleted
      const deletedNote = await db.Note.findByPk(note.id);
      expect(deletedNote).not.toBeNull();
      expect(deletedNote.isDeleted).toBe(true);
    });
    
    it('should return 409 on version conflict during soft-delete', async () => {
      const note = await createTestNote(testUser.id);
      
      const res = await withAuth(
        request.put(`/notes/${note.id}/soft-delete?version=${note.version-1}`),
        testUser
      );
      
      expect(res.statusCode).toBe(409);
      expect(res.body.error).toContain('Version conflict');
      
      // Verify cache was NOT invalidated since operation failed
      expect(noteCache.invalidateAllNoteCache).not.toHaveBeenCalled();
      expect(noteCache.invalidateSearchResults).not.toHaveBeenCalled();
    });
  });
  
  describe('GET /notes/search (searchNotes)', () => {
    it('should return search results from cache when available', async () => {
      const cachedResults = [
        { id: 1, title: 'Test Note', content: 'Search term match', userId: testUser.id }
      ];
      
      // Setup cache hit
      noteCache.getSearchResults.mockResolvedValueOnce(cachedResults);
      
      const res = await withAuth(
        request.get('/notes/search?q=search'),
        testUser
      );
      
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(cachedResults);
      expect(noteCache.getSearchResults).toHaveBeenCalledWith(testUser.id, 'search');
    });
    
    it('should search in database and cache when results not in cache', async () => {
      // Create a note with searchable content
      await createTestNote(testUser.id, {
        title: 'Unique Search Title',
        content: 'Unique search content to find'
      });
      
      // Setup cache miss
      noteCache.getSearchResults.mockResolvedValueOnce(null);
      
      const res = await withAuth(
        request.get('/notes/search?q=unique'),
        testUser
      );
      
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      
      // Verify search results were cached
      expect(noteCache.cacheSearchResults).toHaveBeenCalledWith(
        testUser.id,
        'unique',
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Unique Search Title',
            content: 'Unique search content to find'
          })
        ])
      );
    });
  });
});
