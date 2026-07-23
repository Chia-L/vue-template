/**
 * i18n:extract 命令实现
 * 提取中文词条并包裹
 */

import fs from 'fs'
import path from 'path'
import Scanner from './scanner.js'
import VueParser from './parser-vue.ts'
import JSParser from './parser-js.ts'
import CacheManager from './cache-manager.ts'
import LocaleManager from './locale-manager.ts'
import Logger from './logger.ts'
import { toRelativePath } from './utils.ts'
import type { I18nConfig, ExtractedEntry } from './types.ts'

class ExtractCommand {
  private config: I18nConfig
  private logger: Logger
  private scanner: Scanner
  private cacheManager: CacheManager
  private localeManager: LocaleManager

  constructor(config: I18nConfig) {
    this.config = config
    this.logger = new Logger()
    this.scanner = new Scanner(config)
    this.cacheManager = new CacheManager(config.cacheFile)
    this.localeManager = new LocaleManager(config.localesDir, config.localLang, config.targetLangs)
  }

  /**
   * 执行提取命令
   * @param forceScan - 是否强制扫描（--global 模式）
   */
  async execute(forceScan = false): Promise<void> {
    this.logger.step('开始执行 i18n:extract 命令')

    // 1. 初始化
    this.scanner.initMD5File()
    this.cacheManager.load()
    this.localeManager.init()

    if (forceScan) {
      this.logger.info('强制扫描模式，清空 MD5 记录')
      this.scanner.clearMD5Records()
    }

    // 2. 扫描文件
    this.logger.step('扫描文件...')
    const filesToProcess = this.scanner.scan(forceScan)
    this.logger.info(`发现 ${filesToProcess.length} 个需要处理的文件`)

    if (filesToProcess.length === 0) {
      this.logger.success('没有需要处理的文件')
      return
    }

    // 3. 提取并包裹词条
    this.logger.step('提取并包裹词条...')
    let totalExtracted = 0

    for (const file of filesToProcess) {
      try {
        const { extracted } = this._processFile(file)
        totalExtracted += extracted
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.logger.error(`处理文件失败: ${file}`, errorMessage)
      }
    }

    // 4. 保存结果
    this.logger.step('保存结果...')
    this.cacheManager.save()
    this.scanner.saveMD5Records()

    this.logger.success(`提取完成！共提取 ${totalExtracted} 个词条`)
  }

  /**
   * 处理单个文件
   * @private
   */
  _processFile(filePath: string): { extracted: number; entries: ExtractedEntry[] } {
    const content = fs.readFileSync(filePath, 'utf-8')
    const ext = path.extname(filePath)
    const relativePath = toRelativePath(filePath, this.config.projectRoot)

    let result
    if (ext === '.vue') {
      const parser = new VueParser(this.config, this.cacheManager, this.localeManager)
      result = parser.parse(content, relativePath)
    } else {
      const parser = new JSParser(this.config, this.cacheManager, this.localeManager)
      result = parser.parse(content, relativePath)
    }

    // 写入修改后的文件
    if (result.content !== content) {
      fs.writeFileSync(filePath, result.content, 'utf-8')
    }

    // 更新文件 MD5
    this.scanner.updateFileMD5(filePath)

    return {
      extracted: result.entries.length,
      entries: result.entries
    }
  }
}

export default ExtractCommand
