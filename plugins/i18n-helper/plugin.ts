/**
 * Vite 插件入口
 * 主要作为配置载体，实际逻辑由 CLI 脚本执行
 */

interface PluginOptions {
  scanDir?: string[]
  excludeDirs?: string[]
  localLang?: string
  targetLangs?: string[]
  localesDir?: string
  i18nExportFile?: string
  cacheFile?: string
  publicKey?: string
  aiConfig?: {
    endpoint?: string
    model?: string
    apikey?: string
  } | null
}


export default function i18nHelperPlugin(_options: PluginOptions = {}) { 
  return {
    name: 'vite-plugin-i18n-helper',
    // 插件主要作用是作为配置载体，供 vite.config.ts 配置
    // 实际的提取、合并等逻辑由 CLI 脚本 (run.ts) 执行
  }
}
