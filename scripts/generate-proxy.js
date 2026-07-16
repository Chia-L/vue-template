import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 解析命令行参数
const args = process.argv.slice(2)
let ip = ''

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--ip' && args[i + 1]) {
    ip = args[i + 1]
    i++
  }
}

if (!ip) {
  console.error('错误: 必须提供 --ip 参数')
  console.log('用法: pnpm ui --ip <ip>')
  console.log('示例: pnpm ui --ip 172.12.xx.xx')
  process.exit(1)
}

// 读取模板文件
const templatePath = path.resolve(__dirname, '../proxy-template.js')
const outputPath = path.resolve(__dirname, '../proxy.local.js')

if (!fs.existsSync(templatePath)) {
  console.error('错误: 找不到模板文件 proxy-template.js')
  process.exit(1)
}

let content = fs.readFileSync(templatePath, 'utf-8')

// 替换 IP 和协议
content = content.replace(/\$ip/g, ip)

// 写入本地文件
fs.writeFileSync(outputPath, content, 'utf-8')

console.log(`✓ 已生成代理配置文件: proxy.local.js`)
console.log(`  目标ip: ${ip}`)
