<template>
  <vxe-basic-dlg-comp
    ref="dlgRef"
    title="消息通知设置"
    dlg-class-name="msg-notice-dlg"
    :width="520"
    :is-loading="loading"
    :on-confirm="handleSubmit"
    @show="handleShow"
    @hide="handleHide"
  >
    <p class="text-[#909399] text-13 leading-[26px] mb-[13px]" v-text="descText" />
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      hide-required-asterisk
    >
      <el-form-item label="Email地址" prop="email">
        <el-input
          ref="emailInput"
          v-model="form.email"
          placeholder="用于接收通知消息和找回密码"
        />
      </el-form-item>
      <el-checkbox
        v-if="isAdmin"
        v-model="noNotice"
        class="mb-[10px] ml-[100px]"
      >
        未填写Email地址时，不再提醒
      </el-checkbox>
      <el-form-item v-if="false" label="手机号码" prop="phone">
        <el-input
          v-model="form.phone"
          placeholder="用于接收通知消息"
        />
      </el-form-item>
      <!-- 企业微信（暂未启用）
      <el-form-item label="企业微信" prop="vxChat">
        <el-input
          v-model="form.vxChat"
          placeholder="用于接收通知消息，多个用逗号分隔"
        />
      </el-form-item>
      -->
    </el-form>
  </vxe-basic-dlg-comp>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import VxeBasicDlgComp from '@/app/components/VxeBasicDlgComp.vue'
import { getNotifySetting, saveNotifySetting, type NotifySetting } from '@/app/apis/user'
import { regex, checkPhone } from '@/app/core/tools'
import { Base64 } from 'js-base64'
import { useUserStore } from '@/app/stores/user'

const userStore = useUserStore()
const dlgRef = ref()
const formRef = ref<FormInstance>()
const emailInput = ref()
const loading = ref(false)
const noNotice = ref(false)

/* 判断是否为管理员（role 不包含 Normal 时为管理员） */
const isAdmin = computed(() => {
  const role = String(userStore.userInfor?.role || '')
  return !role.includes('Normal')
})

/* 描述文字 */
const descText = computed(() => {
  return isAdmin.value
    ? '请务必填写Email地址，用于管理员密码忘记时，紧急找回密码。如果有配置消息发送设置以及勾选发送的事件范围，在此填写了正确的邮箱地址/手机号，则会收到相应的消息通知。'
    : '如果管理员有配置消息发送设置以及勾选发送的事件范围，在此填写了正确的邮箱地址/手机号，则会收到相应的消息通知。'
})

const form = reactive({
  email: '',
  phone: '',
  // vxChat: '' // 企业微信（暂未启用）
})

/* 表单校验规则 */
const rules = reactive<FormRules>({
  email: [
    {
      validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (value && !regex.isEmail(value)) {
          return callback(new Error('请输入正确格式的邮件地址'))
        }
        callback()
      },
      trigger: 'blur'
    }
  ],
  phone: [
    {
      validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (value && !checkPhone(value)) {
          return callback(new Error('请输入正确格式的手机号'))
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
  // vxChat: [...] // 企业微信（暂未启用）
})

/* 获取通知设置 */
const fetchSettings = async () => {
  try {
    const res = await getNotifySetting()
    if (res?.r === 0 && res?.data) {
      form.email = res.data.email || ''
      form.phone = res.data.phone || ''
      // form.vxChat = res.data.vx_chat || '' // 企业微信（暂未启用）
      if (isAdmin.value) {
        noNotice.value = Number(res.data?.no_noti || 0) === 1
      }
    }
  } catch {
    // 获取失败时使用默认值
  }
}

/* 提交保存 */
const handleSubmit = (close: () => void) => {
  nextTick(() => {
    formRef.value?.validate(async (valid: boolean) => {
      if (!valid) return

      loading.value = true
      try {
        const params: NotifySetting = {
          email: form.email ? Base64.encode(form.email) : '',
          phone: form.phone ? Base64.encode(form.phone) : ''
          // vx_chat: form.vxChat // 企业微信（暂未启用）
        }
        if (isAdmin.value) {
          params.no_noti = noNotice.value ? '1' : '0'
        }
        const { data: res } = await saveNotifySetting(params)
        if (Number(res?.r) === 0) {
          ElMessage.success('设置成功')
          close()
        } else {
          ElMessage.error(res?.e || '设置失败')
        }
      } finally {
        loading.value = false
      }
    })
  })
}

/* 打开弹窗 */
const open = async () => {
  loading.value = true
  await fetchSettings()
  loading.value = false
  dlgRef.value?.openDlg(true)
}

/* 弹窗显示回调 */
const handleShow = () => {
  nextTick(() => {
    emailInput.value?.focus()
  })
}

/* 弹窗隐藏回调 */
const handleHide = () => {
  formRef.value?.resetFields()
}

defineExpose({ open })
</script>

<style lang="scss">
.msg-notice-dlg .loading-wrap {
  width: calc(100% - 32px) !important;
  height: calc(100% - 32px) !important;
}
</style>
