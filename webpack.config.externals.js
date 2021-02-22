/*********************************************************************
* Copyright (c) Intel Corporation 2020
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

const path = require("path"); //No ES6 in webpack config 
const nodeExternals = require('webpack-node-externals');
// const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: "production",
  entry: {
    auditlog: "./src/reactjs/components/AuditLog/AuditLog.tsx",
    kvm: "./src/reactjs/components/KVM/UI.tsx",
    sol: './src/reactjs/components/SerialOverLAN/Sol.tsx',
    device: './src/reactjs/components/DeviceGrid/DeviceGrid.tsx',
    profile:'./src/reactjs/components/ProfileEditor/ProfileEditor.tsx',
    cira: './src/reactjs/components/CIRAEditor/CiraEditor.tsx',
    domain: './src/reactjs/components/DomainEditor/DomainEditor.tsx',
    network:'./src/reactjs/components/NetworkEditor/NetworkEditor.tsx',
    mps: "./src/reactjs/components/mps.tsx",
    rps:"./src/reactjs/components/rps.tsx",
    core: "./src/core/index.ts"
  },
  //sourceMap in tsconfig which holds information about your original files when the code is minified
  //devtool deal with existing source maps
  devtool: "inline-source-map",

  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "./dist"),
    library: '',
    libraryTarget: 'commonjs'
  },
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ['awesome-typescript-loader'],
      },
      {
        test: /\.(sc|sa|c)ss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      }, {
        test: /\.svg$/,
        use: ["svg-url-loader"],
      }
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  }
};
