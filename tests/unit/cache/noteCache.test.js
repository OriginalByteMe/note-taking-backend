import { jest } from '@jest/globals';

import redisClient from '../../../src/cache/redis.js';
import noteCache from '../../../src/cache/noteCache.js';

describe('Note Cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Key Generation', () => {
    it('should generate correct user notes key', () => {
      const userId = 123;
      const key = noteCache.getUserNotesKey(userId);
      expect(key).toBe('user:123:notes');
    });

    it('should generate correct note key', () => {
      const noteId = 456;
      const key = noteCache.getNoteKey(noteId);
      expect(key).toBe('note:456');
    });

    it('should generate correct note versions key', () => {
      const noteId = 789;
      const key = noteCache.getNoteVersionsKey(noteId);
      expect(key).toBe('note:789:versions');
    });

    it('should generate correct search key', () => {
      const userId = 123;
      const query = 'test query';
      const key = noteCache.getSearchKey(userId, query);
      expect(key).toBe('user:123:search:test query');
    });
  });

  describe('Cache Operations', () => {
    const userId = 123;
    const noteId = 456;
    const mockNote = { id: noteId, title: 'Test Note', userId };
    const mockNotes = [mockNote];
    const mockVersions = [{ id: 1, noteId, version: 1 }];
    const mockSearchQuery = 'test';
    const mockSearchResults = [mockNote];

    describe('User Notes', () => {
      it('should cache user notes successfully', async () => {
        await noteCache.cacheUserNotes(userId, mockNotes);
        
        expect(redisClient.setEx).toHaveBeenCalledWith(
          `user:${userId}:notes`,
          expect.any(Number),
          JSON.stringify(mockNotes)
        );
      });

      it('should get user notes from cache when available', async () => {
        redisClient.get.mockResolvedValueOnce(JSON.stringify(mockNotes));
        
        const result = await noteCache.getUserNotes(userId);
        
        expect(redisClient.get).toHaveBeenCalledWith(`user:${userId}:notes`);
        expect(result).toEqual(mockNotes);
      });

      it('should return null when user notes not in cache', async () => {
        redisClient.get.mockResolvedValueOnce(null);
        
        const result = await noteCache.getUserNotes(userId);
        
        expect(redisClient.get).toHaveBeenCalledWith(`user:${userId}:notes`);
        expect(result).toBeNull();
      });

      it('should handle errors when caching user notes', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        redisClient.setEx.mockRejectedValueOnce(new Error('Redis error'));
        
        await noteCache.cacheUserNotes(userId, mockNotes);
        
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });
    });

    describe('Individual Notes', () => {
      it('should cache a note successfully', async () => {
        await noteCache.cacheNote(mockNote);
        
        expect(redisClient.setEx).toHaveBeenCalledWith(
          `note:${noteId}`,
          expect.any(Number),
          JSON.stringify(mockNote)
        );
      });

      it('should get a note from cache when available', async () => {
        redisClient.get.mockResolvedValueOnce(JSON.stringify(mockNote));
        
        const result = await noteCache.getNote(noteId);
        
        expect(redisClient.get).toHaveBeenCalledWith(`note:${noteId}`);
        expect(result).toEqual(mockNote);
      });

      it('should return null when note not in cache', async () => {
        redisClient.get.mockResolvedValueOnce(null);
        
        const result = await noteCache.getNote(noteId);
        
        expect(redisClient.get).toHaveBeenCalledWith(`note:${noteId}`);
        expect(result).toBeNull();
      });
    });

    describe('Note Versions', () => {
      it('should cache note versions successfully', async () => {
        await noteCache.cacheNoteVersions(noteId, mockVersions);
        
        expect(redisClient.setEx).toHaveBeenCalledWith(
          `note:${noteId}:versions`,
          expect.any(Number),
          JSON.stringify(mockVersions)
        );
      });

      it('should get note versions from cache when available', async () => {
        redisClient.get.mockResolvedValueOnce(JSON.stringify(mockVersions));
        
        const result = await noteCache.getNoteVersions(noteId);
        
        expect(redisClient.get).toHaveBeenCalledWith(`note:${noteId}:versions`);
        expect(result).toEqual(mockVersions);
      });
    });

    describe('Search Results', () => {
      it('should cache search results successfully', async () => {
        await noteCache.cacheSearchResults(userId, mockSearchQuery, mockSearchResults);
        
        expect(redisClient.setEx).toHaveBeenCalledWith(
          `user:${userId}:search:${mockSearchQuery}`,
          expect.any(Number),
          JSON.stringify(mockSearchResults)
        );
      });

      it('should get search results from cache when available', async () => {
        redisClient.get.mockResolvedValueOnce(JSON.stringify(mockSearchResults));
        
        const result = await noteCache.getSearchResults(userId, mockSearchQuery);
        
        expect(redisClient.get).toHaveBeenCalledWith(`user:${userId}:search:${mockSearchQuery}`);
        expect(result).toEqual(mockSearchResults);
      });
    });
  });

  describe('Cache Invalidation', () => {
    const userId = 123;
    const noteId = 456;

    it('should invalidate user notes cache', async () => {
      await noteCache.invalidateUserNotes(userId);
      
      expect(redisClient.del).toHaveBeenCalledWith(`user:${userId}:notes`);
    });

    it('should invalidate note cache', async () => {
      await noteCache.invalidateNote(noteId);
      
      expect(redisClient.del).toHaveBeenCalledWith(`note:${noteId}`);
    });

    it('should invalidate note versions cache', async () => {
      await noteCache.invalidateNoteVersions(noteId);
      
      expect(redisClient.del).toHaveBeenCalledWith(`note:${noteId}:versions`);
    });

    it('should invalidate all note caches', async () => {
      await noteCache.invalidateAllNoteCache(noteId, userId);
      
      expect(redisClient.del).toHaveBeenCalledTimes(3);
    });

    it('should invalidate search results cache', async () => {
      const mockSearchKeys = [`user:${userId}:search:test1`, `user:${userId}:search:test2`];
      redisClient.keys.mockResolvedValueOnce(mockSearchKeys);
      
      await noteCache.invalidateSearchResults(userId);
      
      expect(redisClient.keys).toHaveBeenCalledWith(`user:${userId}:search:*`);
      expect(redisClient.del).toHaveBeenCalledWith(mockSearchKeys);
    });

    it('should handle empty search results when invalidating', async () => {
      redisClient.keys.mockResolvedValueOnce([]);
      
      await noteCache.invalidateSearchResults(userId);
      
      expect(redisClient.keys).toHaveBeenCalledWith(`user:${userId}:search:*`);
      expect(redisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      redisClient.get.mockRejectedValueOnce(new Error('Redis error'));
      
      const result = await noteCache.getNote(123);
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
