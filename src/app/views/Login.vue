
<template>
  <div class="login-container" :style="{ backgroundImage: `url(${loginBg})` }">
    <div class="login-view">
      <div class="login-view-header">
        <span>
          <i class="iconfont" />
          <span class="">服务支持：400-161-5658</span>
        </span>
        <div>
          <a href="http://www.clerware.com/" target="_blank">关于我们</a>
          <template v-if="false">
            <span class="px-[8px]">|</span>
            <a href="javascript:void(0)">在线帮助</a>
          </template>
        </div>
      </div>
      <div class="flex-1 items-center justify-center flex flex-col pt-[38px]">
        <div class="flex w-[450px]">
          <img :src="logo" alt="logo" class="w-[120px] h-[40px]">
        </div>
        <div class="login-title" v-text="$appConfig.login.title" />
        <div class="h-[60px]" />
        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="rules"
          label-position="top"
          hide-required-asterisk
          class="flex flex-col w-[450px]"
        >
          <el-form-item
            label="用户名"
            prop="username"
            class="form-item"
          >
            <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              :prefix-icon="User"
              :style="{ height: '52px' }"
              autocomplete="username"
            />
          </el-form-item>
          <el-form-item
            label="密码"
            prop="password"
            class="form-item"
          >
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              show-password
              :style="{ height: '52px' }"
              autocomplete="current-password"
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <div class="flex justify-end items-center mt-0 mb-16">
            <a
              href="javascript:void(0)"
              class="text-[#007bff]"
              @click="handleForgetPassword"
            >忘记密码 ？</a>
          </div>
          <el-form-item class="mb-0">
            <el-button
              type="primary"
              class="btn"
              :style="{ height: '52px' }"
              :loading="loading"
              @click="handleLogin"
            >
              登录
            </el-button>
            <!-- UKey 错误提示 -->
            <div
              v-show="ukeyErrorList.length"
              class="ukey-error-mark"
            >
              <div
                v-for="(item, index) in ukeyErrorList"
                :key="index"
              >
                {{ item }}
              </div>
            </div>
            <!-- UKey 授权异常提示 -->
            <div
              v-if="isShowUKeyAuth"
              class="ukey-auth-error-mark"
            >
              授权异常，请联系管理员或转至 <a href="javascript:void(0)">授权界面</a>
            </div>
          </el-form-item>
          <div
            v-show="userInfor"
            class="h-[30px] c-[#ff0000] leading-[30px]"
            v-text="userInfor"
          />
        </el-form>
      </div>
      <div class="copyright-wrap">
        版权所有 © 深圳市科力锐科技有限公司 2026 保留一切权利
      </div>
    </div>
    <!-- 左下角授权到期时间 -->
    <div v-if="false" class="absolute left-8 bottom-6 text-xs text-red-500 select-none z-20">
      授权到期时间：2026-05-20
    </div>
    <clw-model
      ref="clwModelRef"
      :is-loading="isForgotPasswdLoading"
      :on-confirm="handleForgotPasswd"
      :type-from="typeFrom"
      title="忘记密码"
      @hide="handleForgetPasswordHide"
    >
      <el-form
        ref="forgetPwdFrom"
        :model="forgetPwd"
        :rules="forgetPwdRules"
      >
        <el-form-item label="用户名" prop="userName">
          <el-input
            v-model="forgetPwd.userName"
            placeholder="请输入用户名"
            @keyup.enter.stop="handleForgotPasswd"
          />
        </el-form-item>
        <div class="forget-pwd-text">
          <i class="iconfont i-zhushi-kong" />
          <span>将发送重设密码的链接至该账户绑定的邮箱地址，请注意查收。若用户未绑定邮箱，请联系相关管理员重置密码。</span>
        </div>
      </el-form>
    </clw-model>
    <!-- 修改密码弹窗 -->
    <clw-model
      ref="changePwdDlgRef"
      :is-loading="editPassWdLoading"
      :on-confirm="handleChangePasswd"
      title="修改密码"
      width="450px"
      @show="handleEditPasswdShow"
      @hide="handleEditPasswdHide"
    >
      <p
        class="dlg-from-desc"
        v-text="changePwdDesc"
      />
      <el-form
        ref="editPassWdFromRef"
        :model="editPassWdFrom"
        :rules="editPassWdRules"
        label-width="100px"
        hide-required-asterisk
      >
        <el-form-item prop="newPassWd" label="新密码：">
          <el-input
            ref="newPassWdInputRef"
            v-model="editPassWdFrom.newPassWd"
            type="password"
            show-password
            placeholder="请输入新密码"
          />
        </el-form-item>
        <el-form-item prop="repeatNewPassWd" label="重复新密码：">
          <el-input
            v-model="editPassWdFrom.repeatNewPassWd"
            type="password"
            show-password
            placeholder="请再次输入新密码"
            @keyup.enter="handleChangePasswd"
          />
        </el-form-item>
      </el-form>
    </clw-model>
  </div>
