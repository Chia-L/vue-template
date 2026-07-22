/**
 * i18n-helper 插件类型定义
 */

export interface I18nConfig {
  scanDir: string[]
  excludeDirs: string[]
  localLang: string
  targetLangs: string[]
  localesDir: string
  i18nExportFile: string
  cacheFile: string
  publicKey: string
  aiConfig: AIConfig | null
  projectRoot: string
}

export interface AIConfig {
  endpoint: string
  model: string
  apikey: string
}

export interface CacheEntry {
  value: string
  [key: string]: string | undefined
}

export interface CacheGroup {
  [entryKey: string]: CacheEntry
}

export interface CacheData {
  [groupKey: string]: CacheGroup
}

export interface LocaleData {
  [groupKey: string]: {
    [entryKey: string]: string
  }
}

export interface ExtractedEntry {
  key: string
  value: string
  source: string
  type: string
  vars?: TemplateVar[]
}

export interface TemplateVar {
  placeholder: string
  expression: string
  index: number
}

export interface ParseResult {
  content: string
  entries: ExtractedEntry[]
}

export interface CommentRange {
  start: number
  end: number
}

export interface ExistingEntryInfo {
  group: string
  key: string
}

export interface UnalignedData {
  [targetLang: string]: {
    [groupKey: string]: {
      [entryKey: string]: string
    }
  }
}

export interface DiffReport {
  [targetLang: string]: {
    [groupKey: string]: {
      [entryKey: string]: {
        value: string
        [langKey: string]: string
      }
    }
  }
}

export interface TestCredentials {
  user: string
  pwd: string
}

export interface UntranslatedText {
  url: string
  text: string
  isDialog: boolean
}
