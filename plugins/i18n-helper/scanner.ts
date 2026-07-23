/**
 * 文件扫描模块
 * 负责扫描指定目录下的文件，并管理 MD5 记录
 */

import fs from 'fs'
import path from 'path'
import { getFileMD5, readJSON, writeJSON, ensureDir } from './utils.ts'
import type { I18nConfig } from './types.ts'

class Scanner {
  private scanDir: string[]
  private excludeDirs: string[]
  private localesDir: string
  private projectRoot: string
  private md5FilePath: string
  private md5Records: Record<string, string>
  private supportedExts: string[]

  constructor(config: I18nConfig) {
    this.scanDir = config.scanDir || ['/src']
    this.excludeDirs = config.excludeDirs || []
    this.localesDir = config.localesDir
    this.projectRoot = config.projectRoot
    this.md5FilePath = path.join(this.localesDir, 'file-md5.json')
    this.md5Records = {}
    this.supportedExts = ['.vue', '.ts', '.js', '.tsx', '.jsx']
  }

  /**
   * 初始化 MD5 记录文件
   */
  initMD5File(): void {
    ensureDir(this.localesDir)
    if (fs.existsSync(this.md5FilePath)) {
      this.md5Records = readJSON<Record<string, string>>(this.md5FilePath) || {}
    } else {
      this.md5Records = {}
      writeJSON(this.md5FilePath, {})
    }
  }

  /**
   * 清空 MD5 记录（用于 --global 模式）
   */
  clearMD5Records(): void {
    this.md5Records = {}
    writeJSON(this.md5FilePath, {})
  }

  /**
   * 保存 MD5 记录
   */
  saveMD5Records(): void {
    writeJSON(this.md5FilePath, this.md5Records)
  }

  /**
   * 扫描所有目录，返回需要处理的文件列表
   * @param forceScan - 是否强制扫描所有文件（忽略 MD5）
   * @returns 需要处理的文件路径列表
   */
  scan(forceScan = false): string[] {
    const filesToProcess: string[] = []
    const allScannedFiles: Record<string, string> = {}

    for (const dir of this.scanDir) {
      const fullDir = path.resolve(this.projectRoot, dir.substring(1)) // 移除开头的 '/'
      if (!fs.existsSync(fullDir)) {
        continue
      }
      const files = this._walkDirectory(fullDir)
      for (const file of files) {
        const relativePath = path.relative(this.projectRoot, file).replace(/\\/g, '/')
        const fullPath = '/' + relativePath

        // 检查是否被排除
        if (this._isExcluded(fullPath)) {
          continue
        }

        // 检查文件扩展名
        const ext = path.extname(file)
        if (!this.supportedExts.includes(ext)) {
          continue
        }

        // 计算当前 MD5
        const currentMD5 = getFileMD5(file)
        if (currentMD5) {
          allScannedFiles[fullPath] = currentMD5

          // 检查是否需要处理
          if (forceScan || !this.md5Records[fullPath] || this.md5Records[fullPath] !== currentMD5) {
            filesToProcess.push(file)
          }
        }
      }
    }

    // 更新 MD5 记录（只保留当前扫描到的文件）
    this.md5Records = allScannedFiles

    return filesToProcess
  }

  /**
   * 获取所有源代码文件列表（用于统计中文出现次数）
   * @returns 所有源代码文件的绝对路径列表
   */
  getAllSourceFiles(): string[] {
    const allFiles: string[] = []

    for (const dir of this.scanDir) {
      const fullDir = path.resolve(this.projectRoot, dir.substring(1))
      if (!fs.existsSync(fullDir)) {
        continue
      }
      const files = this._walkDirectory(fullDir)
      for (const file of files) {
        const relativePath = path.relative(this.projectRoot, file).replace(/\\/g, '/')
        const fullPath = '/' + relativePath

        if (this._isExcluded(fullPath)) {
          continue
        }

        const ext = path.extname(file)
        if (!this.supportedExts.includes(ext)) {
          continue
        }

        allFiles.push(file)
      }
    }

    return allFiles
  }

  /**
   * 递归遍历目录
   * @private
   */
  _walkDirectory(dir: string): string[] {
    const files: string[] = []
    const items = fs.readdirSync(dir)

    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        files.push(...this._walkDirectory(fullPath))
      } else if (stat.isFile()) {
        files.push(fullPath)
      }
    }

    return files
  }

  /**
   * 检查文件是否被排除
   * @private
   */
  _isExcluded(filePath: string): boolean {
    for (const pattern of this.excludeDirs) {
      // 支持正则表达式
      if (pattern.startsWith('/') && pattern.endsWith('/')) {
        const regex = new RegExp(pattern.slice(1, -1))
        if (regex.test(filePath)) {
          return true
        }
      } else {
        // 支持路径匹配
        if (filePath.startsWith(pattern) || filePath.includes(pattern)) {
          return true
        }
      }
    }
    return false
  }

  /**
   * 更新单个文件的 MD5 记录
   */
  updateFileMD5(filePath: string): void {
    const relativePath = path.relative(this.projectRoot, filePath).replace(/\\/g, '/')
    const fullPath = '/' + relativePath
    const currentMD5 = getFileMD5(filePath)
    if (currentMD5) {
      this.md5Records[fullPath] = currentMD5
    }
  }
}

export default Scanner
