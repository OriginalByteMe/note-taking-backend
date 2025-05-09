export default {
  // Indicates whether each individual test should be reported during the run
  verbose: true,
  
  // The test environment that will be used for testing
  testEnvironment: "node",
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: true,
  
  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",
  
  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/bin/**",
    "!src/migrations/**",
    "!src/seeders/**"
  ],
  
  // Use setupMiddlewareMocks.js only for middleware tests, and setupJest.js for all
  projects: [
    {
      displayName: "middlewares",
      testMatch: ["<rootDir>/tests/unit/middlewares/**/*.test.js"],
      // Load DB mock before modules so middleware tests use the mock
      setupFiles: ["<rootDir>/tests/setupMiddlewareMocks.js"],
      // Add Redis mock for middleware tests
      setupFilesAfterEnv: ["<rootDir>/tests/setupRedisMock.js"]
    },
    {
      displayName: "default",
      testMatch: ["<rootDir>/tests/**/*.test.js", "!<rootDir>/tests/unit/middlewares/**/*.test.js"],
      // Load Redis mock for all tests
      setupFilesAfterEnv: ["<rootDir>/tests/setupJest.js", "<rootDir>/tests/setupRedisMock.js"]
    }
  ],
  
  // Use babel to transform ES modules
  transform: {
    "^.+\\.js$": "babel-jest"
  },
  
  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",

  // An array of regexp pattern strings that are matched against all test paths
  testPathIgnorePatterns: [
    "/node_modules/"
  ],
  
  // Indicates whether each individual test should be reported during the run
  verbose: true,

};
