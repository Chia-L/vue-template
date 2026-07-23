#!/usr/bin/env node

/**
 * i18n-helper CLI 入口
 * 支持命令：extract, merge, check, diff, test
 */

import fs from 'fs'
import path from 'path'
import ExtractCommand from './extract.ts'
import MergeCommand from './merge.ts'
import CheckCommand from './check.ts'
import DiffCommand from './diff.ts'
import Logger from './logger.ts'
import type { I18nConfig } from './types.ts'

const logger = new Logger()

// 默认配置
const DEFAULT_CONFIG: Omit<I18nConfig, 'projectRoot'> = {
  scanDir: ['/src'],
  excludeDirs: [],
  localLang: 'zh-CN',
  targetLangs: ['en-US'],
  localesDir: 'src/locales',
  i18nExportFile: 'src/locales/index.ts',
  cacheFile: '.locales-temp/extracted.json',
  publicKey: 'common',
  aiConfig: null
}

interface CLIOptions {
  global?: boolean
  scanDir?: string
  excludeDirs?: string
  localLang?: string
  targetLangs?: string
  localesDir?: string
  i18nExportFile?: string
  cacheFile?: string
  publicKey?: string
  user?: string
  pwd?: string
}

/**
 * 从 vite.config.ts 中提取插件配置
 */
function extractConfigFromVite(): Partial<I18nConfig> {
  const viteConfigPath = path.resolve(process.cwd(), 'vite.config.ts')
  if (!fs.existsSync(viteConfigPath)) {
    logger.warn('未找到 vite.config.ts，使用默认配置')
    return {}
  }

  const content = fs.readFileSync(viteConfigPath, 'utf-8')

  // 匹配 i18nHelperPlugin({ ... })
  const regex = /i18nHelperPlugin\(\s*(\{[\s\S]*?\})\s*\)/
  const match = content.match(regex)

  if (!match) {
    logger.warn('未在 vite.config.ts 中找到 i18n 插件配置，使用默认配置')
    return {}
  }

  try {
    // 使用 Function 构造器安全地解析对象字面量
    const configStr = match[1]
    // 将单引号替换为双引号
    const normalizedStr = configStr
      .replace(/'/g, '"')
      .replace(/(\w+):/g, '"$1":')
    
    // 使用 Function 构造器解析（比 eval 更安全）
    const config = new Function(`return ${normalizedStr}`)() as Partial<I18nConfig>
    logger.info('成功从 vite.config.ts 提取配置')
    return config
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.warn('解析 vite.config.ts 中的配置失败，使用默认配置', errorMessage)
    return {}
  }
}

/**
 * 解析命令行参数
 */
function parseArgs(): { command: string; options: CLIOptions } {
  const args = process.argv.slice(2)
  const command = args[0]
  const options: CLIOptions = {}

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--global') {
      options.global = true
    } else if (arg.startsWith('--')) {
      const key = arg.substring(2) as keyof CLIOptions
      const value = args[i + 1]
      if (value && !value.startsWith('--')) {
        options[key] = value as string
        i++
      } else {
        options[key] = true as never
      }
    }
  }

  return { command, options }
}

/**
 * 解析路径中的 @ 别名
 */
function resolveAliasPath(aliasPath: string, projectRoot: string): string {
  if (aliasPath.startsWith('@/')) {
    // 将 @/ 替换为 src/
    return path.resolve(projectRoot, 'src', aliasPath.substring(2))
  }
  return path.resolve(projectRoot, aliasPath)
}

/**
 * 合并配置（优先级：命令行 > vite.config.ts > 默认）
 */
function mergeConfig(viteConfig: Partial<I18nConfig>, cliOptions: CLIOptions): I18nConfig {
  const config: I18nConfig = { ...DEFAULT_CONFIG, ...viteConfig } as I18nConfig

  // 应用命令行参数
  if (cliOptions.scanDir) config.scanDir = cliOptions.scanDir.split(',')
  if (cliOptions.excludeDirs) config.excludeDirs = cliOptions.excludeDirs.split(',')
  if (cliOptions.localLang) config.localLang = cliOptions.localLang
  if (cliOptions.targetLangs) config.targetLangs = cliOptions.targetLangs.split(',')
  if (cliOptions.localesDir) config.localesDir = cliOptions.localesDir
  if (cliOptions.i18nExportFile) config.i18nExportFile = cliOptions.i18nExportFile
  if (cliOptions.cacheFile) config.cacheFile = cliOptions.cacheFile
  if (cliOptions.publicKey) config.publicKey = cliOptions.publicKey

  // 设置项目根目录
  config.projectRoot = process.cwd()

  // 解析路径中的 @ 别名并转为绝对路径
  config.localesDir = resolveAliasPath(config.localesDir, config.projectRoot)
  config.cacheFile = path.resolve(config.projectRoot, config.cacheFile)

  return config
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const { command, options } = parseArgs()

  if (!command) {
    logger.error('请指定命令：extract, merge, check, diff, test')
    process.exit(1)
  }

  // 读取 vite.config.ts 中的配置
  const viteConfig = extractConfigFromVite()

  // 合并配置
  const config = mergeConfig(viteConfig, options)

  logger.info(`执行命令: ${command}`)
  logger.info(`项目根目录: ${config.projectRoot}`)
  logger.info(`语言包目录: ${config.localesDir}`)
  logger.info(`缓存文件: ${config.cacheFile}`)

  try {
    switch (command) {
      case 'extract': {
        const extractCmd = new ExtractCommand(config)
        await extractCmd.execute(options.global)
        break
      }

      case 'merge': {
        const mergeCmd = new MergeCommand(config)
        await mergeCmd.execute()
        break
      }

      case 'check': {
        const checkCmd = new CheckCommand(config)
        await checkCmd.execute()
        break
      }

      case 'diff': {
        const diffCmd = new DiffCommand(config)
        await diffCmd.execute()
        break
      }

      case 'test': {
        // 测试命令需要特殊处理参数
        const user = options.user || process.env.I18N_TEST_USER
        const pwd = options.pwd || process.env.I18N_TEST_PWD
        if (!user || !pwd) {
          logger.error('i18n:test 需要 --user 和 --pwd 参数，或设置环境变量 I18N_TEST_USER 和 I18N_TEST_PWD')
          process.exit(1)
        }
        const TestCommand = (await import('./test.js')).default
        const testCmd = new TestCommand(config, { user, pwd })
        await testCmd.execute()
        break
      }

      default:
        logger.error(`未知命令: ${command}`)
        logger.info('支持的命令：extract, merge, check, diff, test')
        process.exit(1)
    }

    logger.success('命令执行完成')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    logger.error('命令执行失败', errorMessage)
    if (errorStack) {
      console.error(errorStack)
    }
    process.exit(1)
  }
}

main()
