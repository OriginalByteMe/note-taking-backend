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
  
  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: ["./tests/setupJest.js"],
  
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
