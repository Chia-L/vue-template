/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      screens: {
        xl: '1360px',
      },
      fontSize: {
        12: '12px',
        14: '14px',
        16: '16px',
      },
      fontWeight: {
        500: '500',
        700: '700',
      },
      colors: {
        title: '#303133',
        body: '#606266',
        cap: '#909399',
        link: '#409EFF',
        blue: '#409EFF',
        'blue-light2': '#79BBFF',
        primary: '#17A2BB',
        't-b': '#606266',
        't-cap': '#909399',
      },
      borderRadius: {
        4: '4px',
      },
      spacing: { // 间距(width, height, margin, padding共用)
        10: '10px', // 按钮之间的间距
        16: '16px',
        20: '20px',
      }
    },
  },
  plugins: [],
}
