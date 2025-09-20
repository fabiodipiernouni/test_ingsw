module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/services/generated/**',
    '!src/**/__tests__/**',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapping: {
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@auth/(.*)$': '<rootDir>/src/services/auth-service/$1',
    '^@property/(.*)$': '<rootDir>/src/services/property-service/$1',
    '^@search/(.*)$': '<rootDir>/src/services/search-service/$1',
    '^@user/(.*)$': '<rootDir>/src/services/user-service/$1',
    '^@notification/(.*)$': '<rootDir>/src/services/notification-service/$1',
    '^@generated/(.*)$': '<rootDir>/src/services/generated/$1'
  }
};