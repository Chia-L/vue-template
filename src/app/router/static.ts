import { type RouteRecordRaw } from 'vue-router'
export const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/app/views/Login.vue'),
    meta: { title: '登录', hidden: true }
  },
  {
    path: '/lock',
    name: 'Lock',
    component: () => import('@/app/views/Lock.vue'),
    meta: { title: '会话锁定', hidden: true }
  },
  {
    path: '/reset',
    name: 'Reset',
    component: () => import('@/app/views/Reset.vue'),
    meta: { title: '密码重置', hidden: true }
   },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/app/views/NotFound.vue'),
  },
]

export const notFoundRoute = {
  path: '/:pathMatch(.*)*',
  name: 'NotFound',
  component: () => import('@/app/views/NotFound.vue'),
  meta: { title: '404', hidden: true }
}