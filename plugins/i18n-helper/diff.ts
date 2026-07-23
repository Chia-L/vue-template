/**
 * i18n:diff 命令实现
 * 对比源语言包和目标语言包，找出未对齐的 key
 */

import CacheManager from './cache-manager.ts'
import LocaleManager from './locale-manager.ts'
import Logger from './logger.ts'
import type { I18nConfig, DiffReport } from './types.ts'

class DiffCommand {
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
   * 执行差异对比命令
   */
  async execute(): Promise<void> {
    this.logger.step('开始执行 i18n:diff 命令')

    // 1. 加载语言包
    this.localeManager.load()
    this.cacheManager.load()

    // 2. 获取未对齐的 key
    const unaligned = this.localeManager.getUnalignedKeys()

    let totalUnaligned = 0
    const diffReport: DiffReport = {}

    for (const [targetLang, groups] of Object.entries(unaligned)) {
      diffReport[targetLang] = {}

      for (const [group, entries] of Object.entries(groups)) {
        diffReport[targetLang][group] = {}

        for (const [key, value] of Object.entries(entries)) {
          // 获取源文件路径
          const cacheEntry = this.cacheManager.get(group, key)
          const source = cacheEntry?.source || ''

          diffReport[targetLang][group][key] = {
            value,
            [this.config.localLang]: value,
            source
          }

          totalUnaligned++
        }
      }
    }

    // 3. 输出报告
    if (totalUnaligned === 0) {
      this.logger.success('所有语言包已完全对齐')
      return
    }

    this.logger.warn(`发现 ${totalUnaligned} 个未对齐的词条`)

    // 4. 追加到缓存文件
    for (const [targetLang, groups] of Object.entries(diffReport)) {
      for (const [group, entries] of Object.entries(groups)) {
        for (const [key, info] of Object.entries(entries)) {
          // 如果缓存中已有该 key，更新；否则添加
          if (!this.cacheManager.has(group, key)) {
            this.cacheManager.addEntry(
              group,
              key,
              info.value,
              this.config.localLang,
              info.source
            )
          }
        }
      }
    }

    this.cacheManager.save()

    // 5. 输出详细信息
    console.log('\n未对齐的词条：')
    for (const [targetLang, groups] of Object.entries(diffReport)) {
      console.log(`\n目标语言: ${targetLang}`)
      for (const [group, entries] of Object.entries(groups)) {
        console.log(`  分组: ${group}`)
        for (const [key, info] of Object.entries(entries)) {
          console.log(`    - ${key}: ${info.value}`)
        }
      }
    }

    this.logger.info(`差异报告已追加到缓存文件: ${this.config.cacheFile}`)
  }
}

export default DiffCommand
