<template>
  <vxe-drawer
    v-model="visible"
    :title="title"
    :width="width"
    :show-footer="showFooter"
    :show-close="showClose"
    :mask-closable="maskClosable"
    :destroy-on-close="destroyOnClose"
    :class-name="'clw-drawer ' + className"
    v-bind="$attrs"
    @close="close"
  >
    <slot />
    <template v-if="showFooter" #footer>
      <slot name="footer">
        <div class="flex justify-end">
          <el-button type="primary" @click="onConfirm(close, dataRef)">
            确认
          </el-button>
          <el-button plain @click="onCancel(close, dataRef)">
            取消
          </el-button> 
        </div>
      </slot>
    </template>
  </vxe-drawer>
</template>

<script setup lang="ts">
import { ref} from 'vue'

interface DrawerProps {
  title?: string
  width?: string | number
  showClose?: boolean
  maskClosable?: boolean
  destroyOnClose?: boolean
  className?: string
  showFooter?: boolean
  onConfirm?: (close: () => void, data: Record<string, unknown>) => void
  onCancel?: (close: () => void, data: Record<string, unknown>) => void
}
withDefaults(defineProps<DrawerProps>(), {
  title: '消息提示',
  width: '500px',
  showClose: true,
  maskClosable: true,
  destroyOnClose: false,
  className: '',
  showFooter: true,
  onConfirm: ((close: () => void) => close()),
  onCancel: ((close: () => void) => close()),
})

defineEmits(['confirm'])
const visible = ref(false)
const dataRef = ref({})

function close() {
  visible.value = false
}
// 打开抽屉
function open(parmas: Record<string, unknown>) {
  dataRef.value = parmas
  visible.value = true
}
const changeVisible = (flag: boolean) => {
  visible.value = flag
}

defineExpose({
  open,
  changeVisible
})
</script>

<style lang="scss">
.clw-drawer {
  .vxe-drawer--footer {
    padding: 16px;
    border-top: 1px solid #eaeaea;
  }

  .vxe-drawer--header-title {
    padding: 16px 0 16px 16px;
  }

  .vxe-drawer--header-right {
    padding: 16px 16px 16px 0;
  }

  &.vxe-drawer--wrapper.is--padding .vxe-drawer--body-default {
    padding: 0;

    .vxe-drawer--content {
      padding: 16px;
    }
  }
}
</style>
