import httpHelper from '@/app/core/request'
import type { UserInfo, PwdPolicy } from '@/app/types/user'
import { rsaEncrypt } from '@/app/core/encrypt'

/* 
 * 退出登录
 * @description 退出登录
 * @return {Promise<Record<string, any>>} 登录结果
 * */
export const logout = () => {
  return httpHelper<Record<string, unknown>>('/api/account/logout/', 'get')
}

/* 
 * 获取用户信息
 * @description 获取用户信息
 * @return {Promise<Record<string, any>>} 用户信息
 * */
export const getUserInfo = () => {
  return httpHelper<UserInfo>('/api/account/info/', 'post')
}

/* 忘记密码 */
export const forgotPassWd = (params: {username: string}) => {
  return httpHelper<Record<string, unknown>>('/api/account/forget_password/', 'post', params)
}

/* 获取密码策略 */
export const getPwdPolicy = () => {
  return httpHelper<PwdPolicy>('/api/account/get_pwd_tactic/', 'post')
}

export interface EditPassWdParams {
  new_encrypt_password: string
  init_flag: string
  old_encrypt_password?: string
}

/* 修改密码 */
export const editPassWd = (params: EditPassWdParams) => {
  return httpHelper<Record<string, unknown>>('/api/account/change_password/', 'post', params)
}

/* 会话锁定状态获取 */
export const isUserLocked = () => {
  return httpHelper<Record<string, unknown>>('/api/account/is_user_locked/', 'post')
}

/* 会话锁定 */
export const lockSession = (params: {router: string}) => {
  return httpHelper<Record<string, unknown>>('/api/account/lock/', 'post', params)
}

export interface UnlockSessionParams {
  pwd: string
  is_refresh: boolean
}

export interface UnlockSessionResponse {
  unlocked: boolean
  router: string
}

/* 会话解锁 */
export const unlockSession = (params: UnlockSessionParams) => {
  return httpHelper<UnlockSessionResponse>('/api/account/unlock/', 'post', params)
}

/* 通知设置类型 */
export interface NotifySetting {
  email: string
  phone: string
  no_noti?: string
}

/* 获取通知设置 */
export const getNotifySetting = () => {
  return httpHelper<Partial<NotifySetting>>('/api/account/get_message_notify/', 'post')
}

/* 保存通知设置 */
export const saveNotifySetting = (params: NotifySetting) => {
  return httpHelper<Record<string, unknown>>('/api/account/set_message_notify/', 'post', params)
}

/* 验证管理员密码（停止服务前二次确认） */
export const verifyPassword = (password: string) => {
  return httpHelper<Record<string, unknown>>('/api/account/verify_password/', 'post', {
    password: rsaEncrypt(password)
  })
}
