/*********************************************************************
 * Copyright (c) Intel Corporation 2020
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { coverageConfigDefaults, defineConfig } from 'vitest/config'

// Treat only affirmative values as CI so e.g. CI=false stays local behavior.
const isCI = /^(true|1)$/i.test(process.env.CI ?? '')

export default defineConfig({
  test: {
    // Mirrors the previous jest `testMatch`. The `.spec.js` entry is required
    // for src/test/zlib.spec.js, which exercises the vendored CJS zlib module.
    include: [
      'src/test/**/*.test.ts',
      'src/test/**/*.spec.ts',
      'src/test/**/*.spec.js'
    ],
    // The suite relied on jest's implicit globals (via @types/jest) for
    // `describe`/`it`/`expect`/`beforeEach`. Enabling globals preserves that
    // across ~1100 assertion sites; only `vi` is imported explicitly. Matches
    // the pattern already used in mps, rps and ui-toolkit-react.
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // The RLE/image-decoding suites are memory hungry — the jest script ran
    // with --runInBand for this reason. `poolOptions.forks.singleFork` was
    // removed in Vitest 4; fileParallelism: false is the supported equivalent
    // and runs one test file at a time.
    pool: 'forks',
    fileParallelism: false,
    // Restore anything installed via vi.stubGlobal (e.g. the FileReader mock
    // in amtider.spec.ts) after each test so mocks never leak across tests.
    unstubGlobals: true,
    reporters: isCI ? [
          'default',
          'junit',
          'github-actions'
        ] : ['default'],
    outputFile: {
      junit: 'junit.xml'
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: [
        'text',
        'lcov',
        'clover',
        'json'
      ],
      include: ['src/core/**/*.{ts,js}'],
      exclude: [
        ...coverageConfigDefaults.exclude,
        'src/**/*.d.ts',
        'src/test/**',
        // The coverage script skips the memory-hungry rledecoder/imagehelper
        // suites (see the --exclude flags in package.json), so keep their
        // targets out of the denominator instead of reporting near-zero
        // coverage for files that are actually tested by `npm run test`.
        // Globs so the excludes survive a file move.
        '**/RLEDecoder.ts',
        '**/ImageHelper.ts'
      ]
    }
  }
})
