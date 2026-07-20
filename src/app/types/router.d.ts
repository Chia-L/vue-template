import type { RouteRecordRaw } from 'vue-router'

// 侧菜单分组
export interface SideGroup {
  icon?: string, // 侧菜单分组图标
  name: string,  // 侧菜单分组 key
  title: string, // 侧菜单分组标题
  isSubGroup?: boolean, // 是否为子分组，默认 false
  children?: Array<RouteRecordRaw | SideGroup> // 侧菜单分组下的路由配置
}

declare module 'vue-router' {
  // 拓展路由元数据
  interface RouteMeta {
    // 基础配置
    title: string, // 路由标题
    icon?: string, // 路由图标

    // 导航配置
    hidden?: boolean, // 是否在菜单中隐藏
    standalone?: boolean, // 是否为独立页面(不参与菜单、全屏占满Layout)
    topNav?: string, // 顶部菜单一级菜单 key 例如: 'System'
    sideGroup?: SideGroup[], // 侧菜单分组, 顶部菜单路由配置
    sideGroupKey?: string, // 侧菜单分组 key，对应 sideGroup 中的 name, 例如: 'User'
    showSide?: boolean, // 是否在侧菜单中显示
    activeMenu?: string, // 高亮指定菜单(路由不显示但需要高亮时使用), 例如: '/System/User'
    affix?: boolean, // 固定在顶部
    sort?: number, // 路由排序权重

    // 权限配置
    roles?: string[], // 路由角色权限
    perms?: string[], // 按钮/接口权限标识，例如: ['system:user:list']

    // 页面配置
    keepAlive?: boolean, // 是否缓存页面
    noCache?: boolean, // 是否不缓存页面
    target?: '_self' | '_blank' | '_parent' | '_top', // 页面打开方式, 例如: '_blank'
    isLink?: boolean, // 是否为链接路由

    // 视觉配置
    badge?: number, // 菜单徽章数字
    noTagsView?: boolean, // 是否不显示标签页
    transition?: string, // 页面过渡动画, 例如: 'fade-in', 'fade-out'
  }
}