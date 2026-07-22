/**
 * 缓存文件管理模块
 * 管理 extracted.json 缓存文件
 */

import fs from 'fs'
import path from 'path'
import { ensureDir, readJSON, writeJSON } from './utils.ts'
import type { CacheData, CacheEntry } from './types.ts'

class CacheManager {
  private cacheFilePath: string
  private cache: CacheData

  constructor(cacheFilePath: string) {
    this.cacheFilePath = cacheFilePath
    this.cache = {}
  }

  /**
   * 加载缓存文件
   */
  load(): CacheData {
    if (fs.existsSync(this.cacheFilePath)) {
      this.cache = readJSON<CacheData>(this.cacheFilePath) || {}
    } else {
      ensureDir(path.dirname(this.cacheFilePath))
      this.cache = {}
      this.save()
    }
    return this.cache
  }

  /**
   * 保存缓存文件
   */
  save(): void {
    writeJSON(this.cacheFilePath, this.cache)
  }

  /**
   * 添加词条到缓存
   */
  addEntry(
    group: string,
    key: string,
    value: string,
    localLang: string,
    source: string,
    translations: Record<string, string> = {}
  ): void {
    if (!this.cache[group]) {
      this.cache[group] = {}
    }
    if (!this.cache[group][key]) {
      this.cache[group][key] = {
        value,
        [localLang]: value,
        source,
        ...translations
      }
    }
  }

  /**
   * 更新词条
   */
  updateEntry(group: string, key: string, updates: Partial<CacheEntry>): void {
    if (this.cache[group] && this.cache[group][key]) {
      Object.assign(this.cache[group][key], updates)
    }
  }

  /**
   * 删除词条
   */
  removeEntry(group: string, key: string): void {
    if (this.cache[group]) {
      delete this.cache[group][key]
      // 如果分组为空，删除分组
      if (Object.keys(this.cache[group]).length === 0) {
        delete this.cache[group]
      }
    }
  }

  /**
   * 获取所有词条
   */
  getAll(): CacheData {
    return this.cache
  }

  /**
   * 检查词条是否存在
   */
  has(group: string, key: string): boolean {
    return !!this.cache[group]?.[key]
  }

  /**
   * 获取词条
   */
  get(group: string, key: string): CacheEntry | undefined {
    return this.cache[group]?.[key]
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache = {}
    this.save()
  }

  /**
   * 获取未合并的词条
   */
  getUnmerged(targetLangs: string[]): CacheData {
    const unmerged: CacheData = {}
    for (const [group, entries] of Object.entries(this.cache)) {
      for (const [key, entry] of Object.entries(entries)) {
        const hasAllLangs = targetLangs.every(
          lang => entry[lang] !== undefined && entry[lang] !== ''
        )
        if (!hasAllLangs) {
          if (!unmerged[group]) {
            unmerged[group] = {}
          }
          unmerged[group][key] = entry
        }
      }
    }
    return unmerged
  }
}

export default CacheManager
