const path = require("path");
module.exports = {
  entry: ["./index.js"],
  output: {
    filename: "plugin.js",
    path: __dirname
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: "babel-loader",
          options: {}
        }
      },
      {
        test: /\.html$/,
        use: [{ loader: "html-loader", options: { minimize: true } }]
      }
    ]
  }
};
