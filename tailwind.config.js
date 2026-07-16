/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    screens: {
      'xl': '1360px', // ≥ 1360px 存储仪表盘响应式断点
    },
    extend: {
      fontSize: {
        '12': '12px', // 提示，辅助文字
        '14': '14px', // 正文
        '16': '16px', // 标题
      },
      fontWeight: {
        '500': 500,
        '700': 700,
      },
      colors: {
        'title': '#303133', // 标题
        'body': '#606266', // 正文
        'cap': '#909399', // 提示，辅助文字
        'link': '#409EFF', // 链接颜色
        'blue': '#409EFF', // 蓝色
        'blue-light2': '#79BBFF', // 蓝色-亮-20%
        'primary': '#17A2BB', // 主要颜色
      },
      borderRadius: {
        4: '4px', // 圆角
      },
      spacing: { // 间距(width, height, margin, padding共用)
        10: '10px', // 按钮之间的间距
        16: '16px',
        20: '20px',
      },
    },
  },
  plugins: [],
}
