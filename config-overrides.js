const webpack = require('webpack');

module.exports = function override(config, env) {
  //do stuff with the webpack config...

  // Exclude node_modules from source-map-loader to prevent warning spam
  const sourceMapLoader = config.module.rules
    .find((rule) => Array.isArray(rule.oneOf))
    ?.oneOf.find((r) => r.loader && r.loader.includes('source-map-loader'));
  if (sourceMapLoader) {
    sourceMapLoader.exclude = /node_modules/;
  }

  config.resolve.fallback = {
    stream: require.resolve('stream-browserify'),
    // assert: require.resolve('assert-browserify'),
    crypto: require.resolve('crypto-browserify'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    zlib: require.resolve('zlib-browserify'),
    'process/browser': require.resolve('process/browser'),
  };
  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  );

  config.watchOptions = {
    ignored: '*.tsx',
  };

  return config;
};
