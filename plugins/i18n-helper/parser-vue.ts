/**
 * Vue 文件解析模块
 * 负责解析 Vue 文件中的中文词条并包裹
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

class VueParser {
  private config: I18nConfig
  private localLang: string
  private extractedEntries: ExtractedEntry[]

  constructor(config: I18nConfig) {
    this.config = config
    this.localLang = config.localLang
    this.extractedEntries = []
  }

  /**
   * 解析 Vue 文件
   * @param content - 文件内容
   * @param filePath - 文件路径
   * @returns 修改后的内容和提取的词条列表
   */
  parse(content: string, filePath: string): ParseResult {
    this.extractedEntries = []
    const commentRanges = getCommentRanges(content, '.vue')

    // 分离 template、script、style 部分
    // 使用贪婪匹配，确保匹配整个主模板（包含嵌套的 <template> 标签）
    const templateMatch = content.match(/<template>([\s\S]*)<\/template>/)
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/)

    let modifiedContent = content

    // 处理 template 部分
    if (templateMatch) {
      const templateContent = templateMatch[1]
      const templateStart = content.indexOf(templateContent)
      const processedTemplate = this._processTemplate(templateContent, templateStart, commentRanges, filePath)
      modifiedContent = modifiedContent.replace(templateContent, processedTemplate)
    }

    // 处理 script 部分
    if (scriptMatch) {
      const scriptContent = scriptMatch[1]
      const scriptStart = content.indexOf(scriptContent)
      const processedScript = this._processScript(scriptContent, scriptStart, commentRanges, filePath)
      modifiedContent = modifiedContent.replace(scriptContent, processedScript)

      // 如果有提取到词条，需要添加 import 和 useI18n
      if (this.extractedEntries.length > 0) {
        modifiedContent = this._addVueI18nImport(modifiedContent)
      }
    }

    return {
      content: modifiedContent,
      entries: this.extractedEntries
    }
  }

  /**
   * 处理 template 部分
   * @private
   */
  _processTemplate(template: string, templateStart: number, commentRanges: [number, number][], filePath: string): string {
    let processed = template

    // 1. 处理文本节点中的中文
    processed = this._processTextNodes(processed, templateStart, commentRanges, filePath)

    // 2. 处理属性中的中文
    processed = this._processAttributes(processed, templateStart, commentRanges, filePath)

    // 3. 处理动态绑定属性中的字符串拼接表达式
    processed = this._processStringConcatInTemplate(processed, templateStart, commentRanges, filePath)

    return processed
  }

  /**
   * 处理文本节点
   * @private
   */
  _processTextNodes(template: string, templateStart: number, commentRanges: [number, number][], filePath: string): string {
    // 匹配标签之间的文本内容（排除标签属性）
    // 使用更精确的正则：匹配 > 后面不是 / 或 ! 的内容，直到下一个 <
    const textNodeRegex = />([^<]+)</g
    let match: RegExpExecArray | null
    let result = template
    let offset = 0

    while ((match = textNodeRegex.exec(template)) !== null) {
      const text = match[1]
      const textStart = templateStart + match.index + 1 // +1 跳过 '>'

      // 跳过注释区域
      if (isInComment(textStart, commentRanges)) {
        continue
      }

      // 跳过纯空白字符
      if (/^\s*$/.test(text)) {
        continue
      }

      // 检查是否包含中文
      if (!hasChinese(text)) {
        continue
      }

      // 检查是否已被包裹
      if (/\$t\(/.test(text)) {
        continue
      }

      // 提取中文并生成 key
      const chineseText = extractChinese(text)
      const key = this._generateKey(chineseText, filePath)
      const wrappedText = `{{ $t('${key}') }}`

      // 替换文本
      const start = match.index + 1
      const end = start + text.length
      result = result.substring(0, start + offset) + wrappedText + result.substring(end + offset)
      offset += wrappedText.length - text.length

      this.extractedEntries.push({
        key,
        value: chineseText,
        source: filePath,
        type: 'template-text'
      })
    }

    return result
  }

  /**
   * 处理属性中的中文
   * @private
   */
  _processAttributes(template: string, templateStart: number, commentRanges: [number, number][], filePath: string): string {
    let processed = template

    // 1. 处理普通属性中的中文（非动态绑定）
    // 例如：placeholder="请输入密码"
    const attrRegex = /(\w+)=["']([^"']*[\u4e00-\u9fa5][^"']*)["']/g
    let match: RegExpExecArray | null
    let offset = 0

    while ((match = attrRegex.exec(template)) !== null) {
      const attrName = match[1]
      const attrValue = match[2]
      const attrStart = templateStart + match.index

      // 跳过注释区域
      if (isInComment(attrStart, commentRanges)) {
        continue
      }

      // 跳过已包裹的
      if (/\$t\(/.test(attrValue)) {
        continue
      }

      const chineseText = extractChinese(attrValue)
      const key = this._generateKey(chineseText, filePath)

      // 替换为动态绑定
      const replacement = `:${attrName}="$t('${key}')"`
      const start = match.index + offset
      const end = start + match[0].length
      processed = processed.substring(0, start) + replacement + processed.substring(end)
      offset += replacement.length - match[0].length

      this.extractedEntries.push({
        key,
        value: chineseText,
        source: filePath,
        type: 'template-attr'
      })
    }

    // 2. 处理动态绑定属性中的中文字符串
    // 例如：:placeholder="'请输入密码'"
    const dynamicAttrRegex = /:(\w+)=["']'([^']*[\u4e00-\u9fa5][^']*)'["']/g
    offset = 0

    while ((match = dynamicAttrRegex.exec(processed)) !== null) {
      const attrName = match[1]
      const attrValue = match[2]
      const attrStart = templateStart + match.index

      // 跳过注释区域
      if (isInComment(attrStart, commentRanges)) {
        continue
      }

      // 跳过已包裹的
      if (/\$t\(/.test(attrValue)) {
        continue
      }

      const chineseText = extractChinese(attrValue)
      const key = this._generateKey(chineseText, filePath)

      // 替换为 $t 调用
      const replacement = `:${attrName}="$t('${key}')"`
      const start = match.index + offset
      const end = start + match[0].length
      processed = processed.substring(0, start) + replacement + processed.substring(end)
      offset += replacement.length - match[0].length

      this.extractedEntries.push({
        key,
        value: chineseText,
        source: filePath,
        type: 'template-dynamic-attr'
      })
    }

    // 3. 处理动态绑定属性中的字符串拼接表达式（优先于字符串字面量处理）
    // 例如：v-text="'服务器时间：' + remoteTimeStore.serverTime"
    processed = this._processStringConcatInTemplate(processed, templateStart, commentRanges, filePath)

    // 4. 处理动态绑定属性中的普通中文字符串字面量（跳过已处理的拼接表达式）
    // 匹配 :attr="..." 或 v-xxx="..." 中包含中文字符串字面量的表达式（不含 + 拼接）
    const exprAttrRegex = /(?::|v-[\w-]+=)([\w-]+)=["']([^"']*[\u4e00-\u9fa5][^"']*)["']/g
    offset = 0

    while ((match = exprAttrRegex.exec(processed)) !== null) {
      const attrName = match[1]
      const exprValue = match[2]
      const attrStart = templateStart + match.index

      // 跳过注释区域
      if (isInComment(attrStart, commentRanges)) {
        continue
      }

      // 跳过已包裹的
      if (/\$t\(/.test(exprValue) || /\bt\(/.test(exprValue)) {
        continue
      }

      // 跳过包含 + 拼接的表达式（已由 _processStringConcatInTemplate 处理）
      if (/\+/.test(exprValue)) {
        continue
      }

      // 提取表达式中的所有中文字符串字面量
      const stringLiteralRegex = /'([^']*[\u4e00-\u9fa5][^']*)'/g
      let strMatch: RegExpExecArray | null
      let newExpr = exprValue
      let strOffset = 0
      let hasReplacement = false

      while ((strMatch = stringLiteralRegex.exec(exprValue)) !== null) {
        const strContent = strMatch[1]
        const chineseText = extractChinese(strContent)
        
        if (!chineseText) continue

        const key = this._generateKey(chineseText, filePath)
        const replacement = `t('${key}')`
        const start = strMatch.index + strOffset
        const end = start + strMatch[0].length
        newExpr = newExpr.substring(0, start) + replacement + newExpr.substring(end)
        strOffset += replacement.length - strMatch[0].length
        hasReplacement = true

        this.extractedEntries.push({
          key,
          value: chineseText,
          source: filePath,
          type: 'template-expr-attr'
        })
      }

      if (hasReplacement) {
        const fullReplacement = `:${attrName}="${newExpr}"`
        const start = match.index + offset
        const end = start + match[0].length
        processed = processed.substring(0, start) + fullReplacement + processed.substring(end)
        offset += fullReplacement.length - match[0].length
      }
    }

    return processed
  }

  /**
   * 处理 script 部分
   * @private
   */
  _processScript(script: string, scriptStart: number, commentRanges: [number, number][], filePath: string): string {
    let processed = script

    // 1. 处理字符串拼接表达式
    processed = this._processStringConcatInScript(processed, scriptStart, commentRanges, filePath)

    // 2. 处理字符串字面量中的中文
    processed = this._processStringLiterals(processed, scriptStart, commentRanges, filePath)

    // 3. 处理模板字符串中的中文
    processed = this._processTemplateLiterals(processed, scriptStart, commentRanges, filePath)

    return processed
  }

  /**
   * 处理 script 中的字符串拼接表达式
   * 例如：'你好' + world, world + '你好', '你好' + world + '你好'
   * @private
   */
  _processStringConcatInScript(script: string, scriptStart: number, commentRanges: [number, number][], filePath: string): string {
    let processed = script

    // 匹配包含中文的字符串拼接表达式
    // 模式：'中文' + 变量 或 变量 + '中文' 或 '中文' + 变量 + '中文'
    const concatRegex = /(?:['"][^'"]*[\u4e00-\u9fa5][^'"]*['"]\s*\+\s*[^+\s][^+]*|\b\w+\s*\+\s*['"][^'"]*[\u4e00-\u9fa5][^'"]*['"])(?:\s*\+\s*(?:['"][^'"]*[\u4e00-\u9fa5][^'"]*['"]|[^+\s][^+]*))*/g
    
    let match: RegExpExecArray | null
    let offset = 0

    while ((match = concatRegex.exec(script)) !== null) {
      const exprContent = match[0]
      const exprStart = scriptStart + match.index

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
        type: 'script-string-concat',
        vars
      })
    }

    return processed
  }

  /**
   * 处理 template 中的字符串拼接表达式
   * 例如：:attr="'你好' + world", v-text="'服务器时间：' + remoteTimeStore.serverTime"
   * @private
   */
  _processStringConcatInTemplate(template: string, templateStart: number, commentRanges: [number, number][], filePath: string): string {
    let processed = template

    // 匹配动态绑定属性中的字符串拼接表达式
    // 匹配 :attr="..." 或 v-xxx="..." 中包含 + 拼接和中文字符的表达式
    // 注意：属性值用双引号包裹，内部含单引号字符串，所以内容匹配用 [^"]* 而非 [^"']*
    const concatAttrRegex = /[\s](:[\w-]+|v-[\w-]+)="([^"]*[\u4e00-\u9fa5][^"]*\+[^"]*)"/g
    
    let match: RegExpExecArray | null
    let offset = 0

    while ((match = concatAttrRegex.exec(template)) !== null) {
      const attrName = match[1]
      const exprValue = match[2]
      const attrStart = templateStart + match.index

      // 跳过注释区域
      if (isInComment(attrStart, commentRanges)) {
        continue
      }

      // 跳过已包裹的
      if (/\$t\(/.test(exprValue) || /\bt\(/.test(exprValue)) {
        continue
      }

      // 解析拼接表达式
      const { text: chineseText, vars } = parseStringConcatExpression(exprValue)
      
      if (!chineseText) continue

      const key = this._generateKey(chineseText, filePath)

      // 构建替换字符串
      let replacement: string
      if (vars.length === 0) {
        replacement = `$t('${key}')`
      } else {
        // 变量对象的键名需要去掉花括号，{$0} -> $0，且不带引号
        const varObj = vars.map(v => `${v.placeholder.replace(/[{}]/g, '')}: ${v.expression}`).join(', ')
        replacement = `$t('${key}', { ${varObj} })`
      }

      // 构建完整替换，保留 :attr= 或 v-attr= 前缀
      const fullMatch = match[0]
      const attrNameStart = fullMatch.indexOf(attrName)
      const prefix = fullMatch.substring(0, attrNameStart + attrName.length + 1) // 包含空格、属性名和 =
      const fullReplacement = `${prefix}"${replacement}"`
      const start = match.index + offset
      const end = start + match[0].length
      processed = processed.substring(0, start) + fullReplacement + processed.substring(end)
      offset += fullReplacement.length - match[0].length

      this.extractedEntries.push({
        key,
        value: chineseText,
        source: filePath,
        type: 'template-string-concat',
        vars
      })
    }

    return processed
  }

  /**
   * 处理字符串字面量
   * @private
   */
  _processStringLiterals(script: string, scriptStart: number, commentRanges: [number, number][], filePath: string): string {
    let processed = script

    // 匹配单引号和双引号字符串（禁止跨行）
    const stringRegex = /(['"])([^'"\r\n]*[\u4e00-\u9fa5][^'"\r\n]*)\1/g
    let match: RegExpExecArray | null
    let offset = 0

    while ((match = stringRegex.exec(script)) !== null) {
      const quote = match[1]
      const strContent = match[2]
      const strStart = scriptStart + match.index

      // 跳过注释区域
      if (isInComment(strStart, commentRanges)) {
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
        type: 'script-string'
      })
    }

    return processed
  }

  /**
   * 处理模板字符串
   * @private
   */
  _processTemplateLiterals(script: string, scriptStart: number, commentRanges: [number, number][], filePath: string): string {
    let processed = script

    // 匹配模板字符串 `...${var}...`
    const templateLiteralRegex = /`([^`]*[\u4e00-\u9fa5][^`]*)`/g
    let match: RegExpExecArray | null
    let offset = 0

    while ((match = templateLiteralRegex.exec(script)) !== null) {
      const templateContent = match[1]
      const templateStart = scriptStart + match.index

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
        type: 'script-template',
        vars
      })
    }

    return processed
  }

  /**
   * 添加 vue-i18n 的 import 和 useI18n
   * @private
   */
  _addVueI18nImport(content: string): string {
    const importStatement = "import { useI18n } from 'vue-i18n'"
    const useStatement = 'const { t, locale } = useI18n()'

    // 检查是否已经存在
    if (content.includes(importStatement) && content.includes(useStatement)) {
      return content
    }

    // 找到 <script> 标签
    const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/)
    if (!scriptMatch) {
      return content
    }

    const scriptContent = scriptMatch[1]
    const lines = scriptContent.split('\n')
    const insertPos = findImportEndLine(lines)

    // 在 import 块结束后的位置插入
    lines.splice(insertPos, 0, importStatement, useStatement)

    // 替换原来的 script 内容
    return content.replace(scriptContent, lines.join('\n'))
  }

  /**
   * 生成语言 key
   * @private
   */
  _generateKey(chineseText: string, filePath: string): string {
    // 从文件路径提取组件名
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

export default VueParser
