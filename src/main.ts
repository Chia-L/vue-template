import { createApp } from 'vue'
import App from './App.vue'
import router from './app/router'
import pinia from './app/stores'
import i18n from '@/assets/i18n/locales/index'
import { setupVxeTable } from './app/core/setup-vxe-table'
import '@/assets/styles/index.css'

const app = createApp(App)
const { t } = i18n.global

app.config.globalProperties.$appConfig = Object.freeze(APP_CONFIG)
document.title = app.config.globalProperties.$appConfig.app.name || t('main.bccc00b4')
document.querySelector('link[rel="icon"]')?.setAttribute('href', app.config.globalProperties.$appConfig.app.favicon || '/images/logo.ico')

// 注册插件
app.use(router)
app.use(pinia)
app.use(i18n)
setupVxeTable(app)

app.mount('#app')
