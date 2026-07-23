<template>
  <vxe-modal
    ref="modalRef"
    v-model="visible"
    :width="width"
    :height="height"
    transfer
    :class-name="'clw-model ' + dlgClassName"
    show-footer
    v-bind="$attrs"
    @show="show"
    @hide="hide"
    @close="handleClose(close, params.data)"
  >
    <template #title>
      <slot name="title">
        <span class="span-title">{{ title }}</span>
      </slot>
    </template>
    <template v-if="isUseHeaderSlot" #header>
      <slot name="header" />
    </template>
    <template #default>
      <el-scrollbar
        v-if="scrollable"
        v-loading="isLoading"
        class="clw-model-content w-full h-full p-16 box-border"
        :element-loading-text="loadingText"
      >
        <slot name="default" />
      </el-scrollbar>
      <div
        v-else
        v-loading="isLoading"
        class="clw-model-content"
        :element-loading-text="loadingText"
      >
        <slot name="default" />
      </div>
    </template>
    <template #footer>
      <slot name="footer">
        <div class="w-full flex justify-between items-center">
          <div
            class="flex-1 text-red-500 text-left"
            v-text="errorMsg"
          />
          <div class="flex">
            <slot name="footer-right" />
            <el-button
              type="primary"
              :disabled="isLoading || isDisabled"
              @click="onConfirm(close, params.data)"
            >
              {{ enter }}
            </el-button>
            <el-button
              v-show="showCancel"
              plain
              @click="onCancel(close, params.data)"
            >
              {{ cancelText }}
            </el-button>
          </div>
        </div>
      </slot>
    </template>
  </vxe-modal>
</template>

<script setup lang="ts">
import { ref, reactive, watchEffect } from 'vue'
import { VxeModal, type VxeModalProps } from 'vxe-pc-ui'

interface DialogParams {
  data: Record<string, unknown>
}

interface DialogProps {
  width?: number | string
  height?: number | string
  dlgClassName?: string
  title?: string
  isLoading?: boolean
  loadingText?: string
  errorMsg?: string
  enter?: string
  cancelText?: string
  showCancel?: boolean
  form?: Record<string, unknown>
  isDisabled?: boolean
  isUseHeaderSlot?: boolean
  scrollable?: boolean
  typeFrom?: string
  onConfirm?: (close: () => void, data: Record<string, unknown>) => void
  onCancel?: (close: () => void, data: Record<string, unknown>) => void
}

const emit = defineEmits<{
  (e: 'show'): void
  (e: 'hide'): void
  (e: 'handleClose', close: () => void, param: Record<string, unknown>): void
}>()

const props = withDefaults(defineProps<DialogProps>(), {
  width: 600,
  height: 'auto',
  dlgClassName: '',
  title: '消息提示',
  isLoading: false,
  loadingText: '',
  errorMsg: '',
  enter: '确定',
  cancelText: '取消',
  showCancel: true,
  scrollable: true,
  form: () => ({}),
  isDisabled: false,
  isUseHeaderSlot: false,
  typeFrom: '',
  onConfirm: ((close: () => void) => close()),
  onCancel: ((close: () => void) => close())
})

const modalRef = ref<VxeModalProps | null>(null)
const visible = ref(false)
const params = reactive<DialogParams>({
  data: {}
})

watchEffect(() => {
  params.data = Object.assign(params.data, props.form)
})

function openDlg(bool: boolean, param?: Record<string, unknown>) {
  visible.value = bool
  params.data = Object.assign(params.data, param || {})
  return Promise.resolve()
}

function close() {
  visible.value = false
}

function show() {
  emit('show')
}

function hide() {
  emit('hide')
}

function handleClose(closeFn: () => void, param: Record<string, unknown>) {
  emit('handleClose', closeFn, param)
}

defineExpose({
  modalRef,
  params,
  visible,
  openDlg,
  close
})
</script>

<style lang="scss">
.clw-model{
  .vxe-modal--header {
    height: 48px;
  }

  .vxe-modal--footer {
    display: flex;
    padding: 16px;
    border-top: 1px solid #eaeaea;
  }

  .vxe-modal--header-title {
    padding-left: 16px;
  }

  &.vxe-modal--wrapper.is--padding .vxe-modal--body-default {
    padding: 0;
  }

  .clw-model-content {
    .el-scrollbar__view {
      height: 100%;
    }
  }
}
</style>
