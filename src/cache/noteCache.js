import redisClient from './redis.js';

// Cache TTL in seconds
const DEFAULT_TTL = 60 * 5; // 5 minutes default

/**
 * Note cache service
 * Manages cached access to notes with proper invalidation
 */
class NoteCache {
  /**
   * Generate cache key for user's notes
   * @param {Number} userId - The user's ID
   * @returns {String} - Redis key for all notes
   */
  getUserNotesKey(userId) {
    return `user:${userId}:notes`;
  }

  /**
   * Generate cache key for a specific note
   * @param {Number} noteId - The note's ID
   * @returns {String} - Redis key for the note
   */
  getNoteKey(noteId) {
    return `note:${noteId}`;
  }

  /**
   * Generate cache key for note versions
   * @param {Number} noteId - The note's ID
   * @returns {String} - Redis key for note versions
   */
  getNoteVersionsKey(noteId) {
    return `note:${noteId}:versions`;
  }

  /**
   * Generate cache key for search results
   * @param {Number} userId - The user's ID
   * @param {String} query - The search query
   * @returns {String} - Redis key for search results
   */
  getSearchKey(userId, query) {
    return `user:${userId}:search:${query}`;
  }
  
  /**
   * Generate cache key for shared notes
   * @param {Number} userId - The user's ID
   * @returns {String} - Redis key for shared notes
   */
  getSharedNotesKey(userId) {
    return `user:${userId}:shared_notes`;
  }

  /**
   * Cache user's notes
   * @param {Number} userId - User ID
   * @param {Array} notes - Array of note objects
   * @param {Number} ttl - Cache TTL in seconds
   */
  async cacheUserNotes(userId, notes, ttl = DEFAULT_TTL) {
    try {
      const key = this.getUserNotesKey(userId);
      await redisClient.setEx(key, ttl, JSON.stringify(notes));
      console.log(`Cached notes for user ${userId}`);
    } catch (error) {
      console.error('Error caching user notes:', error);
      // Continue execution even if caching fails
    }
  }

  /**
   * Retrieve user's notes from cache
   * @param {Number} userId - User ID
   * @returns {Array|null} - Array of note objects or null if not in cache
   */
  async getUserNotes(userId) {
    try {
      const key = this.getUserNotesKey(userId);
      const cachedNotes = await redisClient.get(key);
      
      if (cachedNotes) {
        console.log(`Cache hit: notes for user ${userId}`);
        return JSON.parse(cachedNotes);
      }
      
      console.log(`Cache miss: notes for user ${userId}`);
      return null;
    } catch (error) {
      console.error('Error retrieving user notes from cache:', error);
      return null;
    }
  }

  /**
   * Cache a single note
   * @param {Object} note - The note object
   * @param {Number} ttl - Cache TTL in seconds
   */
  async cacheNote(note, ttl = DEFAULT_TTL) {
    try {
      const key = this.getNoteKey(note.id);
      await redisClient.setEx(key, ttl, JSON.stringify(note));
      console.log(`Cached note ${note.id}`);
    } catch (error) {
      console.error('Error caching note:', error);
    }
  }

  /**
   * Retrieve a note from cache
   * @param {Number} noteId - Note ID
   * @returns {Object|null} - Note object or null if not in cache
   */
  async getNote(noteId) {
    try {
      const key = this.getNoteKey(noteId);
      const cachedNote = await redisClient.get(key);
      
      if (cachedNote) {
        console.log(`Cache hit: note ${noteId}`);
        return JSON.parse(cachedNote);
      }
      
      console.log(`Cache miss: note ${noteId}`);
      return null;
    } catch (error) {
      console.error('Error retrieving note from cache:', error);
      return null;
    }
  }

  /**
   * Cache note versions
   * @param {Number} noteId - Note ID
   * @param {Array} versions - Array of version objects
   * @param {Number} ttl - Cache TTL in seconds
   */
  async cacheNoteVersions(noteId, versions, ttl = DEFAULT_TTL) {
    try {
      const key = this.getNoteVersionsKey(noteId);
      await redisClient.setEx(key, ttl, JSON.stringify(versions));
      console.log(`Cached versions for note ${noteId}`);
    } catch (error) {
      console.error('Error caching note versions:', error);
    }
  }

  /**
   * Retrieve note versions from cache
   * @param {Number} noteId - Note ID
   * @returns {Array|null} - Array of version objects or null if not in cache
   */
  async getNoteVersions(noteId) {
    try {
      const key = this.getNoteVersionsKey(noteId);
      const cachedVersions = await redisClient.get(key);
      
      if (cachedVersions) {
        console.log(`Cache hit: versions for note ${noteId}`);
        return JSON.parse(cachedVersions);
      }
      
      console.log(`Cache miss: versions for note ${noteId}`);
      return null;
    } catch (error) {
      console.error('Error retrieving note versions from cache:', error);
      return null;
    }
  }

  /**
   * Cache search results
   * @param {Number} userId - User ID
   * @param {String} query - Search query
   * @param {Array} results - Search results
   * @param {Number} ttl - Cache TTL in seconds
   */
  async cacheSearchResults(userId, query, results, ttl = DEFAULT_TTL) {
    try {
      const key = this.getSearchKey(userId, query);
      await redisClient.setEx(key, ttl, JSON.stringify(results));
      console.log(`Cached search results for user ${userId}, query: "${query}"`);
    } catch (error) {
      console.error('Error caching search results:', error);
    }
  }

