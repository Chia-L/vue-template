/**
 * i18n:check 命令实现
 * 检查缓存中是否有未合并的词条
 */

import CacheManager from './cache-manager.ts'
import Logger from './logger.ts'
import type { I18nConfig } from './types.ts'

interface UnmergedEntry {
  value: string
  source: string
  missingLangs: string[]
}

class CheckCommand {
  private config: I18nConfig
  private logger: Logger
  private cacheManager: CacheManager

  constructor(config: I18nConfig) {
    this.config = config
    this.logger = new Logger()
    this.cacheManager = new CacheManager(config.cacheFile)
  }

  /**
   * 执行检查命令
   */
  async execute(): Promise<void> {
    this.logger.step('开始执行 i18n:check 命令')

    // 1. 加载缓存
    const cache = this.cacheManager.load()
    
    // 统计词条数量
    let totalEntries = 0
    for (const entries of Object.values(cache)) {
      totalEntries += Object.keys(entries).length
    }

    if (totalEntries === 0) {
      this.logger.success('缓存中没有未合并的词条')
      return
    }

    this.logger.warn(`缓存中有 ${totalEntries} 个未合并的词条`)

    // 2. 分析未合并的词条
    const unmerged: Record<string, UnmergedEntry> = {}
    for (const [group, entries] of Object.entries(cache)) {
      for (const [key, entry] of Object.entries(entries)) {
        const missingLangs: string[] = []

        // 检查目标语言
        for (const targetLang of this.config.targetLangs) {
          if (!entry[targetLang] || entry[targetLang] === '') {
            missingLangs.push(targetLang)
          }
        }

        if (missingLangs.length > 0) {
          const fullKey = `${group}.${key}`
          unmerged[fullKey] = {
            value: entry.value,
            source: entry.source || '',
            missingLangs
          }
        }
      }
    }

    // 3. 输出报告
    if (Object.keys(unmerged).length > 0) {
      this.logger.warn('未完全翻译的词条：')
      console.log('\n')

      for (const [key, info] of Object.entries(unmerged)) {
        console.log(`  Key: ${key}`)
        console.log(`  值: ${info.value}`)
        console.log(`  来源: ${info.source}`)
        console.log(`  缺少翻译: ${info.missingLangs.join(', ')}`)
        console.log('')
      }

      this.logger.warn(`共 ${Object.keys(unmerged).length} 个词条需要翻译`)
    } else {
      this.logger.success('所有词条都已完全翻译')
    }
  }
}

export default CheckCommand
