import { defineStore } from 'pinia'
import { logout, getUserInfo as getUser } from '@/app/apis/user'
import { getToken, removeToken } from '@/app/core/tools'
import { usePermissionStore } from '@/app/stores/permission'
import router from '@/app/router'
import type { UserInfo } from '@/app/types/user'

type User = Omit<UserInfo, 'routes' | 'buttons'>

interface UserState {
  signPrefix: string | null
  globalSignPrefix: string | null
  token: string
  userInfor: User
  pagePerms: string[]
  buttonPerms: string[]
}

export const useUserStore = defineStore('user', {
  state: ():UserState => ({
    signPrefix: null,
    globalSignPrefix: null,
    token: getToken() || '',
    userInfor: {} as User,
    pagePerms: [],
    buttonPerms: []
  }),
  // 开启状态持久化
  persist: {
    key: 'user-store',
    storage: localStorage,
    pick: ['signPrefix', 'globalSignPrefix']
  },
  actions: {
    /* 
     * 设置属性
     * @description 设置属性
     * @param {string} key 属性名
     * @param {any} value 属性值
     * @return {void} 无
     */
    setProperty<K extends keyof UserState>(key: K, value: UserState[K]) {
      this.$patch({
        [key]: value
      })
    },

    /* 
     * 获取用户信息
     * @description 获取用户信息
     * @return {Promise<void>} 无
     * @throws {Error} 获取用户信息失败
     */
    getUserInfo(): Promise<Record<string, unknown>> {
      return new Promise((resolve, reject) => {
        getUser()
          .then((res) => {
            if (!res || res.r !== 0) {
              reject(new Error('验证失败，请重新登录'))
              return
            }
            /* 
            "role": "Super-Admin",
          "role_name": "系统管理员",
          "routes": allPerms ,
          "name": "系统管理员",
          "user": "admin" */
            const {role = '', role_name = '', name = '', user = ''} = res?.data ?? {}
            this.userInfor = {role, role_name, name, user}
            this.pagePerms = res?.data?.routes || []
            this.buttonPerms = res?.data?.buttons as string[] || []
            resolve(res.data)
          }).catch(reject)
      })
    },
    
    /* 
     * 退出登录
     * @description 退出登录
     * @return {Promise<void>} 无
     * @throws {Error} 退出登录失败
     */
    logout(): Promise<void> {
      return new Promise((resolve, reject) => {
        logout()
          .then(() => {
            this.resetToken().then(resolve)
            router.push('/login')
          }).catch(reject)
      })
    },
    
    /* 
     * 重置token
     * @description 重置token
     * @return {Promise<void>} 无
     */
    resetToken(): Promise<void> {
      return new Promise((resolve) => {
        this.token = ''
        removeToken()
        this.userInfor = {} as User
        this.pagePerms = []
        this.buttonPerms = []
        const permissionStore = usePermissionStore()
        permissionStore.reset()
        resolve()
      })
    }
  },
})