  /**
   * Retrieve search results from cache
   * @param {Number} userId - User ID
   * @param {String} query - Search query
   * @returns {Array|null} - Search results or null if not in cache
   */
  async getSearchResults(userId, query) {
    try {
      const key = this.getSearchKey(userId, query);
      const cachedResults = await redisClient.get(key);
      
      if (cachedResults) {
        console.log(`Cache hit: search results for user ${userId}, query: "${query}"`);
        return JSON.parse(cachedResults);
      }
      
      console.log(`Cache miss: search results for user ${userId}, query: "${query}"`);
      return null;
    } catch (error) {
      console.error('Error retrieving search results from cache:', error);
      return null;
    }
  }
  
  /**
   * Invalidate user's notes cache
   * @param {Number} userId - User ID
   */
  async invalidateUserNotes(userId) {
    try {
      // Delete the user's notes cache
      const key = this.getUserNotesKey(userId);
      const sharedKey = this.getSharedNotesKey(userId);
      
      // Delete both regular and shared notes caches
      await Promise.all([
        redisClient.del(key),
        redisClient.del(sharedKey)
      ]);
      
      console.log(`Invalidated notes cache for user ${userId}`);
      
      // Also invalidate any search caches for this user
      // This would be more efficient with a pattern search, but keeping it simple
      // A real production implementation might use a different pattern or approach
    } catch (error) {
      console.error('Error invalidating user notes cache:', error);
    }
  }

  /**
   * Invalidate note cache
   * @param {Number} noteId - Note ID
   */
  async invalidateNote(noteId) {
    try {
      // Delete the note cache
      const noteKey = this.getNoteKey(noteId);
      const versionsKey = this.getNoteVersionsKey(noteId);
      
      await Promise.all([
        redisClient.del(noteKey),
        redisClient.del(versionsKey)
      ]);
      
      console.log(`Invalidated cache for note ${noteId}`);
    } catch (error) {
      console.error('Error invalidating note cache:', error);
    }
  }
  
  /**
   * Invalidate note versions cache
   * @param {Number} noteId - Note ID
   */
  async invalidateNoteVersions(noteId) {
    try {
      const key = this.getNoteVersionsKey(noteId);
      await redisClient.del(key);
      console.log(`Invalidated note versions cache for note ${noteId}`);
    } catch (error) {
      console.error('Error invalidating note versions cache:', error);
    }
  }

  /**
   * Invalidate all caches related to a note
   * @param {Number} noteId - Note ID
   * @param {Number} userId - User ID
   */
  async invalidateAllNoteCache(noteId, userId) {
    try {
      // Delete note cache, note versions cache, and user notes cache directly
      const noteKey = this.getNoteKey(noteId);
      const noteVersionsKey = this.getNoteVersionsKey(noteId);
      const userNotesKey = this.getUserNotesKey(userId);
      
      await redisClient.del(noteKey);
      await redisClient.del(noteVersionsKey);
      await redisClient.del(userNotesKey);
      
      console.log(`Invalidated all caches for note ${noteId} and user ${userId}`);
    } catch (error) {
      console.error('Error invalidating all note caches:', error);
    }
  }
  
  /**
   * Invalidate search results cache for a user
   * @param {Number} userId - User ID
   * @param {String} query - Optional specific search query to invalidate
   */
  async invalidateSearchResults(userId, query = null) {
    try {
      if (query) {
        const key = this.getSearchKey(userId, query);
        await redisClient.del(key);
        console.log(`Invalidated search results cache for user ${userId} and query "${query}"`);
      } else {
        // Invalidate all search results for a user using pattern matching
        const pattern = `user:${userId}:search:*`;
        const keys = await redisClient.keys(pattern);
        
        if (keys && keys.length > 0) {
          await redisClient.del(keys);
          console.log(`Invalidated ${keys.length} search results caches for user ${userId}`);
        } else {
          console.log(`No search results caches found for user ${userId}`);
        }
      }
    } catch (error) {
      console.error('Error invalidating search results cache:', error);
    }
  }

  /**
   * Cache shared notes for a user
   * @param {Number} userId - User ID
   * @param {Array} notes - Array of shared note objects
   * @param {Number} ttl - Cache TTL in seconds
   */
  async cacheSharedNotes(userId, notes, ttl = DEFAULT_TTL) {
    try {
      const key = this.getSharedNotesKey(userId);
      await redisClient.setEx(key, ttl, JSON.stringify(notes));
      console.log(`Cached shared notes for user ${userId}`);
    } catch (error) {
      console.error('Error caching shared notes:', error);
      // Continue execution even if caching fails
    }
  }

  /**
   * Retrieve shared notes for a user from cache
   * @param {Number} userId - User ID
   * @returns {Array|null} - Array of shared note objects or null if not in cache
   */
  async getSharedNotes(userId) {
    try {
      const key = this.getSharedNotesKey(userId);
      const cachedNotes = await redisClient.get(key);
      
      if (cachedNotes) {
        console.log(`Cache hit: shared notes for user ${userId}`);
        return JSON.parse(cachedNotes);
      }
      
      console.log(`Cache miss: shared notes for user ${userId}`);
      return null;
    } catch (error) {
      console.error('Error retrieving shared notes from cache:', error);
      return null;
    }
  }
}

// Export as singleton
export default new NoteCache();
