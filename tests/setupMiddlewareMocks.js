// Jest setup for middleware tests: mock the DB only for middleware/unit tests
jest.mock('../src/config/database.js', () => {
  const mockSequelize = {
    sync: jest.fn().mockResolvedValue(),
    authenticate: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    define: jest.fn(),
    query: jest.fn(),
  };
  return {
    db: {
      User: { findByPk: jest.fn() },
      sequelize: mockSequelize
    },
    sequelize: mockSequelize,
    initialize: jest.fn().mockResolvedValue(),
    connectToDatabase: jest.fn().mockResolvedValue(),
    default: mockSequelize
  };
});
