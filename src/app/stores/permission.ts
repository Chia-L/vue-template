import { defineStore } from 'pinia'
import type { RouteRecordRaw } from 'vue-router'
import { isArray, intersection, sortBy } from 'lodash-es'
import type { SideGroup } from '@/app/types/router.d'



// 菜单结构
export interface Menu {
  topNav: RouteRecordRaw[]
  [key: string]: RouteRecordRaw[] | (RouteRecordRaw | SideGroup)[]
}

export const usePermissionStore = defineStore('permission', {
  state: () => ({
    authRoutes: [] as RouteRecordRaw[],
    menus: {} as Menu,
  }),
  getters: {
    hasAuthRoutes: (state): boolean => {
      return state.authRoutes.length > 0
    }
  },
  actions: {
    /**
     * 初始化动态路由
     * @description 初始化动态路由，根据权限列表过滤出有权限的路由
     * @param {RouteRecordRaw[]} dyncRoutes 动态路由配置
     * @param {string[]} authList 权限列表
     * @return {RouteRecordRaw[]} 过滤后的动态路由配置
     */
    init(dyncRoutes: RouteRecordRaw[], authList: string[]) {
      this.authRoutes = this.setupAuthRoutes(dyncRoutes, authList)
      this.menus = this.setupMenus(this.authRoutes)
      return this.authRoutes
    },
    /**
     * 重置动态路由
     * @description 重置动态路由，清空所有路由配置
     * @return {void} 无
     */
    reset() {
      this.authRoutes = []
      this.menus = {} as Menu
    },
    /* 
     * 设置动态路由
     * @description 设置动态路由，根据权限列表过滤出有权限的路由
     * @param {RouteRecordRaw[]} dyncRoutes 动态路由配置
     * @param {string[]} authList 权限列表
     * @return {RouteRecordRaw[]} 过滤后的动态路由配置
     */
    setupAuthRoutes(dyncRoutes: RouteRecordRaw[], authList: string[]) {
      // 设置动态路由
      // 递归过滤路由，保留有权限的路由

      // 开发模式放开路由限制
      return dyncRoutes
      const filterRoutes = (routes: RouteRecordRaw[], permissions: string[]): RouteRecordRaw[] => {
        return routes.filter(route => {
          // 检查当前路由是否有权限
          const hasPermission = (perms: string[] | undefined): boolean => {
            if (!perms || perms.length === 0) return true
            return intersection(perms, permissions).length > 0
          }
          
          // 如果有子路由，递归检查子路由
          if (isArray(route.children) && route.children.length > 0) {
            const filteredChildren: RouteRecordRaw[] = filterRoutes(route.children, permissions)
            // 如果子路由过滤后还有剩余，或者当前路由本身有权限，则保留
            if (filteredChildren.length > 0) {
              route.children = filteredChildren
              if (route.redirect) {
                route.redirect = filteredChildren[0]?.path || ''
              }
              return true
            }
            // 子路由都没有权限，当前路由也没有权限
            return false
          }

          return hasPermission(route.meta?.perms)  
        })
      }

      return filterRoutes(dyncRoutes, authList)
    },

    /**
     * 设置菜单
     * @description 设置菜单，根据动态路由配置生成菜单结构
     * @param {RouteRecordRaw[]} authRoutes 动态路由配置
     * @return {Menu} 菜单结构
     */
    setupMenus(authRoutes: RouteRecordRaw[]) {
      const menu: Menu = {
        topNav: sortBy(
          (authRoutes?.[0]?.children || []).filter(
            (item) => !item.meta?.standalone
          ),
          'meta?.sort || 0'
        )
      }

      // 遍历顶部路由，根据顶部菜单生成对应侧边栏菜单
      authRoutes?.[0]?.children?.forEach((item: RouteRecordRaw) => {
        if (item.meta?.showSide) {

          const topNavKey = (item.meta?.topNav || item.name || '') as string
          let children: Array<RouteRecordRaw | SideGroup> = []
          
          // 没有sideGroup的项 直接添加到children（过滤hidden:true的路由）
          if (!item.meta?.sideGroup || item.meta?.sideGroup.length === 0) {
            children = (item.children || []).filter((child: RouteRecordRaw) => !child.meta?.hidden)
          } else {
            // 有sideGroup的项，根据sideGroupKey分组
            const sideGroups: SideGroup[] = item.meta?.sideGroup || []
            // 生成sideGroupKey的Map
            const sideGroupKeys = new Map<string, SideGroup>(sideGroups.map(group => [group.name || '', group]))
            // 处理过分组的Map
            const handledGroupMap = new Map<string, Array<RouteRecordRaw | SideGroup>>()

            item.children?.forEach((child: RouteRecordRaw) => {
              // 过滤hidden:true的路由
              if (child.meta?.hidden) return
              
              // 没有sideGroupKey的项（包括sideGroupKey在sideGroupKeys不存在）,直接添加到children
              if (!child.meta?.sideGroupKey || !sideGroupKeys.has(child.meta?.sideGroupKey)) {
                children.push(child)
              } else {
                // 有sideGroupKey的项，根据sideGroupKey分组
                if(!handledGroupMap.has(child.meta?.sideGroupKey)){
                  const sideGroupKey = child.meta?.sideGroupKey || ''
                  handledGroupMap.set(sideGroupKey, [])
                  const sideGroup: SideGroup = sideGroupKeys.get(sideGroupKey)!
                  sideGroup.children = handledGroupMap.get(sideGroupKey) || []
                  // 利用地址引用，将sideGroup同下属路由添加到children中
                  children.push(sideGroup)  
                }
                handledGroupMap.get(child.meta?.sideGroupKey || '')?.push(child)
              }
            })
          }

          menu[topNavKey] = children
        }
      })

      return menu
    }
  }
})