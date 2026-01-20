var CopyWebpackPlugin = require('copy-webpack-plugin');
var path = require('path');

module.exports = function () {
  var config = {
    entry: './main.js',
    output: {
      library: 'SculptGL',
      libraryTarget: 'umd',
      libraryExport: 'default',
      path: path.resolve(__dirname, 'docs'),
      filename: 'sculptgl.js',
      publicPath: './'
    },
    resolve: {
      modules: [
        path.join(__dirname, 'src'),
        path.join(__dirname, 'lib'),
        path.join(__dirname, 'node_modules')
      ]
    },
    module: {
      rules: [{
        test: /\.glsl$/,
        loader: 'raw-loader'
      }]
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: 'tools/authSuccess.html', to: 'authSuccess.html' },
          { from: 'tools/index.github.html', to: 'index.html' },
          { from: 'app/css', to: 'css' },
          { from: 'app/resources', to: 'resources' },
          { from: 'app/worker', to: 'worker' }
        ],
      })
    ]
  };

  config.mode = 'production';

  return config;
};
