import { createApp } from 'vue'
import App from './App.vue'
import router from './app/router'
import pinia from './app/stores'
import i18n from '@/assets/i18n'
import { setupVxeTable } from './app/core/setup-vxe-table'
import './assets/styles/index.css'

const app = createApp(App)

// 注册插件
app.use(router)
app.use(pinia)
app.use(i18n)
setupVxeTable(app)

app.mount('#app')
