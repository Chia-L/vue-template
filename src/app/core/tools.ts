import Cookie from 'js-cookie'

const TOKEN_KEY = 'csrftoken'

/* 
 * 获取token
 * @description 获取token
 * @return {string | null} token值
 * */
export const getToken = (): string | undefined => {
  return Cookie.get(TOKEN_KEY) as string | undefined
}

/* 
 * 设置token
 * @description 设置token
 * @param {string} token token值
 * */
export const setToken = (token: string): void => {
  Cookie.set(TOKEN_KEY, token)
}

/* 
 * 移除token
 * @description 移除token
 * */
export const removeToken = (): void => {
  Cookie.remove(TOKEN_KEY)
}

// ========== 密码校验工具 ==========

/**
 * 密码特殊字符正则
 * 用于判断密码中是否包含特殊字符（如：~!@# 等）
 */
export const SPECIAL_CHAR_REGEX = /[~!@#'"/\\,.<>`%$()*+.?[\]^{}|]+/

/**
 * 密码策略校验（核心函数）
 * @description 根据密码策略（low/centre/high）校验密码是否合规
 * @param policy 密码策略等级：'low' 不限类型 | 'centre' 至少3种 | 'high' 必须4种
 * @param pwdLen 密码最小长度
 * @param password 待校验的密码
 * @returns null 表示校验通过，string 表示错误消息
 */
export function checkPassword(policy: string, pwdLen: number | string, password: string): string | null {
  // 不能包含中文或空格
  if (escape(password).indexOf('%u') >= 0 || /\s/g.test(password)) {
    return '密码不能包含中文或空格'
  }
  // 长度校验
  const re = new RegExp('^\\s*\\S{' + pwdLen + ',32}\\s*$', 'gim')
  if (!re.test(password)) {
    return '新密码的长度应该介于' + pwdLen + '到32之间'
  }
  // 策略校验
  if (policy === 'high') {
    if (!/[A-Z]+/.test(password)) return '密码中应包含A-Z'
    if (!/[a-z]+/.test(password)) return '密码中应包含a-z'
    if (!/[0-9]+/.test(password)) return '密码中应包含0-9'
    if (!SPECIAL_CHAR_REGEX.test(password)) return '密码中应包含特殊字符'
  } else if (policy === 'centre') {
    let n = 0
    if (/[A-Z]+/.test(password)) n++
    if (/[a-z]+/.test(password)) n++
    if (/[0-9]+/.test(password)) n++
    if (SPECIAL_CHAR_REGEX.test(password)) n++
    if (n < 3) return '新密码至少需要包含3种字符'
  }
  return null
}

/**
 * 密码策略校验（表单校验回调版本）
 * @description checkPassword 的薄包装，用于 el-form 的 validator 回调
 * @param value 待校验的密码
 * @param callback el-form 校验回调函数
 * @param policy 密码策略等级，默认 'low'
 * @param pwdLen 密码最小长度，默认 1
 */
export function checkerPassWd(value: string, callback: (error?: Error) => void, policy = 'low', pwdLen: number | string = 1): void {
  const error = checkPassword(policy, pwdLen, value)
  if (error) {
    callback(new Error(error))
  } else {
    callback()
  }
}

/**
 * 校验手机号码
 * @description 验证字符串是否符合中国大陆手机号格式，并排除明显无效号码
 *   - 格式要求：1 开头 + 第二位 3-9 + 共 11 位数字
 *   - 排除所有位均为同一数字的号码（如 13333333333）
 * @param str - 待校验的字符串
 * @returns 是否为合法手机号
 */
export function checkPhone(str: string): boolean {
  // 基本格式校验：1开头 + 第二位3-9 + 共11位数字
  if (!/^1[3-9]\d{9}$/.test(str)) return false
  return true
}

/** 字符串校验正则集合 */
export const regex = {
  /** IPv4 地址正则 */
  ip: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])$/g,
  /** MAC 地址正则 */
  mac: /^[0-9a-f]{1,2}([.:-])(?:[0-9a-f]{1,2}\1){4}[0-9a-f]{1,2}$/gi,
  /** 邮箱地址正则 */
  email: /^([A-Za-z0-9_\-.])+@([A-Za-z0-9_\-.])+\.([A-Za-z]{2,4})$/g,
  /** 端口号正则（0-65535） */
  port: /^([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/g,

  /** 校验是否为合法 IPv4 地址 */
  isIp(v: string): boolean {
    return new RegExp(regex.ip).test(v)
  },
  /** 校验是否为合法端口号（0-65535） */
  isPort(v: string): boolean {
    return new RegExp(regex.port).test(v)
  },
  /** 校验是否为合法邮箱地址 */
  isEmail(v: string): boolean {
    return new RegExp(regex.email).test(v)
  },
  /** 校验是否为合法 MAC 地址 */
  isMac(v: string): boolean {
    return new RegExp(regex.mac).test(v)
  }
}

/**
 * 绑定事件监听器
 * @description 封装 addEventListener，统一事件绑定入口
 * @param selector - 事件目标（如 window、document 或 DOM 元素）
 * @param eventName - 事件名称（如 'keydown'、'resize'）
 * @param callback - 事件回调函数
 */
export function bindEventListener(
  selector: EventTarget,
  eventName: string,
  callback: EventListenerOrEventListenerObject
): void {
  selector.addEventListener(eventName, callback)
}

/**
 * 移除事件监听器
 * @description 封装 removeEventListener，统一事件移除入口
 * @param selector - 事件目标（如 window、document 或 DOM 元素）
 * @param eventName - 事件名称（如 'keydown'、'resize'）
 * @param callback - 事件回调函数
 */
export function removeEventListener(
  selector: EventTarget,
  eventName: string,
  callback: EventListenerOrEventListenerObject
): void {
  selector.removeEventListener(eventName, callback)
}
