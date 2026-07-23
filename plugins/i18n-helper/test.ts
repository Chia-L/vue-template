/**
 * i18n:test 命令实现
 * 使用 Playwright 模拟登录并遍历所有界面，检查是否有未翻译的中文
 */

import { chromium, type Page } from 'playwright'
import Logger from './logger.ts'
import fs from 'fs'
import path from 'path'
import type { I18nConfig, TestCredentials, UntranslatedText } from './types.ts'

class TestCommand {
  private config: I18nConfig
  private credentials: TestCredentials
  private logger: Logger
  private untranslatedTexts: UntranslatedText[]

  constructor(config: I18nConfig, credentials: TestCredentials) {
    this.config = config
    this.credentials = credentials
    this.logger = new Logger()
    this.untranslatedTexts = []
  }

  /**
   * 执行测试
   */
  async execute(): Promise<void> {
    this.logger.step('开始执行 i18n:test 命令')

    // 检查 Playwright 是否安装
    try {
      await import('playwright')
    } catch (e) {
      this.logger.error('未安装 Playwright，请先运行: pnpm install -D playwright')
      process.exit(1)
    }

    const browser = await chromium.launch({ headless: false })
    const context = await browser.newContext()
    const page = await context.newPage()

    try {
      // 1. 登录
      this.logger.step('正在登录...')
      await this._login(page)

      // 2. 获取所有路由
      this.logger.step('获取路由列表...')
      const routes = this._getRoutes()
      this.logger.info(`发现 ${routes.length} 个路由`)

      // 3. 遍历所有路由
      for (const route of routes) {
        await this._testRoute(page, route)
      }

      // 4. 输出结果
      if (this.untranslatedTexts.length > 0) {
        this.logger.warn(`发现 ${this.untranslatedTexts.length} 处未翻译的中文`)
        console.log('\n未翻译的文本：')
        for (const item of this.untranslatedTexts) {
          console.log(`  - 页面: ${item.url}`)
          console.log(`    文本: ${item.text}`)
          console.log('')
        }
      } else {
        this.logger.success('所有页面翻译完整，未发现中文残留')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error('测试过程中发生错误', errorMessage)
    } finally {
      await browser.close()
    }
  }

  /**
   * 登录
   * @private
   */
  async _login(page: Page): Promise<void> {
    await page.goto('http://localhost:3000/login')
    await page.waitForLoadState('networkidle')

    // 输入账号密码
    await page.fill('input[type="text"], input[placeholder*="账号"], input[placeholder*="用户"]', this.credentials.user)
    await page.fill('input[type="password"]', this.credentials.pwd)

    // 点击登录按钮
    await page.click('button[type="submit"], button:has-text("登录")')

    // 等待登录成功
    await page.waitForURL('**/home', { timeout: 10000 })
    this.logger.success('登录成功')
  }

  /**
   * 获取路由列表
   * @private
   */
  _getRoutes(): string[] {
    // 从 router 目录读取路由配置
    const routerPath = path.resolve(this.config.projectRoot, 'src/app/router')
    const routes: string[] = []

    if (fs.existsSync(routerPath)) {
      const files = fs.readdirSync(routerPath)
      for (const file of files) {
        if (file.endsWith('.ts') || file.endsWith('.js')) {
          const filePath = path.join(routerPath, file)
          const content = fs.readFileSync(filePath, 'utf-8')

          // 简单提取路由路径
          const pathRegex = /path:\s*['"]([^'"]+)['"]/g
          let match: RegExpExecArray | null
          while ((match = pathRegex.exec(content)) !== null) {
            const routePath = match[1]
            if (routePath && !routePath.includes(':') && routePath !== '/') {
              routes.push(routePath)
            }
          }
        }
      }
    }

    // 去重
    return [...new Set(routes)]
  }

  /**
   * 测试单个路由
   * @private
   */
  async _testRoute(page: Page, route: string): Promise<void> {
    this.logger.step(`测试路由: ${route}`)

    try {
      await page.goto(`http://localhost:3000${route}`)
      await page.waitForLoadState('networkidle')

      // 检查页面是否有未翻译的中文
      await this._checkPage(page, route)

      // 尝试点击页面上的按钮，打开弹窗/抽屉
      const buttons = await page.$$('button, .el-button')
      for (let i = 0; i < Math.min(buttons.length, 5); i++) {
        try {
          await buttons[i].click()
          await page.waitForTimeout(500)
          await this._checkPage(page, route, true)
        } catch (e) {
          // 忽略点击失败
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.warn(`测试路由失败: ${route}`, errorMessage)
    }
  }

  /**
   * 检查页面是否有未翻译的中文
   * @private
   */
  async _checkPage(page: Page, url: string, isDialog = false): Promise<void> {
    // 执行 JS 检查页面上的中文文本
    const texts = await page.evaluate(() => {
      const chineseRegex = /[\u4e00-\u9fa5]+/g
      const results: string[] = []

      // 遍历所有文本节点
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      )

      let node: Node | null
      while ((node = walker.nextNode())) {
        const text = node.textContent?.trim() || ''
        if (text && chineseRegex.test(text)) {
          // 检查是否被包裹在 i18n 函数中（这里简单判断，实际可能需要更复杂的逻辑）
          results.push(text)
        }
      }

      return results
    })

    if (texts.length > 0) {
      for (const text of texts) {
        this.untranslatedTexts.push({
          url,
          text,
          isDialog
        })
      }
    }
  }
}

export default TestCommand
