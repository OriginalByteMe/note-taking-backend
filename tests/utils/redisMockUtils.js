/**
 * Redis Mock Utilities
 * Provides consistent Redis mocking helpers for tests
 */

/**
 * Creates a mock Redis client for testing
 * @returns {Object} Mock Redis client with stubbed methods
 */
export const createMockRedisClient = () => {
  return {
    connect: jest.fn().mockResolvedValue(),
    disconnect: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    setex: jest.fn().mockResolvedValue('OK'),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
    isReady: true
  };
};

/**
 * Creates a mock cached data factory
 * @param {Object} defaultData - Default data to use as cache value
 * @returns {Function} Function that returns cached data for a key
 */
export const createCachedDataFactory = (defaultData = {}) => {
  const cachedData = new Map();
  
  return {
    /**
     * Get cached data for a key
     * @param {string} key - Cache key
     * @returns {string|null} Cached data as JSON string or null
     */
    get: (key) => {
      return cachedData.has(key) 
        ? JSON.stringify(cachedData.get(key))
        : null;
    },
    
    /**
     * Set cached data for a key
     * @param {string} key - Cache key
     * @param {any} value - Data to cache (will be stringified)
     * @param {Object} _options - Options (ignored in mock)
     * @returns {string} OK
     */
    set: (key, value, _options) => {
      let data = value;
      
      // If the value is a string that looks like JSON, parse it
      if (typeof value === 'string' && 
         (value.startsWith('{') || value.startsWith('['))) {
        try {
          data = JSON.parse(value);
        } catch (e) {
          // Not valid JSON, use as is
          data = value;
        }
      }
      
      cachedData.set(key, data);
      return 'OK';
    },
    
    /**
     * Delete a key from cache
     * @param {string} key - Cache key to delete
     * @returns {number} 1 if deleted, 0 if not found
     */
    del: (key) => {
      const existed = cachedData.has(key);
      cachedData.delete(key);
      return existed ? 1 : 0;
    },
    
    /**
     * Check if a key exists in cache
     * @param {string} key - Cache key
     * @returns {number} 1 if exists, 0 if not
     */
    exists: (key) => {
      return cachedData.has(key) ? 1 : 0;
    },
    
    /**
     * Get all current cached data (for testing)
     * @returns {Map} Map of all cached data
     */
    getAllCachedData: () => {
      return cachedData;
    },
    
    /**
     * Clear all cached data (for testing)
     */
    clearAllCachedData: () => {
      cachedData.clear();
    }
  };
};

/**
 * Create middleware that mimics a caching middleware for testing
 * @param {Function} mockFactory - Cache factory function 
 * @returns {Function} Middleware function
 */
export const createMockCachingMiddleware = (mockFactory) => {
  return (req, res, next) => {
    const cacheKey = `cache:${req.originalUrl}`;
    
    const cachedData = mockFactory.get(cacheKey);
    
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }
    
    // Override res.json to cache response
    const originalJson = res.json;
    res.json = function(data) {
      mockFactory.set(cacheKey, JSON.stringify(data));
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Apply Redis mocking to Jest for a test file
 */
export const setupRedisMocking = () => {
  // Mock the redis module
  jest.mock('redis', () => {
    const mockClient = createMockRedisClient();
    
    return {
      createClient: jest.fn(() => mockClient)
    };
  });
  
  // Mock the redis client from the app
  jest.mock('../../src/cache/redis.js', () => {
    const mockClient = createMockRedisClient();
    return { default: mockClient };
  });
  
  return {
    // Re-import redis to get mocked version
    getRedisClient: () => require('../../src/cache/redis.js').default
  };
};
