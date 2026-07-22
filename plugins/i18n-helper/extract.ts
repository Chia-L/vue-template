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
import type { I18nConfig, ExtractedEntry, ExistingEntryInfo, LocaleData } from './types.ts'

class ExtractCommand {
  private config: I18nConfig
  private logger: Logger
  private scanner: Scanner
  private cacheManager: CacheManager
  private localeManager: LocaleManager
  private publicKey: string
  private chineseCount: Record<string, number>

  constructor(config: I18nConfig) {
    this.config = config
    this.logger = new Logger()
    this.scanner = new Scanner(config)
    this.cacheManager = new CacheManager(config.cacheFile)
    this.localeManager = new LocaleManager(config.localesDir, config.localLang, config.targetLangs)
    this.publicKey = config.publicKey || 'common'
    this.chineseCount = {}
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

    // 3. 第一遍扫描：统计全项目中文出现次数（包括已有语言包）
    this.logger.step('统计全项目中文词条出现次数...')
    this._countChineseOccurrences(filesToProcess)

    // 4. 第二遍扫描：提取并包裹词条
    this.logger.step('提取并包裹词条...')
    let totalExtracted = 0
    const newEntries: ExtractedEntry[] = []

    for (const file of filesToProcess) {
      try {
        const { extracted, entries } = this._processFile(file)
        totalExtracted += extracted
        newEntries.push(...entries)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.logger.error(`处理文件失败: ${file}`, errorMessage)
      }
    }

    // 5. 处理新词条：判断公共词条并更新语言包
    this.logger.step('处理词条分组...')
    this._processNewEntries(newEntries)

    // 6. 保存结果
    this.logger.step('保存结果...')
    this.cacheManager.save()
    this.localeManager.save()
    this.scanner.saveMD5Records()

    this.logger.success(`提取完成！共提取 ${totalExtracted} 个词条`)
  }

  /**
   * 统计中文出现次数（全项目，包括已有语言包）
   * @private
   */
  _countChineseOccurrences(files: string[]): void {
    const chineseRegex = /[\u4e00-\u9fa5]+/g

    // 1. 统计源代码中的中文
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const matches = content.match(chineseRegex)

      if (matches) {
        for (const chinese of matches) {
          this.chineseCount[chinese] = (this.chineseCount[chinese] || 0) + 1
        }
      }
    }