</template>


<script setup lang="ts">
import type { Ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { User, Lock } from '@element-plus/icons-vue'
import type { FormItemRule } from 'element-plus';
import type { UserInfo } from '@/app/types/user'
import { Base64 } from 'js-base64'
import httpHelper from '@/app/core/request'
import axios from 'axios'
import { useUserStore } from '@/app/stores/user'
import { forgotPassWd, editPassWd, type EditPassWdParams } from '@/app/apis/user'
import { rsaEncrypt } from '@/app/core/encrypt'
import { checkPassword, checkerPassWd, getToken as getCookieToken, setToken as setCookieToken } from '@/app/core/tools'
import { getUkeySn, initiateUkeyLock, ukeyLock32Function } from '@/app/core/ukey_api'
import ClwModel from '@/app/components/VxeBasicDlgComp.vue'


const router = useRouter()
const userStore = useUserStore()
const APP_CONFIG = (window || globalThis).APP_CONFIG || {}
const loginBg = new URL(APP_CONFIG?.login?.loginBg || '', import.meta.url).href
const logo = new URL(APP_CONFIG?.login?.logo || '', import.meta.url).href
const loginFormRef = ref()
const typeFrom = ref('forgetPassword')
const forgetPwd = reactive({
  userName: ''
})
const loading: Ref<boolean> = ref(false)
const isForgotPasswdLoading: Ref<boolean> = ref(false)


const loginForm = reactive({
  username: '',
  password: ''
})
const userInfor = ref('')
const clwModelRef = ref<InstanceType<typeof ClwModel>>()
const forgetPwdFrom = ref()
// UKey 相关
const ukeyErrorList = ref<string[]>([])
const isShowUKeyAuth = ref(false)
// 修改密码相关
const changePwdDlgRef = ref<InstanceType<typeof ClwModel>>()
const editPassWdFromRef = ref()
const newPassWdInputRef = ref()
const editPassWdLoading = ref(false)
const pwdPolicy = ref('low')
const pwdMinLen = ref<number | string>(1)
const editPassWdFrom = reactive({
  newPassWd: '',
  repeatNewPassWd: ''
})
const toPage = '/'

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}
const userNameChecker:FormItemRule['validator'] = (_rules, value, callback: (error?: Error) => void) => {
  if (!(/^\s*\S{1,32}\s*$/.test(value))) {
    return callback(new Error())
  }
  callback()
}

const forgetPwdRules = {
  userName: [
    { required: true, message: '', trigger: 'blur' },
    { validator: userNameChecker, trigger: 'blur' }
  ]
}

interface ChangePwdData {
  change_flog: number
  policy: string
  pwd_length: number
}

// 判断是否需要强制改密
const needChangePassword = (changePwdData: ChangePwdData, password: string): boolean => {
  if (!changePwdData) return false
  if (!([0, '0'].includes(changePwdData.change_flog))) return true
  const policy = changePwdData.policy || 'low'
  const minLen = changePwdData.pwd_length || 1
  return checkPassword(policy, minLen, password) !== null
}

// 修改密码弹窗描述文字
const changePwdDesc = computed(() => {
  const policy = pwdPolicy.value
  const len = String(pwdMinLen.value)
  if (policy === 'centre') {
    return `密码中至少包括英文大写字母（A到Z），英文小写字母（a到z），10 个基本数字（0到9）和非字母字符（如：~!@#等）中的三种，且密码长度为${len}-32个字符`
  }
  if (policy === 'high') {
    return `密码强必须包括英文大写字母（A到Z），英文小写字母（a到z），10 个基本数字（0到9）和非字母字符（如：~!@#等），且密码长度为${len}-32个字符`
  }
  return '密码字符类型不限定，密码长度为1-32个字符'
})

