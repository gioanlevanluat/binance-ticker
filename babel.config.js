module.exports = {
  presets: [
    ['@babel/preset-env', {
      useBuiltIns: 'entry',
      corejs: 3,  // Đảm bảo rằng bạn đang sử dụng core-js phiên bản 3
    }],
  ],
};