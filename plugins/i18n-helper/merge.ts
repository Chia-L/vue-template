/**
 * i18n:merge 命令实现
 * 将缓存中的语言包合并到目标语言包
 */

import CacheManager from './cache-manager.ts'
import LocaleManager from './locale-manager.ts'
import Logger from './logger.ts'
import type { I18nConfig, CacheEntry } from './types.ts'

class MergeCommand {
  private config: I18nConfig
  private logger: Logger
  private cacheManager: CacheManager
  private localeManager: LocaleManager

  constructor(config: I18nConfig) {
    this.config = config
    this.logger = new Logger()
    this.cacheManager = new CacheManager(config.cacheFile)
    this.localeManager = new LocaleManager(config.localesDir, config.localLang, config.targetLangs)
  }

  /**
   * 执行合并命令
   */
  async execute(): Promise<void> {
    this.logger.step('开始执行 i18n:merge 命令')

    // 1. 加载数据
    const cache = this.cacheManager.load()
    this.localeManager.load()

    // 统计词条数量
    let totalEntries = 0
    for (const entries of Object.values(cache)) {
      totalEntries += Object.keys(entries).length
    }

    if (totalEntries === 0) {
      this.logger.info('缓存中没有词条需要合并')
      return
    }

    this.logger.info(`缓存中有 ${totalEntries} 个词条`)

    // 2. 合并词条
    let mergedCount = 0
    const keysToRemove: Array<{ group: string; key: string }> = []

    for (const [group, entries] of Object.entries(cache)) {
      for (const [key, entry] of Object.entries(entries)) {
        // 合并到源语言包（localLang）
        if (entry[this.config.localLang]) {
          this.localeManager.addEntry(
            this.config.localLang,
            group,
            key,
            entry[this.config.localLang] as string
          )
        }

        // 合并到目标语言包
        for (const targetLang of this.config.targetLangs) {
          const translation = (entry[targetLang] as string) || ''
          this.localeManager.addEntry(targetLang, group, key, translation)
        }

        keysToRemove.push({ group, key })
        mergedCount++
      }
    }

    // 3. 从缓存中删除已合并的词条
    for (const { group, key } of keysToRemove) {
      this.cacheManager.removeEntry(group, key)
    }

    // 4. 保存结果
    this.cacheManager.save()
    this.localeManager.save()

    this.logger.success(`合并完成！共合并 ${mergedCount} 个词条`)

    // 5. 输出未合并的词条
    const remaining = this.cacheManager.getAll()
    let remainingCount = 0
    for (const entries of Object.values(remaining)) {
      remainingCount += Object.keys(entries).length
    }
    if (remainingCount > 0) {
      this.logger.warn(`缓存中还有 ${remainingCount} 个词条未完全翻译`)
    }
  }
}

export default MergeCommand
