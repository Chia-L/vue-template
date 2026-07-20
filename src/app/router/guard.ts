/* 
 * 路由守卫
 * @description 路由守卫
 * @param {Router} router 路由实例
 * @return {void} 无
 */
import type { Router, RouteRecordRaw } from 'vue-router'
import { union } from 'lodash-es'
import { resetRouter } from '@/app/router/index'
import { businessRoutes } from '@/app/router/business'
import { notFoundRoute } from '@/app/router/static'
import { useUserStore } from '@/app/stores/user'
import { usePermissionStore } from '@/app/stores/permission'
import { isUserLocked } from '@/app/apis/user'

const WHITE_LIST: string[] = ['/login', '/lock', '/password', '/reset'] // 白名单，无需登录即可访问的路由

/**
 * 路由守卫
 * @param router 路由实例
 */
export default function setupRouterGuard(router: Router) {
  router.beforeEach(async (to) => {
    const userStore = useUserStore()
    const permissionStore = usePermissionStore()
    const token = userStore.token
    
    // 1.无token，且不在白名单，跳转到登录页
    if (!token) {
      return WHITE_LIST.includes(to.path) ? true : `/login?redirect=${to.fullPath}`
    }

    // 2.无动态路由，尝试初始化动态路由
    if (!permissionStore.hasAuthRoutes) {
      try {
        // 获取用户信息(权限)
        const userInfo = await userStore.getUserInfo()
        const routes = (userInfo.routes as string[]) || []
        const buttons = (userInfo.buttons as string[]) || []
        const authList = union(routes, buttons)
        // 初始化动态路由
        const authRoutes = await permissionStore.init(businessRoutes, authList)
        resetRouter()
        authRoutes?.forEach((route: RouteRecordRaw) => {
          router.addRoute(route)
        })
        router.addRoute(notFoundRoute)
        return { ...to, replace: true }
      } catch {
        await userStore.logout()
        return `/login?redirect=${to.fullPath}`
      }
    }

    // 3.已登录，禁止返回登录页
    if (to.path === '/login') {
      return '/'
    }

    const { data: res } = await isUserLocked()
    if (res?.r === 1002 && to.path !== '/lock') {
      return '/lock'
    }
    
    return true
  })
}