/**
 * Database Mocking Utilities
 * Provides utilities for mocking Sequelize and database operations in tests
 */

/**
 * Creates a mock Sequelize transaction object
 * @returns {Object} Mock transaction object
 */
export const createMockTransaction = () => {
  return {
    // Transaction status
    finished: false,
    
    // Mock lock types
    LOCK: {
      UPDATE: 'UPDATE',
      SHARE: 'SHARE'
    },
    
    // Mock commit method
    commit: jest.fn().mockImplementation(() => {
      return new Promise(resolve => {
        this.finished = true;
        resolve();
      });
    }),
    
    // Mock rollback method
    rollback: jest.fn().mockImplementation(() => {
      return new Promise(resolve => {
        this.finished = true;
        resolve();
      });
    })
  };
};

/**
 * Creates a mock Sequelize model for testing
 * @param {string} modelName - Name of the model
 * @param {Object} mockData - Mock data for find operations
 * @returns {Object} Mock Sequelize model
 */
export const createMockModel = (modelName, mockData = []) => {
  // Track created instances for testing
  const createdInstances = [];
  const updatedInstances = [];
  const deletedInstances = [];
  
  // Convert mockData to instances with appropriate methods
  const instances = mockData.map(data => createMockInstance(data));
  
  // Internal data storage
  let dataStore = [...instances];
  
  const model = {
    // Model name
    name: modelName,
    
    // Find methods
    findOne: jest.fn().mockImplementation(options => {
      if (!options || !options.where) {
        return Promise.resolve(dataStore[0] || null);
      }
      
      const result = dataStore.find(instance => {
        // Match all conditions in where clause
        return Object.entries(options.where).every(([key, value]) => {
          return instance[key] === value;
        });
      });
      
      return Promise.resolve(result ? createMockInstance(result) : null);
    }),
    
    findAll: jest.fn().mockImplementation(options => {
      if (!options || !options.where) {
        return Promise.resolve([...dataStore].map(createMockInstance));
      }
      
      const results = dataStore.filter(instance => {
        // Match all conditions in where clause
        return Object.entries(options.where).every(([key, value]) => {
          // Handle Sequelize operators (basic implementation)
          if (key === 'isDeleted' && value === false) {
            return instance.isDeleted === false;
          }
          
          if (typeof value === 'object' && value !== null) {
            // Check for Sequelize operators
            const opKey = Object.keys(value)[0];
            if (opKey.startsWith('Op.')) {
              // Handle like operator
              if (opKey === 'Op.like' && typeof instance[key] === 'string') {
                const pattern = value[opKey].replace(/%/g, '');
                return instance[key].includes(pattern);
              }
              // Handle other operators as needed
            }
            return false;
          }
          
          return instance[key] === value;
        });
      });
      
      return Promise.resolve(results.map(createMockInstance));
    }),
    
    findByPk: jest.fn().mockImplementation(id => {
      const result = dataStore.find(instance => instance.id === id);
      return Promise.resolve(result ? createMockInstance(result) : null);
    }),
    
    // Create method
    create: jest.fn().mockImplementation((data, options = {}) => {
      // Generate ID if not provided
      const newId = Math.max(0, ...dataStore.map(item => item.id || 0)) + 1;
      const newInstance = {
        id: newId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add to dataStore
      if (!options.transaction || options.transaction.finished === false) {
        dataStore.push(newInstance);
      }
      
      // Add to created instances for testing
      createdInstances.push(newInstance);
      
      // Return mock instance
      return Promise.resolve(createMockInstance(newInstance));
    }),
    
    // Update method
    update: jest.fn().mockImplementation((data, options = {}) => {
      if (!options.where) {
        return Promise.resolve([0, []]);
      }
      
      // Find matching instances
      const matches = dataStore.filter(instance => {
        return Object.entries(options.where).every(([key, value]) => {
          return instance[key] === value;
        });
      });
      
      // Update matches
      const updatedCount = matches.length;
      const updatedResults = [];
      
      matches.forEach(instance => {
        Object.assign(instance, data, { updatedAt: new Date() });
        updatedResults.push(instance);
        updatedInstances.push(instance);
      });
      
      return Promise.resolve([updatedCount, updatedResults]);
    }),
    
    // Destroy method
    destroy: jest.fn().mockImplementation(options => {
      if (!options.where) {
        const count = dataStore.length;
        dataStore = [];
        return Promise.resolve(count);
      }
      
      // Find matches
      const matches = dataStore.filter(instance => {
        return Object.entries(options.where).every(([key, value]) => {
          if (Array.isArray(value) && key === 'id') {
            return value.includes(instance.id);
          }
          return instance[key] === value;
        });
      });
      
      // Remove matches from dataStore
      dataStore = dataStore.filter(instance => !matches.includes(instance));
      
      // Add to deleted instances for testing
      deletedInstances.push(...matches);
      
      return Promise.resolve(matches.length);
    }),
    
    // Reset all mock data
    __resetMockData: (newData = []) => {
      dataStore = [...newData];
      createdInstances.length = 0;
      updatedInstances.length = 0;
      deletedInstances.length = 0;
    },
    
    // Get tracked instances for testing
    __getCreatedInstances: () => [...createdInstances],
    __getUpdatedInstances: () => [...updatedInstances],
    __getDeletedInstances: () => [...deletedInstances],
    __getCurrentData: () => [...dataStore]
  };
  
  return model;
};

/**
 * Create a mock Sequelize instance (record) with model methods
 * @param {Object} data - Instance data
 * @returns {Object} Mock Sequelize instance
 */
export const createMockInstance = (data) => {
  // Create a copy of the data
  const instanceData = { ...data };
  
  // Add instance methods
  const instance = {
    ...instanceData,
    
    // Add common instance methods
    update: jest.fn().mockImplementation((updateData, options = {}) => {
      Object.assign(instanceData, updateData, { updatedAt: new Date() });
      Object.assign(instance, instanceData);
      return Promise.resolve(instance);
    }),
    
    destroy: jest.fn().mockImplementation((options = {}) => {
      return Promise.resolve();
    }),
    
    toJSON: jest.fn().mockImplementation(() => {
      return { ...instanceData };
    }),
    
    // Provide getters for field access
    get: jest.fn().mockImplementation(field => {
      return instanceData[field];
    })
  };
  
  return instance;
};

/**
 * Creates a mock Sequelize DB object with models
 * @param {Object} modelData - Map of model names to mock data
 * @returns {Object} Mock DB object
 */
export const createMockDB = (modelData = {}) => {
  // Create Sequelize mock
  const sequelizeMock = {
    transaction: jest.fn().mockImplementation(() => {
      return Promise.resolve(createMockTransaction());
    }),
    
    authenticate: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    
    // Add Sequelize operators
    Sequelize: {
      Op: {
        like: 'Op.like',
        or: 'Op.or',
        and: 'Op.and',
        not: 'Op.not',
        in: 'Op.in',
        gt: 'Op.gt',
        lt: 'Op.lt',
        gte: 'Op.gte',
        lte: 'Op.lte'
      }
    }
  };
  
  // Create models
  const models = Object.entries(modelData).reduce((acc, [modelName, data]) => {
    acc[modelName] = createMockModel(modelName, data);
    return acc;
  }, {});
  
  return {
    sequelize: sequelizeMock,
    Sequelize: sequelizeMock.Sequelize,
    ...models
  };
};

/**
 * Setup database mocking for tests
 * @param {Object} mockData - Mock data for models
 */
export const setupDBMocking = (mockData = {}) => {
  const mockDB = createMockDB(mockData);
  
  // Mock the database module
  jest.mock('../../src/config/database.js', () => ({
    db: mockDB,
    connectToDatabase: jest.fn().mockResolvedValue()
  }));
  
  return {
    getMockDB: () => mockDB
  };
};
