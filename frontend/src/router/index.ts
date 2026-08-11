import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { clearTokens } from '@/api/request'
import { playPageTurnSound } from '@/utils/editorialSound'

/** 路由元信息 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 需要登录 */
    auth?: boolean
    /** 需要管理员权限 */
    admin?: boolean
    /** 仅游客可访问（如登录页） */
    guest?: boolean
    /** 页面标题 */
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { guest: true, title: '登录' }
  },
  {
    path: '/',
    redirect: '/equipment'
  },
  {
    path: '/equipment',
    name: 'EquipmentList',
    component: () => import('@/views/EquipmentList.vue'),
    meta: { auth: true, title: '器材列表' }
  },
  {
    path: '/borrow',
    name: 'BorrowForm',
    component: () => import('@/views/BorrowForm.vue'),
    meta: { auth: true, title: '申请借用' }
  },
  {
    path: '/overview',
    name: 'BorrowOverview',
    component: () => import('@/views/BorrowOverview.vue'),
    meta: { auth: true, title: '我的借用' }
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('@/views/Calendar.vue'),
    meta: { auth: true, title: '预约日历' }
  },
  {
    path: '/precautions',
    name: 'Precautions',
    component: () => import('@/views/Precautions.vue'),
    meta: { auth: true, title: '注意事项' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { auth: true, title: '个人中心' }
  },
  {
    path: '/yearbook',
    name: 'Yearbook',
    component: () => import('@/views/Yearbook.vue'),
    meta: { auth: true, title: '借用年鉴' }
  },
  {
    path: '/passport',
    name: 'Passport',
    component: () => import('@/views/Passport.vue'),
    meta: { auth: true, title: '创作护照' }
  },
  {
    path: '/admin/equipment',
    name: 'AdminEquipment',
    component: () => import('@/views/admin/EquipmentManage.vue'),
    meta: { auth: true, admin: true, title: '器材管理' }
  },
  {
    path: '/admin/approval',
    name: 'AdminApproval',
    component: () => import('@/views/admin/Approval.vue'),
    meta: { auth: true, admin: true, title: '申请审批' }
  },
  {
    path: '/admin/return',
    name: 'AdminReturn',
    component: () => import('@/views/admin/ReturnConfirm.vue'),
    meta: { auth: true, admin: true, title: '归还确认' }
  },
  {
    path: '/admin/logs',
    name: 'AdminLogs',
    component: () => import('@/views/admin/Logs.vue'),
    meta: { auth: true, admin: true, title: '操作日志' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

/** 全局前置守卫：登录态 + 管理员权限校验 */
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  // 设置标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 器材设备管理系统`
  } else {
    document.title = '器材设备管理系统'
  }

  // 登录页：清除旧的无效 token，避免残留
  if (to.meta.guest) {
    clearTokens()
    authStore.user = null
    next()
    return
  }

  const isLoggedIn = authStore.isLoggedIn

  // 已登录但还没拉取用户信息
  if (isLoggedIn && !authStore.user) {
    try {
      await authStore.fetchUser()
    } catch {
      // 拉取失败：清除 token，跳登录页
      clearTokens()
      authStore.user = null
      if (to.meta.auth) {
        next({ name: 'Login', query: { redirect: to.fullPath } })
        return
      }
    }
  }

  // 需要登录
  if (to.meta.auth && !authStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  // 需要管理员
  if (to.meta.admin && !authStore.isAdmin) {
    next({ name: 'EquipmentList' })
    return
  }

  // 游客页（登录页）且已登录 → 跳首页
  if (to.meta.guest && authStore.isLoggedIn) {
    next({ name: 'EquipmentList' })
    return
  }

  next()
})

router.afterEach((to, from) => {
  if (from.name && to.fullPath !== from.fullPath) playPageTurnSound()
})

export default router
