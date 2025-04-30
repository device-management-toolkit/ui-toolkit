/*********************************************************************
 * Copyright (c) Intel Corporation 2020
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

module.exports = {
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json'
    }
  },
  moduleFileExtensions: [
    'js',
    'ts',
    'tsx'
  ],
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest'
  },
  testMatch: [
    '**/test/**/*.test.ts',
    '**/test/**/*.spec.ts',
    '**/test/**/*.spec.js'
  ],
  reporters: ['default', 'jest-junit'],
  testEnvironment: 'jsdom'
}
