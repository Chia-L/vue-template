import { createRouter, createWebHistory } from 'vue-router'
import { staticRoutes } from '@/app/router/static'
import setupRouterGuard from '@/app/router/guard'



const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: staticRoutes,
  scrollBehavior: () => ({ // 滚动行为，滚动到顶部和左侧
    top: 0,
    left: 0
  })
})

// 路由守卫，用于权限校验和路由跳转
setupRouterGuard(router)

export function resetRouter() {
  router.getRoutes()?.forEach(route => {
    if (!staticRoutes.some((item) => item.path === route.path)) {
      router.removeRoute(route.name!)
    }
  })
}

export default router
