/*********************************************************************
 * Copyright (c) Intel Corporation 2020
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

const path = require('path') // No ES6 in webpack config
const webpack = require('webpack')

const coreConfig = {
  mode: 'production',
  entry: {
    core: {
      import: './src/core/index.ts',
      library: {
        name: 'ui-toolkit/core',
        type: 'umd'
      }
    }
  },
  output: {
    filename: '[name].bundle.js',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, './dist/bundles')
  },
  optimization: {
    concatenateModules: false
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

module.exports = coreConfig
