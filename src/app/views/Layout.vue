<template>
  <el-container
    class="clw-wrapper flex relative h-screen box-border flex-col flex-nowrap"
    :class="{'has-infobar': showInfoBar}"
  >
    <!-- 顶部-消息栏 -->
    <div
      v-show="showInfoBar"
      class="clw-top-info"
    />
    <!-- Header -->
    <el-header class="!h-[auto] !px-[0]">
      <clw-header
        v-model:active-nav="activeNav"
        :menus="menus"
        @sidebar-change="updateSidebar"
      />
    </el-header>
    <el-container
      class="clw-main-view relative z-[1]"
      :class="{'has-sidebar': showSidebar}"
    >
      <!-- Sidebar -->
      <el-aside
        v-show="showSidebar"
        class="clw-sidebar absolute top-0 left-0 h-full text-[#f2f2f2] z-[1]"
      >
        <el-menu
          :key="activeNav"
          :default-active="activeMenu"
          :default-openeds="defaultOpeneds"
          class="sidebar-menu"
          router
        >
          <template
            v-for="menu in (menus?.[activeNav] || []) as Array<RouteRecordRaw | SideGroup>"
            :key="menu.name"
          >
            <el-sub-menu
              v-if="'isSubGroup' in menu && menu.isSubGroup"
              class="sidebar-sub-menu"
              :index="menu.name"
            >
              <template #title>
                <i class="iconfont secondary-menu-icon" :class="('icon' in menu ? menu.icon : '')" />
                <span>{{ ('title' in menu ? menu.title : '') || '' }}</span>
              </template>
              <el-menu-item
                v-for="item in (menu.children || []) as RouteRecordRaw[]"
                :key="item.name"
                class="sidebar-menu-item"
                :index="item.path"
              >
                <el-icon><component :is="item.meta?.icon" /></el-icon>
                <span>{{ item?.meta?.title || '' }}</span>
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item
              v-else
              class="sidebar-menu-item"
              :index="('path' in menu ? menu.path : '') as string"
            >
              <span>{{ ('meta' in menu ? menu.meta?.title : '') || '' }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-aside>

      <!-- Main Content -->
      <el-main
        class="clw-main"
      >
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import ClwHeader from '@/app/components/ClwHeader.vue'
import { usePermissionStore } from '@/app/stores/permission'
import type { SidebarChangeParams } from '@/app/types/layout'
import type { SideGroup } from '@/app/types/router.d'

const permissionStore = usePermissionStore()
const showInfoBar= ref<boolean>(false)
const showSidebar = ref<boolean>(false)
const activeNav = ref<string>('')
const activeMenu = ref('')
const defaultOpeneds = ref<string[]>([])
const menus = permissionStore.menus

const updateSidebar = (params: SidebarChangeParams) => {
  activeMenu.value = params.activeMenu
  showSidebar.value = params.showSide
  defaultOpeneds.value = params.defaultOpeneds
}
</script>

<style scoped lang="scss">
.clw-wrapper {
  &.has-infobar {
    padding-top: $top-info-bar-height;
  }

  // 顶部-消息栏
  .clw-top-info {
    @apply fixed top-0 left-0 w-full;

    height: $top-info-bar-height;
    z-index: 1000;
  }

  // 主内容区域
  .clw-main-view {
    height: calc(100% - $topbar-height);

    // padding-left 防止切换界面layout回流，影响性能
    &.has-sidebar {
      padding: 0 0 0 $sidebar-width;
    }

    // 侧边栏
    .clw-sidebar {
      width: $sidebar-width;

      //
      .sidebar-menu {
        @apply h-full;

        $sidebar-item-height: 42px;

        // 侧边栏-子菜单
        .sidebar-sub-menu {
          :deep(.el-sub-menu__title) {
            @apply bg-[#E9EBED] text-[15px] hover:bg-[#f1fdff] hover:text-[#17a3ba];

            height: $sidebar-item-height;

            .secondary-menu-icon {
              margin-right: 5px;
              color: #999;
            }
          }

          .el-sub-menu__title:hover {
            .secondary-menu-icon {
              color: #17a3ba;
            }
          }
        }

        // 侧边栏-菜单项
        :deep(.sidebar-menu-item) {
          @apply hover:bg-[#f1fdff] hover:text-[#17a3ba] border-l-[5px] border-[transparent] box-border
            pl-[35px];

          height: $sidebar-item-height;

          i.el-icon {
            @apply w-[0px] mr-[0px];
          }

          &.is-active {
            @apply bg-[#ddf1f5] text-[#17a3ba] border-[#17a3ba];
          }
        }
      }
    }

    .clw-main {
      @apply relative top-0 left-0 w-full h-full flex-1 p-0 z-[1] box-border;
    }
  }
}
</style>