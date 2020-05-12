const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

module.exports = {
    entry: './src/main.js',
    mode: "development",
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.s[ac]ss$/i,
                use: [
                    'style-loader', // Creates `style` nodes from JS strings
                    'css-loader', // Translates CSS into CommonJS   
                    'sass-loader', // Compiles Sass to CSS
                ],
            },
            {
                test: /\.(png|svg|jpg|gif|glb)$/,
                use: [
                    'file-loader',
                ],
            },
        ],
    },
    optimization: {
        //minimize: true,
        minimizer: [new TerserPlugin({}), new OptimizeCSSAssetsPlugin({})],
    },
};