    // 2. 统计已有语言包中的中文
    const localLangData = this.localeManager.getLocale(this.config.localLang)
    for (const [group, entries] of Object.entries(localLangData)) {
      for (const value of Object.values(entries)) {
        if (typeof value === 'string') {
          const matches = value.match(chineseRegex)
          if (matches) {
            for (const chinese of matches) {
              this.chineseCount[chinese] = (this.chineseCount[chinese] || 0) + 1
            }
          }
        }
      }
    }
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
      const parser = new VueParser(this.config)
      result = parser.parse(content, relativePath)
    } else {
      const parser = new JSParser(this.config)
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

  /**
   * 处理新提取的词条
   * @private
   */
  _processNewEntries(entries: ExtractedEntry[]): void {
    const localLang = this.config.localLang
    const localLangData = this.localeManager.getLocale(localLang)
    
    // 记录每个文件中的 key 映射关系，用于后续更新翻译函数
    const fileKeyMap = new Map<string, Map<string, string>>() // source -> Map<oldKey, newFullKey>

    for (const entry of entries) {
      const { key, value, source } = entry
      
      // 检查该中文值是否已在语言包中存在
      const existingInfo = this._findExistingEntry(value, localLangData)
      
      // 判断是否为公共词条（全项目出现次数 >= 2）
      const isPublic = this.chineseCount[value] >= 2

      let groupKey: string
      let entryKey: string = key

      if (isPublic) {
        // 情况1：新词条是公共词条
        groupKey = this.publicKey
        if (existingInfo) {
          // 如果已在语言包中，检查是否在 publicKey 下
          if (existingInfo.group !== this.publicKey) {
            // 从组件名下移到 publicKey 下
            this._moveEntryToPublic(existingInfo.group, existingInfo.key, value)
            entryKey = existingInfo.key
          }
        } else {
          // 新词条，添加到缓存和 publicKey 下
          this.cacheManager.addEntry(this.publicKey, key, value, localLang, source)
          this.localeManager.addEntry(localLang, this.publicKey, key, value)
        }
      } else {
        // 情况2：新词条是非公共词条
        const componentName = this._getComponentName(source)
        groupKey = componentName
        
        if (existingInfo) {
          // 如果已在语言包中
          if (existingInfo.group === this.publicKey) {
            // 已在 publicKey 下，不做处理（保持为公共词条）
            groupKey = this.publicKey
            entryKey = existingInfo.key
          } else if (existingInfo.group === componentName) {
            // 在同一组件下，不做处理
            entryKey = existingInfo.key
          } else {
            // 在其他组件下，需要移动到新组件下
            this._moveEntryToComponent(existingInfo.group, existingInfo.key, componentName, value)
            entryKey = existingInfo.key
          }
        } else {
          // 新词条，添加到缓存和组件名下
          this.cacheManager.addEntry(componentName, key, value, localLang, source)
          this.localeManager.addEntry(localLang, componentName, key, value)
        }
      }
      
      // 记录 key 映射关系，用于更新翻译函数
      const fullKey = `${groupKey}.${entryKey}`
      if (!fileKeyMap.has(source)) {
        fileKeyMap.set(source, new Map())
      }
      fileKeyMap.get(source)!.set(key, fullKey)
    }
    
    // 更新文件中的翻译函数 key
    this._updateTranslationKeys(fileKeyMap)
  }
  
  /**
   * 更新文件中的翻译函数 key，使其包含完整路径
   * @private
   */
  _updateTranslationKeys(fileKeyMap: Map<string, Map<string, string>>): void {
    for (const [filePath, keyMap] of fileKeyMap.entries()) {
      if (!fs.existsSync(filePath)) continue
      
      let content = fs.readFileSync(filePath, 'utf-8')
      
      for (const [oldKey, newFullKey] of keyMap.entries()) {
        // 替换 t('key') 或 t('key', {...}) 为 t('group.key') 或 t('group.key', {...})
        content = content.replace(new RegExp(`t\\(['"]${oldKey}['"](\\s*,\\s*\\{[^}]*\\})?\\)`, 'g'), `t('${newFullKey}'$1)`)
        // 替换 $t('key') 或 $t('key', {...}) 为 $t('group.key') 或 $t('group.key', {...})
        content = content.replace(new RegExp(`\\$t\\(['"]${oldKey}['"](\\s*,\\s*\\{[^}]*\\})?\\)`, 'g'), `$t('${newFullKey}'$1)`)
      }
      
      fs.writeFileSync(filePath, content, 'utf-8')
    }
  }

  /**
   * 在语言包中查找已存在的词条
   * @private
   */
  _findExistingEntry(value: string, langData: LocaleData): ExistingEntryInfo | null {
    for (const [group, entries] of Object.entries(langData)) {
      for (const [key, entryValue] of Object.entries(entries)) {
        if (entryValue === value) {
          return { group, key }
        }
      }
    }
    return null
  }

  /**
   * 将词条移动到 publicKey 下
   * @private
   */
  _moveEntryToPublic(oldGroup: string, oldKey: string, value: string): void {
    const localLang = this.config.localLang
    
    // 从旧位置删除
    const langData = this.localeManager.getLocale(localLang)
    if (langData[oldGroup] && langData[oldGroup][oldKey]) {
      delete langData[oldGroup][oldKey]
      // 如果组件组为空，删除该组
      if (Object.keys(langData[oldGroup]).length === 0) {
        delete langData[oldGroup]
      }
    }
    
    // 添加到 publicKey 下
    this.localeManager.addEntry(localLang, this.publicKey, oldKey, value)
  }

  /**
   * 将词条移动到新组件下
   * @private
   */
  _moveEntryToComponent(oldGroup: string, oldKey: string, newGroup: string, value: string): void {
    const localLang = this.config.localLang
    
    // 从旧位置删除
    const langData = this.localeManager.getLocale(localLang)
    if (langData[oldGroup] && langData[oldGroup][oldKey]) {
      delete langData[oldGroup][oldKey]
      // 如果组件组为空，删除该组
      if (Object.keys(langData[oldGroup]).length === 0) {
        delete langData[oldGroup]
      }
    }
    
    // 添加到新组件下
    this.localeManager.addEntry(localLang, newGroup, oldKey, value)
  }

  /**
   * 从文件路径获取组件名
   * @private
   */
  _getComponentName(filePath: string): string {
    const fileName = filePath.split('/').pop()
    return fileName ? fileName.replace(/\.\w+$/, '') : ''
  }
}

export default ExtractCommand
