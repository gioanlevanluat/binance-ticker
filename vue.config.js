const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  productionSourceMap: true,
  chainWebpack: config => {
    // Dùng 'source-map' cho chế độ phát triển
    config.devtool('source-map');
  },
})
