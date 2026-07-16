import { createApp } from 'vue'
import 'vxe-pc-ui/es/style.css'
import 'vxe-table/lib/style.css'
 import zhCN from 'vxe-pc-ui/lib/language/zh-CN'
import {
  VxeUI,
  VxeModal,
  VxeDrawer,
  VxePager,
  Button as VxeButton,
} from 'vxe-pc-ui'
import {
  VxeGrid,
} from 'vxe-table'

 VxeUI.setI18n('zh-CN', zhCN)
 VxeUI.setLanguage('zh-CN')

export function setupVxeTable(app: ReturnType<typeof createApp>) {
  const components = [VxeModal, VxeDrawer, VxeButton, VxeGrid, VxePager]
  components.forEach(component => {
    app.use(component)
  })
}
