const webpack = require('webpack');

module.exports = function override(config, env) {
    //do stuff with the webpack config...

    config.resolve.fallback = {
        stream: require.resolve('stream-browserify'),
        // assert: require.resolve('assert-browserify'),
        crypto: require.resolve('crypto-browserify'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        zlib: require.resolve("zlib-browserify"),
        'process/browser': require.resolve('process/browser')
    };
    config.plugins.push(
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        }),
    );

    config.watchOptions = {
        ignored: "*.tsx"
    };

    return config;
};