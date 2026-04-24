const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const appDirectory = path.resolve(__dirname);

// Packages that need to be transpiled by Babel
const babelLoaderConfiguration = {
  test: /\.(js|jsx|ts|tsx)$/,
  include: [
    path.resolve(appDirectory, 'index.web.js'),
    path.resolve(appDirectory, 'App.tsx'),
    path.resolve(appDirectory, 'src'),
    // react-native and react-native-web need transpiling
    path.resolve(appDirectory, 'node_modules/react-native-vector-icons'),
    path.resolve(appDirectory, 'node_modules/@react-navigation'),
    path.resolve(appDirectory, 'node_modules/react-native-screens'),
    path.resolve(appDirectory, 'node_modules/react-native-safe-area-context'),
  ],
  use: {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true,
      presets: [
        'module:@react-native/babel-preset',
      ],
      plugins: [
        'react-native-web',
      ],
    },
  },
};

// Image & asset handling
const imageLoaderConfiguration = {
  test: /\.(gif|jpe?g|png|svg|ttf|otf|woff|woff2|eot)$/,
  use: {
    loader: 'url-loader',
    options: {limit: 10000},
  },
};

module.exports = {
  entry: path.resolve(appDirectory, 'index.web.js'),

  output: {
    filename: 'bundle.web.js',
    path: path.resolve(appDirectory, 'web-build'),
    publicPath: '/',
  },

  resolve: {
    // Map react-native → react-native-web (core of RNW)
    alias: {
      'react-native$': 'react-native-web',
    },
    // Prefer .web.tsx/.web.ts then .tsx/.ts
    extensions: [
      '.web.tsx', '.web.ts', '.web.jsx', '.web.js',
      '.tsx', '.ts', '.jsx', '.js',
    ],
  },

  module: {
    rules: [
      babelLoaderConfiguration,
      imageLoaderConfiguration,
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(appDirectory, 'public/index.html'),
    }),
  ],

  devServer: {
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
  },
};
