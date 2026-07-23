import { createI18n } from 'vue-i18n'
// import zhCN from './zh-cn.json'
// import enUS from './en.json'

/* const lang = {
  zhCN: 'zh-cn',
  enUS: 'en'
} */
const i18n = createI18n({
  legacy: false,
  locale: 'zh-cn',
  fallbackLocale: 'zh-cn',
  messages: {
    // [lang.zhCN]: zhCN,
    // [lang.enUS]: enUS,
  },
})

export default i18n
