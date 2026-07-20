/**
 * UKey 硬件加密锁通信 API
 * 通过 JSONP 与本地控件 http://127.0.0.1:17681 通信
 */

import { jsonp } from '@/app/core/jsonp'

const UKEY_URL = 'http://127.0.0.1:17681'

// ========== Mock 开关 ==========
// 设为 true 可模拟 UKey 行为，无需真实硬件
const UKEY_MOCK = false
// 模拟场景: 'normal' | 'no_ukey' | 'multi_ukey' | 'init_fail' | 'lock_fail'
const UKEY_MOCK_SCENARIO: 'normal' | 'no_ukey' | 'multi_ukey' | 'init_fail' | 'lock_fail' = 'normal'
// ================================

/* 错误弹窗 - 使用 ElMessageBox（auto-import 已支持） */
function openErrorDialog(title: string, content: string) {
  ElMessageBox({
    title,
    message: content,
    confirmButtonText: '确定',
    dangerouslyUseHTMLString: true,
    customClass: 'dlgError'
  })
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/* 全局下载函数 - 挂载到 window 供 onclick 调用 */
(window as any).doDownload = () => {
  window.open('/api/download/tools/ukey/', '_blank')
}

/**
 * 获取 UKey 硬件序列号
 * @param callback 回调函数，接收 sn 数组和透传参数
 * @param callbackParam 透传给回调函数的参数
 */
export function getUkeySn(callback: (sn: string[], param: any) => void, callbackParam: any): Promise<void> {
  if (UKEY_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (UKEY_MOCK_SCENARIO === 'no_ukey') {
          callback([], callbackParam)
        } else if (UKEY_MOCK_SCENARIO === 'multi_ukey') {
          callback(['SN001', 'SN002'], callbackParam)
        } else {
          callback(['MOCK_SN_001'], callbackParam)
        }
        resolve()
      }, 500)
    })
  }

  return jsonp(UKEY_URL, {
    callbackQuery: 'callback',
    callbackName: 'jsonpcallback',
    json: JSON.stringify({ function: 'GetSn' })
  }).then((res: any) => {
    const sn: string[] = []
    if (res[0].ret) {
      for (let i = 0; i < res[0].sn.length; i++) {
        sn.push(res[0].sn[i])
      }
    } else {
      console.error('ukey_api: getUkeySn 获取数据失败')
    }
    callback(sn, callbackParam)
  }).catch(() => {
    if (callbackParam.reject) callbackParam.reject()
    openErrorDialog('错误',
      '<div><i class="iconfont i-shibai" style="margin-right: 12px;font-size: 24px;color: #F56C6C;"></i></div>' +
      '<div>未检测到硬件加密锁控件。<br> 请<span id="doDownload" onclick="doDownload()" style="color: #2D8CF0;cursor: pointer">下载</span>并安装控件后重试。</div>'
    )
  })
}

/**
 * 初始化硬件加密锁
 * @param sn 硬件序列号
 * @param callback 初始化成功回调
 * @param param 透传参数
 */
export function initiateUkeyLock(sn: string, callback: (param: any) => void, param: any): void {
  if (UKEY_MOCK) {
    setTimeout(() => {
      if (UKEY_MOCK_SCENARIO === 'init_fail') {
        if (param.reject) param.reject()
        openErrorDialog('错误',
          '<div><i class="iconfont i-shibai" style="margin-right: 12px;font-size: 24px;color: #F56C6C;"></i></div>' +
          '<div>初始化硬件加密锁失败。</div>'
        )
      } else {
        callback(param)
      }
    }, 300)
    return
  }

  jsonp(UKEY_URL, {
    callbackQuery: 'callback',
    callbackName: 'jsonpcallback',
    json: JSON.stringify({ function: 'InitiateLock', sn })
  }).then(() => {
    callback(param)
  }).catch(() => {
    if (param.reject) param.reject()
    openErrorDialog('错误',
      '<div><i class="iconfont i-shibai" style="margin-right: 12px;font-size: 24px;color: #F56C6C;"></i></div>' +
      '<div>初始化硬件加密锁失败。</div>'
    )
  })
}

/**
 * 硬件加密锁加密运算
 * @param rand 盐值
 * @param params 透传参数（含 doLogin、resolve、reject、sn、salt）
 * @param sn 硬件序列号
 */
export function ukeyLock32Function(rand: string, params: any, sn: string): void {
  if (UKEY_MOCK) {
    setTimeout(() => {
      if (UKEY_MOCK_SCENARIO === 'lock_fail') {
        openErrorDialog('错误',
          '<div><i class="iconfont i-shibai" style="margin-right: 12px;font-size: 24px;color: #F56C6C;"></i></div>' +
          '<div>硬件加密锁方法执行失败。</div>'
        )
      } else {
        params.lock = 'mock_lock_value'
        params.ukey_sn = sn
        const pram = JSON.parse(JSON.stringify(params))
        delete pram.doLogin
        delete pram.reject
        delete pram.resolve
        params.doLogin(pram, params.resolve, params.reject)
      }
    }, 300)
    return
  }

  jsonp(UKEY_URL, {
    callbackQuery: 'callback',
    callbackName: 'jsonpcallback',
    json: JSON.stringify({ function: 'InitiateLock', sn })
  }).then((res: any) => {
    if (res[0].ret) {
      jsonp(UKEY_URL, {
        callbackQuery: 'callback',
        callbackName: 'jsonpcallback',
        json: JSON.stringify({ function: 'Lock32_Function', sn, rand })
      }).then((lockRes: any) => {
        params.lock = lockRes[0].lock
        params.ukey_sn = sn
        const pram = JSON.parse(JSON.stringify(params))
        delete pram.doLogin
        delete pram.reject
        delete pram.resolve
        params.doLogin(pram, params.resolve, params.reject)
      }).catch(() => {
        openErrorDialog('错误',
          '<div><i class="iconfont i-shibai" style="margin-right: 12px;font-size: 24px;color: #F56C6C;"></i></div>' +
          '<div>硬件加密锁方法执行失败。</div>'
        )
      })
    }
  }).catch(() => {
    if (params.reject) params.reject()
    openErrorDialog('错误',
      '<div><i class="iconfont i-shibai" style="margin-right: 12px;font-size: 24px;color: #F56C6C;"></i></div>' +
      '<div>初始化硬件加密锁失败。</div>'
    )
  })
}
