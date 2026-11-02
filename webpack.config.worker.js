/*********************************************************************
 * Copyright (c) Intel Corporation 2026
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

const path = require('path') // No ES6 in webpack config

// Builds the KVM worker as a standalone script. The core bundles depend on this build and inline
// its output as a string (see kvmWorkerSourceRule) so the worker ships inside the library.
const workerOutput = path.resolve(__dirname, './dist/worker')
const workerFile = 'kvm.worker.js'

const workerConfig = {
  name: 'kvm-worker',
  mode: 'production',
  target: 'webworker',
  entry: './src/core/kvm/kvm.worker.ts',
  output: {
    filename: workerFile,
    path: workerOutput
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: [['transform-remove-console', { exclude: ['error', 'warn'] }]]
            }
          },
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.build.json'
            }
          }
        ],
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js']
  }
}

const kvmWorkerSourceAlias = {
  '@kvm-worker-source$': path.join(workerOutput, workerFile)
}

const kvmWorkerSourceRule = {
  test: path.join(workerOutput, workerFile),
  type: 'asset/source'
}

module.exports = { workerConfig, kvmWorkerSourceAlias, kvmWorkerSourceRule }
