/**
 * 工具函数模块
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import type { TemplateVar } from './types.js'

/**
 * 计算文件 MD5
 */
export function getFileMD5(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null
  const content = fs.readFileSync(filePath)
  return crypto.createHash('md5').update(content).digest('hex')
}

/**
 * 生成 UUID
 */
export function generateUUID(): string {
  return 'xxxxxxxx'.replace(/[x]/g, (): string => {
    return Math.floor(Math.random() * 16).toString(16)
  })
}

/**
 * 检测字符串是否包含中文
 */
export function hasChinese(str: string): boolean {
  return /[\u4e00-\u9fa5]/.test(str)
}

/**
 * 提取字符串中的中文部分
 */
export function extractChinese(str: string): string {
  const matches = str.match(/[\u4e00-\u9fa5]+/g)
  return matches ? matches.join('') : ''
}

/**
 * 判断是否为注释区域
 * 返回注释范围数组 [[start, end], ...]
 */
export function getCommentRanges(content: string, fileType: string): [number, number][] {
  const ranges: [number, number][] = []

  if (fileType === '.vue') {
    // HTML 注释 <!-- -->
    const htmlCommentRegex = /<!--[\s\S]*?-->/g
    let match: RegExpExecArray | null
    while ((match = htmlCommentRegex.exec(content)) !== null) {
      ranges.push([match.index, match.index + match[0].length])
    }
  }

  // 单行注释 //（确保前面不是 : 或 http/https 等 URL 的一部分）
  const singleLineRegex = /(?<![:\w])\/\/.*$/gm
  let match: RegExpExecArray | null
  while ((match = singleLineRegex.exec(content)) !== null) {
    ranges.push([match.index, match.index + match[0].length])
  }

  // 多行注释 /* */
  const multiLineRegex = /\/\*[\s\S]*?\*\//g
  while ((match = multiLineRegex.exec(content)) !== null) {
    ranges.push([match.index, match.index + match[0].length])
  }

  return ranges
}

/**
 * 判断位置是否在注释区域内
 */
export function isInComment(pos: number, commentRanges: [number, number][]): boolean {
  return commentRanges.some(([start, end]) => pos >= start && pos < end)
}

/**
 * 确保目录存在
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * 读取 JSON 文件
 */
export function readJSON<T = Record<string, unknown>>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch (e) {
    return null
  }
}

/**
 * 写入 JSON 文件
 */
export function writeJSON(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * 解析模板字符串，提取中文和变量
 * 例如: `你好${name}世界` => { text: "你好{name}世界", vars: [{expression: "name"}] }
 * 词条 key 格式：{"Home": {"uuid": "你好{name}世界"}}
 * 包裹格式：const a = t('Home.uuid', { name })
 */
export function parseTemplateString(str: string): { text: string; vars: TemplateVar[] } {
  const vars: TemplateVar[] = []
  const varRegex = /\$\{([^}]+)\}/g
  let match: RegExpExecArray | null
  while ((match = varRegex.exec(str)) !== null) {
    vars.push({
      placeholder: match[0],
      expression: match[1].trim(),
      index: match.index
    })
  }

  // 将 ${var} 替换为 {var} 格式，保留变量占位符
  const text = str.replace(/\$\{([^}]+)\}/g, '{$1}')

  return { text, vars }
}

/**
 * 将相对路径转为项目相对路径
 */
export function toRelativePath(filePath: string, projectRoot: string): string {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/')
}

/**
 * 解析字符串拼接表达式，提取中文和变量
 * 例如: '你好' + world => { text: "你好{$0}", vars: [{placeholder: "{$0}", expression: "world"}] }
 * 例如: '你好' + name + '世界' => { text: "你好{$0}世界", vars: [{placeholder: "{$0}", expression: "name"}] }
 * 例如: '你好' + a + '中间' + b + '结尾' => { text: "你好{$0}中间{$1}结尾", vars: [...] }
 */
export function parseStringConcatExpression(expr: string): { text: string; vars: TemplateVar[] } {
  const vars: TemplateVar[] = []
  let varIndex = 0
  
  // 移除所有空格，便于解析
  const normalized = expr.replace(/\s+/g, '')
  
  // 按 + 分割表达式
  const parts = normalized.split('+')
  
  let resultText = ''
  
  for (const part of parts) {
    // 判断是否是字符串字面量（单引号或双引号）
    const stringMatch = part.match(/^(['"])(.*)\1$/)
    
    if (stringMatch) {
      // 是字符串字面量，提取中文部分
      const strContent = stringMatch[2]
      resultText += strContent
    } else {
      // 是变量，添加占位符
      const placeholder = `{$${varIndex}}`
      resultText += placeholder
      vars.push({
        placeholder,
        expression: part,
        index: varIndex
      })
      varIndex++
    }
  }
  
  return { text: resultText, vars }
}
