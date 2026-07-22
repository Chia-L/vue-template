/**
 * 日志模块
 * 提供统一的日志输出格式
 */

interface LogLevels {
  info: string
  warn: string
  error: string
}

const LOG_LEVELS: LogLevels = {
  info: '\x1b[32m[INFO]\x1b[0m',
  warn: '\x1b[33m[WARN]\x1b[0m',
  error: '\x1b[31m[ERROR]\x1b[0m'
}

class Logger {
  private prefix: string

  constructor(prefix: string = '[i18n-helper]') {
    this.prefix = prefix
  }

  info(message: string, data?: unknown): void {
    console.log(`${LOG_LEVELS.info} ${this.prefix} ${message}`)
    if (data) console.log(data)
  }

  warn(message: string, data?: unknown): void {
    console.warn(`${LOG_LEVELS.warn} ${this.prefix} ${message}`)
    if (data) console.warn(data)
  }

  error(message: string, data?: unknown): void {
    console.error(`${LOG_LEVELS.error} ${this.prefix} ${message}`)
    if (data) console.error(data)
  }

  success(message: string): void {
    console.log(`\x1b[32m✓\x1b[0m ${this.prefix} ${message}`)
  }

  step(message: string): void {
    console.log(`\x1b[36m→\x1b[0m ${this.prefix} ${message}`)
  }
}

export default Logger
