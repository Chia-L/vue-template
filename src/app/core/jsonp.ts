/**
 * 原生 JSONP 请求工具
 * 用于与本地 UKey 硬件加密锁控件通信（http://127.0.0.1:17681）
 */

export interface JsonpOptions {
  callbackQuery?: string
  callbackName?: string
  json?: string
  timeout?: number
}

let counter = 0

export function jsonp(url: string, options: JsonpOptions = {}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const cbName = options.callbackName || `jsonp_cb_${counter++}_${Date.now()}`
    const script = document.createElement('script')
    const query = options.callbackQuery || 'callback'

    let src = `${url}?${query}=${cbName}`
    if (options.json) {
      src += `&json=${encodeURIComponent(options.json)}`
    }

    const timeout = options.timeout || 10000

    // 注册全局回调函数
    ;(window as unknown as Record<string, unknown>)[cbName] = (data: unknown) => {
      resolve(data)
      cleanup()
    }

    function cleanup() {
      delete (window as unknown as Record<string, unknown>)[cbName]
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }

    // 超时处理
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('JSONP 请求超时'))
    }, timeout)

    script.onerror = () => {
      clearTimeout(timer)
      cleanup()
      reject(new Error('JSONP 请求失败'))
    }

    script.src = src
    document.head.appendChild(script)
  })
}
