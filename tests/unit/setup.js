// This file provides a minimal setup for unit tests that don't need a database
// It mocks the database-related functions to avoid initialization

// Setup for test suite that doesn't require actual database
export const mockDb = {
  User: {
    findByPk: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  Note: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  NoteVersion: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn(() => ({
      commit: jest.fn(),
      rollback: jest.fn(),
      LOCK: {
        UPDATE: 'UPDATE'
      },
      finished: false
    })),
    query: jest.fn()
  },
  Sequelize: {
    Op: {
      like: Symbol('like'),
      or: Symbol('or')
    }
  }
};
