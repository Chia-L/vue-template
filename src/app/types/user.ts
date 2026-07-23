export interface UserFormData {
  account: string
  name: string
  user_type: 'admin' | 'readonly' | 'shared',
  pwd: string
  cfmPwd: string
  email: string
  remark: string
}

/* 用户管理--用户类型 */
export interface UserItem extends Record<string, unknown> {
  user_id: string,
  account: string,
  name: string,
  user_type: 'admin' | 'readonly' | 'shared',
  enable: boolean,
  lock: boolean,
  email: string,
  remark: string,
}

export interface UserInfo extends Record<string, unknown> {
  role: string,
  role_name: string,
  routes: string[],
  name: string,
  user: string,
}

export interface PwdPolicy {
  policy: string,
  pwd_length: number,
}