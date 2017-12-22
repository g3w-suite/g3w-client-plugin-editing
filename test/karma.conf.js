// Karma configuration
// Generated on Fri Dec 22 2017 10:44:47 GMT+0100 (CET)

var path = require('path');
var webpack = require('webpack');
require('dotenv').config();

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha'],


    // list of files / patterns to load in the browser
    files: [
      process.env.G3WCLIENT_LIBRARIES + '/sdk.ext.1513957083930.min.js',
      process.env.G3WCLIENT_LIBRARIES + '/template.ext.1513957083930.min.js',
      process.env.G3WCLIENT_LIBRARIES + '/app.1513957083930.min.js',
      {
        pattern: path.resolve(__dirname, require.resolve('expect.js/index.js')),
        watched: false
      },

     'specs/**/*.js'
    ],


    // list of files / patterns to exclude
    exclude: [
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'specs/**/*.js': ['webpack']
    },

    webpack: {
      resolve: {
        modules: [
          '/home/volterra79/PROGETTI/g3w-client/src/libs/plugins/editing'
        ]
      },
      module: {
        loaders: [
          {
            test: /\.(html)$/,
            use: {
              loader: 'html-loader'
            }
          }
        ]
      }

    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity


  })
};