const editPassWdRules = {
  newPassWd: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      validator: (_rule: FormItemRule, value: string, callback: (error?: Error) => void) => {
        checkerPassWd(value, callback, pwdPolicy.value, pwdMinLen.value)
      },
      trigger: 'blur'
    }
  ],
  repeatNewPassWd: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule: FormItemRule, value: string, callback: (error?: Error) => void) => {
        if (editPassWdFrom.newPassWd && value !== editPassWdFrom.newPassWd) {
          return callback(new Error('两次输入不相同，请重新输入'))
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
}
/*
 * 登录
 * @description 登录（含登录前退出上一会话）
 */
const handleLogin = useDebounceFn(() => {
  if (!loginFormRef.value) return
  loginFormRef.value.validate((valid: boolean) => {
    if (valid) {
      loading.value = true
      // 登录前先退出上一会话（直接用 axios 绕过 http-helper 307 拦截）
      const baseURL = import.meta.env.VITE_API_BASE_URL || ''
      axios.get(baseURL + '/api/account/logout/', {
        xsrfCookieName: 'csrftoken',
        xsrfHeaderName: 'X-CSRFToken'
      }).then(() => {
        runSignIn()
      }).catch(() => {
        runSignIn()
      })
    }
  })
})

/*
 * 执行登录流程
 * @description 获取 Token 后根据 web_ukey 决定普通/UKey 登录路径
 */
const runSignIn = () => {
  const setLoadingFalse = () => { loading.value = false }
  getToken().then((token) => {
    return new Promise<void>((resolve, reject) => {
      const body: Record<string, unknown> = {
        username: Base64.encode(loginForm.username),
        password: rsaEncrypt(loginForm.password, token.salt)
      }
      if (!token.web_ukey) {
        doLogin(body, resolve, reject)
      } else {
        body.salt = token.salt
        body.doLogin = doLogin
        body.reject = reject
        body.resolve = resolve
        body.sn = ''
        getUkeySn(getUkeySnCallback, body).catch(() => {
          setLoadingFalse()
        })
      }
    }).finally(() => {
      setLoadingFalse()
    })
  }).catch(() => {
    setLoadingFalse()
  })
}

/*
 * 获取登录盐值
 * @description 获取登录盐值，返回 salt 和 web_ukey 标识
 */
const getToken = async (): Promise<{ salt: string; web_ukey: boolean }> => {
  const reqData = {
    username: Base64.encode(loginForm.username)
  }

  return httpHelper<Record<string, unknown>>('/api/account/token/', 'post', reqData)
    .then((res) => {
      if (res.r !== 0) {
        if (res?.e?.includes('账户不存在')) {
          userInfor.value = '账户不存在'
        } else {
          ElMessage.error(res.e || '获取登录盐值失败')
        }
        return Promise.reject(res.e)
      }
      userStore.setProperty('signPrefix', (res?.data?.public_key as string) || '')
      userStore.setProperty('globalSignPrefix', (res?.data?.global_public_key as string) || '')
      if (import.meta.env.DEV) {
        setCookieToken((res?.data?.token as string) || '')
      }
      return {
        salt: (res?.data?.salt as string) || '',
        web_ukey: !!(res?.data?.web_ukey as boolean)
      }
    })
}

/*
 * 登录
 * @description 登录，处理 UKeyAuth 异常和强制改密
 */
const doLogin = async (body: Record<string, unknown>, resolve: () => void, reject: () => void) => {
  httpHelper<ChangePwdData & UserInfo>('/api/account/login/', 'post', body).then((res) => {
    if (res?.r !== 0) {
      // 账户锁定
      if (res?.e?.includes('已锁定')) {
        let lockTimeMsg = res?.e?.split('，')?.pop() || ''
        lockTimeMsg = lockTimeMsg?.slice(2, -2)
        if (lockTimeMsg) {
          userInfor.value = `登录已锁定，请于${ lockTimeMsg }后重试`
        }
      }
      // UKey 授权异常
      if (res?.e?.includes('UKeyAuth')) {
        isShowUKeyAuth.value = true
      } else {
        ElMessage({
          type: 'error',
          dangerouslyUseHTMLString: true,
          message: res?.e || '登录失败'
        })
        isShowUKeyAuth.value = false
      }
      return reject()
    }
    resolve()
    // 强制改密检测 
    const { policy = 'low', pwd_length = 1, change_flog = 0 } = res?.data || {}
    pwdPolicy.value = policy || 'low'
    pwdMinLen.value = pwd_length || 1
    if (needChangePassword({ policy, pwd_length, change_flog }, loginForm.password)) {
      nextTick(() => {
        console.log('强制改密', policy, pwd_length, change_flog)
        changePwdDlgRef.value?.openDlg(true)
      })
      return
    }
    
    isShowUKeyAuth.value = false
    userStore.setProperty('token', getCookieToken() || '')
    router.push(toPage)
  })
}

/* UKey 回调：获取硬件序列号后判断 */
const getUkeySnCallback = (sn: string[], param: Record<string, unknown>) => {
  if (sn.length === 0) {
    ukeyErrorList.value = ['此账号已绑定硬件加密锁，', '未检测到硬件加密锁，请插入硬件加密锁。']
    return
  }
  if (sn.length !== 1) {
    ukeyErrorList.value = [`检测到${sn.length}个硬件加密锁，请只插入1个`]
    return
  }
  ukeyErrorList.value = []
  const firstSn = sn[0] as string
  param.sn = firstSn
  initiateUkeyLock(firstSn, initUkeyLockCallback, param)
}

/* UKey 回调：初始化锁成功后执行加密运算 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const initUkeyLockCallback = (param: any) => {
  ukeyLock32Function(param.salt, param, param.sn)
}

/* 改密后重新登录 */
const reLogin = (value: boolean, newPassWd: string) => {
  if (value) {
    loading.value = true
    loginForm.password = newPassWd
    const baseURL = import.meta.env.VITE_API_BASE_URL || ''
    axios.get(baseURL + '/api/account/logout/', {
      xsrfCookieName: 'csrftoken',
      xsrfHeaderName: 'X-CSRFToken'
    }).then(() => {
      runSignIn()
    }).catch(() => {
      runSignIn()
    })
  }
}

/* 提交修改密码 */
const handleChangePasswd = (close: () => void) => {
  nextTick(() => {
    editPassWdFromRef.value?.validate((valid: boolean) => {
      if (valid) {
        const params: EditPassWdParams = {
          new_encrypt_password: rsaEncrypt(editPassWdFrom.newPassWd),
          init_flag: '1'
        }
        editPassWdLoading.value = true
        editPassWd(params).then((res) => {
          if (Number(res.r) === 0) {
            router.push(toPage)
          }
        }).finally(() => {
          editPassWdLoading.value = false
          reLogin(true, editPassWdFrom.repeatNewPassWd)
          editPassWdFrom.newPassWd = ''
          editPassWdFrom.repeatNewPassWd = ''
          close = close || changePwdDlgRef.value?.close()
          if (typeof close === 'function') close()
        })
      }
    })
  })
}

/* 修改密码弹窗显示事件 */
const handleEditPasswdShow = () => {
  nextTick(() => {
    newPassWdInputRef.value?.focus()
  })
}

/* 修改密码弹窗隐藏事件 */
const handleEditPasswdHide = () => {
  editPassWdFromRef.value?.resetFields()
}

/*
   忘记密码
   * @description 忘记密码
   * @param {void} 无
   * @return {void} 无
   */
  const handleForgetPassword = useDebounceFn(() => {
    if (!clwModelRef.value) return
    clwModelRef.value.openDlg(true)
  })
  
/* 忘记密码弹窗隐藏事件 */
const handleForgetPasswordHide = () => {
  forgetPwdFrom.value?.resetFields()
  forgetPwd.userName = ''
}
const handleForgotPasswd = (close: () => void) => {
  nextTick(() => {
    forgetPwdFrom.value?.validate((valid: boolean) => {
      if (valid) {
        isForgotPasswdLoading.value = true
        forgotPassWd({ username: Base64.encode(forgetPwd.userName) }).then((res) => {
          if (Number(res.r) !== 0) {
            ElMessage({
              type: 'error',
              dangerouslyUseHTMLString: true,
              message: res?.e || '邮件发送失败'
            })
            return
          }
          ElMessage({
            type: 'success',
            dangerouslyUseHTMLString: true,
            message: res?.e || '邮件发送成功，请检查邮箱'
          })
        }).finally(() => {
          close()
          isForgotPasswdLoading.value = false
        })
      }
    })
  })
}
</script>

<style scoped lang="scss">
.login-container {
  @apply flex relative w-screen h-screen bg-cover bg-no-repeat bg-center text-14;

  .login-view {
    @apply flex flex-col fixed top-0 right-0 w-[768px] h-full
    bg-white/95 shadow-2xl px-[20px] py-0 z-10;

    .login-view-header {
      @apply flex justify-between items-center w-full h-[54px] select-none text-body text-14;
    }

    .login-title {
      @apply w-[450px] text-[#212529] text-[26px] font-[700] mt-[58px];
    }

    .form-item {
      :deep(.el-form-item__label) {
        @apply text-[#212529] font-[700] mb-16;
      }
    }

    .btn {
      @apply w-full text-[20px] font-[700];
    }

    .ukey-error-mark {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #f00;
      line-height: 25px;
    }

    .ukey-auth-error-mark {
      color: #f00;
      text-align: center;
    }

    .copyright-wrap {
      @apply text-center text-12 text-cap mb-[16px] select-none ;
    }
  }
}
</style>

<style lang="scss">
.dlg-from-desc {
  font-size: 13px;
  line-height: 26px;
  color: #909399;
  margin-bottom: 13px;
}
</style>

