/**
 * JS/TS 文件解析模块
 * 负责解析 JS/TS/TSX/JSX 文件中的中文词条并包裹
 */

import { hasChinese, extractChinese, getCommentRanges, isInComment, parseTemplateString, parseStringConcatExpression, generateUUID } from './utils.ts'
import type { I18nConfig, ExtractedEntry, ParseResult, TemplateVar } from './types.ts'

/**
 * 判断一行是否为 import 语句
 * 支持三种形式：import xxx from '...'、import '...'、import { xxx }
 */
function isImportLine(line: string): boolean {
  const trimmed = line.trim()
  return /^import[\s{'"]/.test(trimmed)
}

/**
 * 找到 import 块结束后的行号
 * 跳过开头的空行和注释，然后从第一个 import 开始，
 * 遇到第一个非 import 语句（包括空行、注释、其他代码）就返回
 * 用于确定新 import 语句的插入位置
 */
function findImportEndLine(lines: string[]): number {
  let i = 0
  // 1. 先跳过开头的空行和注释
  while (i < lines.length) {
    const trimmed = lines[i].trim()
    if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      i++
      continue
    }
    break
  }

  // 2. 如果第一行有效代码不是 import，直接返回当前位置
  if (i >= lines.length || !isImportLine(lines[i])) {
    return i
  }

  // 3. 是 import，继续往下找，遇到第一个非 import 的行就返回
  while (i < lines.length) {
    if (!isImportLine(lines[i])) {
      return i
    }
    i++
  }

  return i
}

class JSParser {
  private config: I18nConfig
  private localLang: string
  private extractedEntries: ExtractedEntry[]

  constructor(config: I18nConfig) {
    this.config = config
    this.localLang = config.localLang
    this.extractedEntries = []
  }

  /**
   * 解析 JS/TS 文件
   * @param content - 文件内容
   * @param filePath - 文件路径
   * @returns 修改后的内容和提取的词条列表
   */
  parse(content: string, filePath: string): ParseResult {
    this.extractedEntries = []
    const commentRanges = getCommentRanges(content, '.js')

    let processed = content

    // 1. 处理字符串拼接表达式（优先级最高）
    processed = this._processStringConcatExpressions(processed, commentRanges, filePath)

    // 2. 处理字符串字面量中的中文
    processed = this._processStringLiterals(processed, commentRanges, filePath)

    // 3. 处理模板字符串中的中文
    processed = this._processTemplateLiterals(processed, commentRanges, filePath)

    // 如果有提取到词条，需要添加 import 和 i18n.global
    if (this.extractedEntries.length > 0) {
      processed = this._addI18nImport(processed)
    }

    return {
      content: processed,
      entries: this.extractedEntries
    }
  }

  /**
   * 处理字符串拼接表达式
   * 例如：'你好' + world, world + '你好', '你好' + world + '你好'
   * @private
   */
  _processStringConcatExpressions(content: string, commentRanges: [number, number][], filePath: string): string {
    let processed = content

    // 匹配包含中文的字符串拼接表达式
    // 模式：'中文' + 变量 或 变量 + '中文' 或 '中文' + 变量 + '中文'
    const concatRegex = /(?:['"][^'"]*[\u4e00-\u9fa5][^'"]*['"]\s*\+\s*[^+\s][^+]*|\b\w+\s*\+\s*['"][^'"]*[\u4e00-\u9fa5][^'"]*['"])(?:\s*\+\s*(?:['"][^'"]*[\u4e00-\u9fa5][^'"]*['"]|[^+\s][^+]*))*/g
    
    let match: RegExpExecArray | null
    let offset = 0

    while ((match = concatRegex.exec(content)) !== null) {
      const exprContent = match[0]
      const exprStart = match.index

      // 跳过注释区域
      if (isInComment(exprStart, commentRanges)) {
        continue
      }

      // 跳过已包裹的
      if (/t\(/.test(exprContent) || /\$t\(/.test(exprContent)) {
        continue
      }

      // 解析拼接表达式
      const { text: chineseText, vars } = parseStringConcatExpression(exprContent)
      
      if (!chineseText) continue

      const key = this._generateKey(chineseText, filePath)

      // 构建替换字符串
      let replacement: string
      if (vars.length === 0) {
        replacement = `t('${key}')`
      } else {
        const varObj = vars.map(v => `${v.placeholder.replace(/[{}]/g, '')}: ${v.expression}`).join(', ')
        replacement = `t('${key}', { ${varObj} })`
      }

      const start = match.index + offset
      const end = start + match[0].length
      processed = processed.substring(0, start) + replacement + processed.substring(end)
      offset += replacement.length - match[0].length

      this.extractedEntries.push({
        key,
        value: chineseText,
        source: filePath,
        type: 'string-concat',
        vars
      })
    }

    return processed
  }

  /**
   * 处理字符串字面量
   * @private
   */
  _processStringLiterals(content: string, commentRanges: [number, number][], filePath: string): string {
    let processed = content

    // 匹配单引号和双引号字符串（禁止跨行）
    const stringRegex = /(['"])([^'"\r\n]*[\u4e00-\u9fa5][^'"\r\n]*)\1/g
    let match: RegExpExecArray | null
    let offset = 0

    while ((match = stringRegex.exec(content)) !== null) {
      const strContent = match[2]
      const strStart = match.index

      // 跳过注释区域
      if (isInComment(strStart, commentRanges)) {
        continue
      }

      // 验证开启引号是否真的是字符串的开始：
      // 如果引号前面是 ]、)、}、字母、数字或引号，说明这个引号是前一个字符串的关闭引号，应跳过
      if (strStart > 0) {
        const prevChar = content[strStart - 1]
        if (/[\w\]\)\}'"]/.test(prevChar)) {
          continue
        }
      }

      // 跳过跨行匹配：如果匹配内容包含换行符，说明是跨行误匹配，应跳过
      if (/[\r\n]/.test(match[0])) {
        continue
      }

      // 跳过已包裹的
      if (/t\(/.test(strContent) || /\$t\(/.test(strContent)) {
        continue
      }

      const chineseText = extractChinese(strContent)
      const key = this._generateKey(chineseText, filePath)

      // 替换为 t() 调用
      const replacement = `t('${key}')`
      const start = match.index + offset
      const end = start + match[0].length
      processed = processed.substring(0, start) + replacement + processed.substring(end)
      offset += replacement.length - match[0].length

      this.extractedEntries.push({
        key,
        value: chineseText,
        source: filePath,
        type: 'string'
      })
    }

    return processed
  }

  /**
   * 处理模板字符串
   * @private
   */
  _processTemplateLiterals(content: string, commentRanges: [number, number][], filePath: string): string {
    let processed = content

    // 匹配模板字符串 `...${var}...`
    const templateLiteralRegex = /`([^`]*[\u4e00-\u9fa5][^`]*)`/g
    let match: RegExpExecArray | null
    let offset = 0

    while ((match = templateLiteralRegex.exec(content)) !== null) {
      const templateContent = match[1]
      const templateStart = match.index

      // 跳过注释区域
      if (isInComment(templateStart, commentRanges)) {
        continue
      }

      // 跳过已包裹的
      if (/t\(/.test(templateContent)) {
        continue
      }

      const { text: chineseText, vars } = parseTemplateString(templateContent)
      const key = this._generateKey(chineseText, filePath)

      // 构建替换字符串
      let replacement: string
      if (vars.length === 0) {
        replacement = `t('${key}')`
      } else {
        const varNames = vars.map(v => v.expression).join(', ')
        replacement = `t('${key}', { ${varNames} })`
      }

      const start = match.index + offset
      const end = start + match[0].length
      processed = processed.substring(0, start) + replacement + processed.substring(end)
      offset += replacement.length - match[0].length

      this.extractedEntries.push({
        key,
        value: chineseText,
        source: filePath,
        type: 'template',
        vars
      })
    }

    return processed
  }

  /**
   * 添加 i18n 导入
   * @private
   */
  _addI18nImport(content: string): string {
    const i18nExportFile = this.config.i18nExportFile
    const importStatement = `import i18n from '${i18nExportFile}'`
    const destructStatement = 'const { t } = i18n.global'

    // 检查是否已经存在
    if (content.includes(importStatement) && content.includes(destructStatement)) {
      return content
    }

    const lines = content.split('\n')
    const insertPos = findImportEndLine(lines)

    // 在 import 块结束后的位置插入
    lines.splice(insertPos, 0, importStatement, destructStatement)

    return lines.join('\n')
  }

  /**
   * 生成语言 key
   * @private
   */
  _generateKey(chineseText: string, filePath: string): string {
    const uuid = generateUUID()
    return `${uuid}`
  }

  /**
   * 获取提取的词条
   */
  getExtractedEntries(): ExtractedEntry[] {
    return this.extractedEntries
  }
}

export default JSParser
