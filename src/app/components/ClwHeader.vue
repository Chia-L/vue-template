<template>
  <div class="clw-header">
    <div class="header-left">
      <img
        :src="$appConfig.app.logo || ''"
        height="26"
        alt="Logo"
        class="header-logo"
      >
      <span class="header-title">{{ $appConfig.app.name }}</span>
      <div class="header-menu">
        <router-link
          v-for="menu in (menus.topNav || []) as RouteRecordRaw[]"
          :key="menu.name"
          :to="menu.path"
          class="menu-item"
          :class="{ 'is-active': activeNav === menu.name }"
        >
          {{ menu?.meta?.title || '' }}
        </router-link>
      </div>
    </div>
    <div class="header-right">
      <slot name="header-right">
        <div class="clw-language flex items-center">
          <el-select v-model="selectedLang" placeholder="选择语言">
            <el-option
              v-for="item in langOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value" />
          </el-select>
        </div>
      
        <el-popover
          trigger="click"
          placement="bottom-start"
          popper-class="user-dropdown-popover"
          :width="280"
          :teleported="true"
          :show-arrow="false"
          :visible="userPopoverVisible"
          @update:visible="userPopoverVisible = $event"
        >
          <template #reference>
            <span class="user-info">
              <i class="iconfont i-personal-center" />
              <span class="username">{{ displayName }}</span>
            </span>
          </template>
          <!-- 深色下拉面板 -->
          <div>
            <!-- 用户信息区 -->
            <div class="flex items-center h-[65px] my-[9px] pl-[16px]">
              <img :src="userIcon" alt="" class="w-[40px] h-[40px] rounded-full mr-[15px] flex-none">
              <div class="flex flex-col justify-center w-full gap-[4px]">
                <div class="flex items-center justify-between leading-[21px]">
                  <span class="text-white text-14 truncate" v-text="displayName" />
                  <span
class="flex-none mr-[16px] text-[11px] text-[#a0a4a5] border border-solid border-[#a0a4a5] 
                  px-[4px] rounded leading-normal">显示名称</span>
                </div>
                <div class="flex items-center justify-between leading-[21px]">
                  <span class="text-white text-12 truncate" v-text="accountName" />
                  <span
class="flex-none mr-[16px] text-[11px] text-[#a0a4a5] border border-solid border-[#a0a4a5] 
                  px-[4px] rounded leading-normal">登录账号</span>
                </div>
              </div>
            </div>
            <!-- 菜单项 -->
            <template v-for="item in dropdownMenus" :key="item.key">
              <div v-if="item.divider" class="w-full border-b border-solid border-b-[#494f50] my-[10px]" />
              <div
                class="flex items-center h-[36px] leading-[36px] text-white text-14 cursor-pointer mb-[10px] 
                hover:bg-[#334346]"
                :class="item.className"
                @click="item.handler"
              >
                <img :src="item.icon" alt="" class="w-[16px] h-[16px] mx-[26px] flex-none">
                <span>{{ item.label }}</span>
              </div>
            </template>
          </div>
        </el-popover>
        <span class="server-time" v-text="'服务器时间：' + remoteTimeStore.serverTime" />
      </slot>
    </div>
    <template v-if="!isShowHeaderUser">
      <!-- 弹窗组件（Layout 层级） -->
      <edit-pass-pwd ref="editPassWdDlg" @re-login="closePopover" />
      <notify-setting-dialog ref="notifySettingRef" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, useSlots } from 'vue'
import { useUserStore } from '@/app/stores/user'
import type { RouteRecordRaw } from 'vue-router'
import type { SideGroup } from '@/app/types/router.d'
import type { Menu } from '@/app/stores/permission'
import type { SidebarChangeParams } from '@/app/types/layout'
import EditPassPwd from '@/app/views/layout/EditPassPwd.vue'
import NotifySettingDialog from '@/app/views/layout/NotifySettingDialog.vue'
import { useRoute, useRouter } from 'vue-router'
import { lockSession, isUserLocked, getNotifySetting } from '@/app/apis/user'
import { useRemoteTimeStore } from '@/app/stores/remote-time'
import { useI18n } from 'vue-i18n'
const { locale } = useI18n();

interface HeaderPropsType {
  menus?: Menu,
  activeNav?: string
}

