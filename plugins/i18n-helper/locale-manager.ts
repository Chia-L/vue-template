/**
 * 语言包管理模块
 * 管理 localesDir 下的语言包文件
 */

import fs from 'fs'
import path from 'path'
import { ensureDir, readJSON, writeJSON } from './utils.ts'
import type { LocaleData, UnalignedData } from './types.ts'

class LocaleManager {
  private localesDir: string
  private localLang: string
  private targetLangs: string[]
  private locales: Record<string, LocaleData>

  constructor(localesDir: string, localLang: string, targetLangs: string[]) {
    this.localesDir = localesDir
    this.localLang = localLang
    this.targetLangs = targetLangs
    this.locales = {}
  }

  /**
   * 初始化语言包目录和文件
   */
  init(): void {
    ensureDir(this.localesDir)

    const allLangs = [this.localLang, ...this.targetLangs]
    for (const lang of allLangs) {
      const filePath = path.join(this.localesDir, `${lang}.json`)
      if (fs.existsSync(filePath)) {
        this.locales[lang] = readJSON<LocaleData>(filePath) || {}
      } else {
        this.locales[lang] = {}
        writeJSON(filePath, {})
      }
    }
  }

  /**
   * 加载语言包
   */
  load(): void {
    const allLangs = [this.localLang, ...this.targetLangs]
    for (const lang of allLangs) {
      const filePath = path.join(this.localesDir, `${lang}.json`)
      this.locales[lang] = readJSON<LocaleData>(filePath) || {}
    }
  }

  /**
   * 保存所有语言包
   */
  save(): void {
    for (const [lang, data] of Object.entries(this.locales)) {
      const filePath = path.join(this.localesDir, `${lang}.json`)
      writeJSON(filePath, data)
    }
  }

  /**
   * 添加词条到语言包
   */
  addEntry(lang: string, groupKey: string, entryKey: string, value: string): void {
    if (!this.locales[lang]) {
      this.locales[lang] = {}
    }
    if (!this.locales[lang][groupKey]) {
      this.locales[lang][groupKey] = {}
    }
    this.locales[lang][groupKey][entryKey] = value
  }

  /**
   * 获取语言包数据
   */
  getLocale(lang: string): LocaleData {
    return this.locales[lang] || {}
  }

  /**
   * 获取指定词条
   */
  getEntry(lang: string, groupKey: string, entryKey: string): string | undefined {
    return this.locales[lang]?.[groupKey]?.[entryKey]
  }

  /**
   * 检查 key 是否存在
   */
  hasEntry(lang: string, groupKey: string, entryKey: string): boolean {
    return !!this.locales[lang]?.[groupKey]?.[entryKey]
  }

  /**
   * 获取所有语言的所有 key
   */
  getAllKeys(): Record<string, Record<string, string[]>> {
    const keys: Record<string, Record<string, string[]>> = {}
    for (const [lang, data] of Object.entries(this.locales)) {
      keys[lang] = {}
      for (const [group, entries] of Object.entries(data)) {
        keys[lang][group] = Object.keys(entries)
      }
    }
    return keys
  }

  /**
   * 获取未对齐的 key
   */
  getUnalignedKeys(): UnalignedData {
    const sourceKeys = this.locales[this.localLang] || {}
    const unaligned: UnalignedData = {}

    for (const targetLang of this.targetLangs) {
      const targetData = this.locales[targetLang] || {}
      unaligned[targetLang] = {}

      for (const [group, entries] of Object.entries(sourceKeys)) {
        for (const [key, value] of Object.entries(entries)) {
          if (!targetData[group] || targetData[group][key] === undefined || targetData[group][key] === '') {
            if (!unaligned[targetLang][group]) {
              unaligned[targetLang][group] = {}
            }
            unaligned[targetLang][group][key] = value
          }
        }
      }
    }

    return unaligned
  }
}

export default LocaleManager
