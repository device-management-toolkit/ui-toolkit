/*********************************************************************
 * Copyright (c) Intel Corporation 2020
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

const path = require('path') // No ES6 in webpack config
const webpack = require('webpack')
const { workerConfig, kvmWorkerSourceAlias, kvmWorkerSourceRule } = require('./webpack.config.worker')

const coreConfig = {
  dependencies: [workerConfig.name],
  mode: 'production',
  entry: {
    core: './src/core/index.ts'
  },
  // sourceMap in tsconfig which holds information about your original files when the code is minified
  // devtool deal with existing source maps
  devtool: 'inline-source-map',

  output: {
    filename: '[name].min.js',
    path: path.resolve(__dirname, './dist'),
    library: {
      name: 'ui-toolkit',
      type: 'umd'
    }
  },
  module: {
    rules: [
      kvmWorkerSourceRule,
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
    alias: kvmWorkerSourceAlias,
    extensions: [
      '.tsx',
      '.ts',
      '.js'
    ]
  }
}

module.exports = [workerConfig, coreConfig]
