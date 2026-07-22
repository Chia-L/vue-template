import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN.json'
import enUS from './en-US.json'

const lang = {
  zhCN: 'zh-CN',
  enUS: 'en-US'
}
console.log(zhCN, enUS)
const i18n = createI18n({
  legacy: false,
  locale: 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    [lang.zhCN]: zhCN,
    [lang.enUS]: enUS,
  },
})

export default i18n
