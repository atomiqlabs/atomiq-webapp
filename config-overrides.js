const webpack = require('webpack');

module.exports = function override(config, env) {
  //do stuff with the webpack config...

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

  // Fix resolve-url-loader source map issues
  const oneOfRule = config.module.rules.find(rule => rule.oneOf);
  if (oneOfRule) {
    const sassRule = oneOfRule.oneOf.find(
      rule => rule.test && rule.test.toString().includes('scss|sass')
    );

    if (sassRule && sassRule.use) {
      sassRule.use.forEach(loader => {
        if (loader.loader && loader.loader.includes('resolve-url-loader')) {
          loader.options = {
            ...loader.options,
            sourceMap: false,
          };
        }
      });
    }
  }

  return config;
};
