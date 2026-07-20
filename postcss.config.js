export default {
  plugins: {
    'postcss-preset-env': {
      stage: 2, // 阶段 2 表示支持 CSS 2 功能
      browsers: '> 1%, last 2 versions, not dead', // 目标浏览器
      features: {
        'nesting-rules': true, // 开启嵌套规则
        'custom-properties': true, // css变量
      },
    },
    tailwindcss: {},
    autoprefixer: {},
  },
}
