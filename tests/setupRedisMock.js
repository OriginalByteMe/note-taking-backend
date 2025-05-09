// Mock redis client for all tests
jest.mock('../src/cache/redis.js', () => ({
    __esModule: true,
    default: {
      connect: jest.fn().mockResolvedValue(true),
      setEx: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockImplementation((key) => {
        // You can implement more sophisticated caching behavior if needed
        return Promise.resolve(null);
      }),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      on: jest.fn(),
      isReady: true
    }
  }))
  