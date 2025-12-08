module.exports = {
  rootDir: "..",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/app/javascript"],
  testMatch: ["**/__tests__/**/*.test.js"],
  moduleNameMapper: {
    "^controllers/(.*)$": "<rootDir>/app/javascript/controllers/$1",
    "^theme/(.*)$": "<rootDir>/app/javascript/theme/$1",
    "^lib/(.*)$": "<rootDir>/app/javascript/lib/$1",
  },
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  setupFilesAfterEnv: ["<rootDir>/app/javascript/__tests__/setup.js"],
  collectCoverageFrom: [
    "app/javascript/**/*.js",
    "!app/javascript/**/__tests__/**",
    "!app/javascript/**/index.js",
  ],
  coverageDirectory: "coverage/javascript",
};
