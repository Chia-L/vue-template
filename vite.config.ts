import { defineConfig, loadEnv, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { viteMockServe } from 'vite-plugin-mock'
import i18nHelperPlugin from './plugins/i18n-helper/plugin.js'
import path from 'path'
import fs from 'fs'

export default defineConfig(async ({ mode }): Promise<UserConfig> => {
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
        enable: mode === 'development',
        watchFiles: true,
        logger: true,
        cors: true,
      }),
      mode === 'development' ? i18nHelperPlugin({
        scanDir: ['/src'],
        excludeDirs: ['src/assets/i18n'],
        localLang: 'zh-cn',
        targetLangs: ['en'],
        localesDir: '@/assets/i18n/locales',
        i18nExportFile: '@/assets/i18n/locales/index.ts',
        cacheFile: '.locales-temp/extracted.json',
        publicKey: 'CommonCon',
      }) : null,
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    css: {
      // 配置 SCSS 预处理器选项
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/assets/styles/variables" as *;`
        }
      }
    },
    preview: {
      port: 4173,
      cors: true
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      open: true,
      proxy: isProxyMode ? proxyConfig : {},
    },
    build: {
      target: 'es2015',
      cssCodeSplit: true, // 启用 CSS 代码分割
      sourcemap: false, // 生产环境禁用 source map
      minify: 'terser', // 使用 terser 进行代码压缩
      terserOptions: {
        compress: {
          drop_debugger: true, // 移除 debugger 语句
          pure_funcs: ['console.log'] // 移除 console.log 语句
        },
        format: {
          comments: false // 移除注释
        }
      },
      chunkSizeWarningLimit: 500, // 配置代码分割警告阈值
      rollupOptions: {
        output: {
          chunkFileNames: 'static/js/[name]-[hash].js',
          entryFileNames: 'static/js/[name]-[hash].js',
          assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
          manualChunks(id: string) {
            // 将 node_modules 中的依赖打包到 vendor.js 中
            if (id.includes('node_modules')) {
              return 'vendor'
            }
          }
        }
      },
    },
    define: {
      'process.env': env // 定义环境变量
    }
  }
})