interface DropdownMenuItem {
  key: string
  icon: string
  label: string
  handler: () => void
  divider?: boolean
  className?: string
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const remoteTimeStore = useRemoteTimeStore()
const props = withDefaults(defineProps<HeaderPropsType>(), {
  menus: () => ({
    topNav: []
  }),
  activeNav: ''
})
const emit = defineEmits<{
  (e: 'update:activeNav', activeNav: string): void
  (e: 'sidebar-change', params: SidebarChangeParams): void
}>()
const slots = useSlots()
const isShowHeaderUser = computed(() => !!slots['header-right'])

// 告警信息
/* const notifyRef = ref<InstanceType<typeof ClwNotify>>()
const eventNum = ref(0) */

/* 处理告警信息点击事件 */
/* const handleNoticeClick = () => {
  notifyRef.value?.open()
} */

/* 处理告警信息数量变化事件 */
/* const handleEventNumChange = (num: number) => {
  eventNum.value = num
} */

// 任务
/* const taskDrawerRef = ref<InstanceType<typeof TaskDrawer>>()
const taskNum = ref(0) */

/* 处理任务点击事件 */
/* const handleTaskClick = () => {
  taskDrawerRef.value?.open()
} */

/* 处理任务数量变化事件 */
/* const handleTaskNumChange = (num: number) => {
  taskNum.value = num
} */

const activeMenu = ref('')
const defaultOpeneds = ref<string[]>([])
const showSidebar = ref<boolean>(false)
const selectedLang = ref(localStorage.getItem('app_language') || 'zh-cn')
const langOptions = ref([
  { value: 'zh-cn', label: '中文' },
  { value: 'en', label: '英文' }
])

watch(selectedLang, (newVal: string) => {
  locale.value = newVal
  localStorage.setItem('app_language', newVal)
})

// 用户下拉面板
const userPopoverVisible = ref(false)
const displayName = computed(() => {
  return userStore.userInfor?.name || ''
})
const userIcon = new URL('@/assets/images/user.svg', import.meta.url).toString()
const accountName = computed(() => userStore.userInfor?.user || userStore.userInfor?.account || '')
const changePasswordIcon = new URL('@/assets/images/change_password.svg', import.meta.url).toString()
const notifySettingIcon = new URL('@/assets/images/msg-notify-setting.svg', import.meta.url).toString()
const sessionLockIcon = new URL('@/assets/images/session-lock.svg', import.meta.url).toString()
const logoutIcon = new URL('@/assets/images/logout.svg', import.meta.url).toString()
const editPassWdDlg = ref<InstanceType<typeof EditPassPwd>>()
const notifySettingRef = ref<InstanceType<typeof NotifySettingDialog>>()
const dropdownMenus: DropdownMenuItem[] = [
  { key: 'change-password', icon: changePasswordIcon, label: '更改密码', divider: true, handler: () => { closePopover(); editPassWdDlg.value?.openDlg(true, true) } },
  { key: 'notify-setting', icon: notifySettingIcon, label: '消息通知设置', handler: () => { closePopover(); notifySettingRef.value?.open() } },
  { key: 'session-lock', icon: sessionLockIcon, label: '会话锁定', divider: true, handler: () => {
    closePopover()
    isUserLocked().then(({ data: checkRes }) => {
      if (checkRes?.r === 1002) {
        ElMessage.warning(checkRes.data || '该账户会话被锁定')
        return
      }
      lockSession({ router: route.path }).then(({ data: res }) => {
        if (res?.r === 0) {
          router.push('/lock')
        } else {
          ElMessage.error(res?.e || '会话锁定失败')
        }
      })
    })
  } },
  { key: 'logout', icon: logoutIcon, label: '注销登录', className: '!mb-[8px]', handler: () => { closePopover(); userStore.logout().then(() => router.push('/login')) } }
]
const serverTime = ref('')

/* 判断是否为子菜单 */
const isSideGroup = (data: RouteRecordRaw|SideGroup): data is SideGroup => 'isSubGroup' in data

/* 更新当前激活导航栏 */
const updateActiveNav = (name: string) => {
  emit('update:activeNav', name)
}

/* 更新侧边栏状态 */
const updateSidebar = () => {
  emit('sidebar-change', {
    activeMenu: activeMenu.value,
    showSide: showSidebar.value,
    defaultOpeneds: defaultOpeneds.value
  })
}



/**
 * 切换顶部导航栏
 * 1. 切换到指定导航栏
 * 2. 切换到指定导航栏的默认选中项
 * 3. 切换到指定导航栏的默认展开项
 * */
const toggleTopNav = (name: string, showSide: boolean, menu?: RouteRecordRaw) => {
  updateActiveNav(name)
  // 优先使用路由 meta.activeMenu（用于 hidden 路由高亮对应的可见菜单项）
  let metaActiveMenu = route.meta?.activeMenu as string | undefined
  // sharePage 根据 query.type 动态确定高亮菜单项
  if (route.path === '/stgsvc/sharePage') {
    const shareType = route.query.type
    metaActiveMenu = shareType === 'NFS' ? '/stgsvc/nfs-share' : '/stgsvc/smb-share'
  }
  const sidePath: string = metaActiveMenu
    || (route.path.includes(menu?.path || '')
    ? route.path as string
    : (menu?.redirect || '') as string)
  activeMenu.value = showSide ? sidePath : ''
  if (showSide) {
    const sideList: Array<RouteRecordRaw|SideGroup> = props.menus?.[name] || []
    defaultOpeneds.value = 
      sideList
        ?.filter((item: RouteRecordRaw|SideGroup) => isSideGroup(item) && item?.isSubGroup)
        ?.map((item) => String(item?.name || '')) || []
  }
  showSidebar.value = showSide
  updateSidebar()
}

const closePopover = () => { userPopoverVisible.value = false }

const notifyNoEmail = async () => {
  try {
    const res = await getNotifySetting()
    const home = route.path?.includes('/home')
    const success = res?.r === 0
    const email = res?.data?.email || ''
    const notify = res?.data?.no_noti == '0'
    const admin = userStore.userInfor?.role === 'Super-Admin'
    if (success && !email && notify && admin && home) {
      notifySettingRef.value?.open()
    }
  } catch { 
    // 故意忽略异常
  }
}

/* 更新服务器时间 */
const updateServerTime = () => {
  const now = new Date()
  serverTime.value = now.toLocaleString('zh-CN')
}


/*
 * 初始化顶部导航栏
 * 1. 根据当前路由，找到对应的导航栏
 * 2. 切换到该导航栏
 * 3. 更新服务器时间
 */
const init = () => {
  if (route.meta.standalone) {
    updateActiveNav('')
    showSidebar.value = false
    updateSidebar()
    updateServerTime()
    return
  }
  const basePath = route.path.match(/^\/([^/]+)/)?.[0] || ''
  const topNavList = (props.menus?.topNav || []) as RouteRecordRaw[]
  const curNav = topNavList.find((item: RouteRecordRaw) => item.path === basePath)
  
  toggleTopNav(String(curNav?.name || ''), curNav?.meta?.showSide || false, curNav)
  updateServerTime()
}

// 组件挂载时立即执行一次
watch(() => route.path, () => {
  init()
}, { immediate: true })

onMounted(() => {
  if (!isShowHeaderUser.value) {
    notifyNoEmail()
    remoteTimeStore.fixRemoteTime()
  }
})

onUnmounted(() => {
  remoteTimeStore.clearTimer()
})
</script>
<style scoped lang="scss">
// 顶部-导航栏
.clw-header {
  @apply flex items-center text-[14px] text-[#ffffff] w-full;

  flex: 0 0 $topbar-height;
  height: $topbar-height;
  background: $topbar-bg-color;
  padding: 0 $padding-x;

  // 顶部-导航栏-左侧
  .header-left {
    @apply flex flex-1 items-center;

    // 顶部-导航栏-左侧-元素间距
    &>*+* {
      margin-left: $spacing-mini;
    }

    // 顶部-导航栏-左侧-标题
    .header-title {
      @apply font-bold text-16 break-keep;
    }

    .header-menu {
      @apply flex ml-16;

      height: $topbar-height;

      .menu-item {
        @apply px-[20px] py-[5px] box-border cursor-pointer border-b-[2px] border-b-[transparent];
        @apply hover:bg-[#272c31] hover:font-[600] hover:border-b-[#17a3ba];

        line-height: calc($topbar-height - 10px);
      }

      .is-active {
        @apply bg-[#272c31] font-[600] border-b-[#17a3ba];
      }
    }
  }

  .header-right {
    @apply flex w-auto items-center box-border leading-[22px];

    padding-left: $spacing-base;

    &>*:not(:last-child)::after {
      content: '';

      @apply inline-block h-[18px] mx-[8px] border-l-[1px] border-[#ffffff];
    }

    .clw-language {
      @apply w-[90px] h-[22px];

      :deep(.el-select__wrapper) {
        min-height: 22px;
        line-height: 22px;
        padding: 0;
        background-color: transparent;
        box-shadow: none;

        .el-select__selected-item,
        .el-select__caret {
          color: #fff;
        }
      }
    }
  }

  // 用户信息触发器
  .user-info {
    @apply flex items-center gap-[5px] cursor-pointer text-[#e8eaec] text-14 select-none;
  }
}
</style>
<style lang="scss">
.user-dropdown-popover {
  margin-top: -1px !important;
  padding: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  background-color: #1C2E32 !important;
  box-shadow: 3px 2px 2px rgb(0 0 0 / 10%) !important;
}
</style>
