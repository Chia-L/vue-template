import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { viteMockServe } from 'vite-plugin-mock'
import path from 'path'
import fs from 'fs'

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  const isProxyMode = mode === 'proxy'

  // 加载代理配置（ESM 模式使用动态 import）
  let proxyConfig: Record<string, object> = {}
  if (isProxyMode) {
    const proxyLocalPath = path.resolve(__dirname, 'proxy.local.js')
    if (fs.existsSync(proxyLocalPath)) {
      const mod = await import(proxyLocalPath)
      proxyConfig = mod.default || mod
    }
  }

  return {
    base: mode === 'development' ? './' : '/',
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
        imports: ['vue', 'vue-router', 'pinia'],
        dts: 'src/auto-imports.d.ts',
        eslintrc: {
          enabled: true,
          filepath: './.eslintrc-auto-imports.json', // 自动导入的 ESLint 规则文件路径
        }
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: 'src/components.d.ts',
      }),
      viteMockServe({
        mockPath: 'mock',
        enable: env.MODE === 'development',
        watchFiles: true,
        logger: true,
        cors: true, 
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      proxy: isProxyMode ? proxyConfig : undefined,
    },
  }
})
