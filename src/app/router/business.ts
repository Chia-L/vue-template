import { type RouteRecordRaw } from 'vue-router'

export const businessRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Layout',
    redirect: '/home',
    component: () => import('@/app/views/Layout.vue'),
    children: [
      {
        path: '/home',
        name: 'Home',
        component: () => import('@/app/views/Home.vue'),
        meta: {
          title: '首页',
          icon: 'home',
          hidden: false,
          perms: ['home'],
        }
      },
    ]
  },
]