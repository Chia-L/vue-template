<template>
  <vxe-basic-dlg-comp
    ref="editPassWdDlg"
    :title="'修改密码'"
    :width="480"
    :is-loading="loading"
    :on-confirm="runEditPasswd"
    dlg-class-name="edit-pass-wd-dlg"
    @show="show"
    @hide="hide"
  >
    <p
      class="text-cap text-12 leading-[22px] mb-[10px]"
      v-text="policyDesc"
    />
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
      hide-required-asterisk
      @keydown.enter.stop="onEnterSubmit"
    >
      <el-form-item v-if="noPwd === '0'" label="旧密码" prop="oldPassword">
        <el-input
          ref="oldPwdInput"
          v-model="form.oldPassword"
          type="password"
          show-password
          placeholder="请输入旧密码"
        />
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input
          ref="newPwdInput"
          v-model="form.newPassword"
          type="password"
          show-password
          placeholder="请输入新密码"
        />
      </el-form-item>
      <el-form-item label="重复新密码" prop="confirmPassword">
        <el-input
          v-model="form.confirmPassword"
          type="password"
          show-password
          placeholder="请再次输入新密码"
        />
      </el-form-item>
    </el-form>
  </vxe-basic-dlg-comp>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import VxeBasicDlgComp from '@/app/components/VxeBasicDlgComp.vue'
import { getPwdPolicy, editPassWd, type EditPassWdParams } from '@/app/apis/user'
import { rsaEncrypt } from '@/app/core/encrypt'
import { checkerPassWd } from '@/app/core/tools'

const editPassWdDlg = ref()
const formRef = ref<FormInstance>()
const oldPwdInput = ref()
const newPwdInput = ref()

const loading = ref(false)
const policy = ref('low')
const pwdLen = ref<number | string>(1)

const props = withDefaults(defineProps<{
  noPwd?: string
}>(), {
  noPwd: '0'
})

const emit = defineEmits<{
  (e: 'reLogin', flag: boolean): void
}>()

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

/* 密码策略描述文字 */
const policyDesc = computed(() => {
  const len = String(pwdLen.value)
  if (policy.value === 'centre') {
    return `密码中至少包括英文大写字母（A到Z），英文小写字母（a到z），10 个基本数字（0到9）和非字母字符（如：~!@#等）中的三种，且密码长度为${len}-32个字符`
  }
  if (policy.value === 'high') {
    return `密码强必须包括英文大写字母（A到Z），英文小写字母（a到z），10 个基本数字（0到9）和非字母字符（如：~!@#等），且密码长度为${len}-32个字符`
  }
  return `密码字符类型不限定，密码长度为${len}-32个字符`
})

/* 表单校验规则 */
const rules = reactive<FormRules>({
  oldPassword: [
    { required: true, message: '请输入旧密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (props.noPwd === '0' && value === form.oldPassword) {
          return callback(new Error('新密码不能与旧密码相同'))
        }
        checkerPassWd(value, callback, policy.value, pwdLen.value)
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (form.newPassword && value !== form.newPassword) {
          return callback(new Error('两次输入不相同，请重新输入'))
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
})

/* 获取密码策略 */
const fetchPolicy = async () => {
  try {
    const res = await getPwdPolicy()
    if (res?.r === 0) {
      policy.value = res?.data?.policy || 'low'
      pwdLen.value = res?.data?.pwd_length || 1
    }
  } catch {
    // 策略获取失败时使用默认值
  }
}

/* 打开弹窗 */
const openDlg = async (open: boolean, needPwdPolicy?: boolean) => {
  if (needPwdPolicy) {
    loading.value = true
    await fetchPolicy()
    loading.value = false
  }
  editPassWdDlg.value?.openDlg(open)
}

/* 弹窗显示回调 */
const show = () => {
  nextTick(() => {
    const target = props.noPwd === '0' ? oldPwdInput.value : newPwdInput.value
    target?.focus()
  })
}

/* 弹窗隐藏回调 */
const hide = () => {
  formRef.value?.resetFields()
}

/* 核心提交逻辑 */
const doSubmit = async (onSuccess: () => void) => {
  loading.value = true
  try {
    const params: EditPassWdParams = {
      new_encrypt_password: rsaEncrypt(form.newPassword) || '',
      init_flag: props.noPwd
    }
    if (props.noPwd === '0') {
      params.old_encrypt_password = rsaEncrypt(form.oldPassword) || ''
    }
    const res = await editPassWd(params)
    if (Number(res?.r) === 0) {
      onSuccess()
      emit('reLogin', true)
    } else {
      ElMessage.error(res?.e || '密码修改失败')
    }
  } finally {
    loading.value = false
    form.newPassword = ''
    form.confirmPassword = ''
  }
}

/* 回车提交 */
const onEnterSubmit = () => {
  formRef.value?.validate(async (valid: boolean) => {
    if (!valid) return
    await doSubmit(() => editPassWdDlg.value?.close())
  })
}

/* 点击确定按钮提交 */
const runEditPasswd = (close: () => void) => {
  nextTick(() => {
    formRef.value?.validate(async (valid: boolean) => {
      if (!valid) return
      await doSubmit(close)
    })
  })
}

defineExpose({ openDlg })
</script>

<style lang="scss">
.edit-pass-wd-dlg .loading-wrap {
  width: 95% !important;
  height: 90% !important;
}
</style>
