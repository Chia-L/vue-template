import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const proxyLocalPath = path.resolve(__dirname, '../proxy.local.js')

if (!fs.existsSync(proxyLocalPath)) {
  console.error('错误: 找不到 proxy.local.js 文件')
  console.log('请先运行: pnpm ui --ip <ip> [--protocol <protocol>]')
  console.log('示例: pnpm ui --ip 172.12.xx.xx --protocol https')
  process.exit(1)
}

console.log('✓ proxy.local.js 文件存在')
