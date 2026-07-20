<template>
  <div class="reset w-full h-screen">
    <clw-header>
      <template #header-right>
        <a href="http://www.clerware.com/" target="_blank">关于我们</a>
      </template>
    </clw-header>
    <div class="reset-con">
      <div class="reset-con-main">
        <div class="reset-con-main-title">
          <h2>重置密码</h2>
        </div>
        <div class="reset-con-main-body">
          <div class="reset-con-main-body-form">
            <el-form
              ref="fromRef" 
              :model="form"
              :rules="formRules"
              label-width="80px"
              label-position="left"
              hide-required-asterisk
            >
              <el-form-item label="登录账户" prop="account">
                <span v-text="form.account" />
              </el-form-item>
              <el-form-item label="新密码" prop="newPassWd">
                <el-input v-model.trim="form.newPassWd" type="password" />
              </el-form-item>
              <el-form-item label="确认密码" prop="confirmPassWd" style="margin-bottom: 10px">
                <el-input v-model.trim="form.confirmPassWd" type="password" />
              </el-form-item>
              <el-form-item style="margin-bottom: 10px">
                <span class="colorFF9A00"><i class="iconfont i-093info" /> 请在{{ expire_time }}前完成重置密码操作</span>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="onSubmit">
                  确认修改
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ClwHeader from '@/app/components/ClwHeader.vue'
import { type FormItemRule, type FormInstance } from 'element-plus'
import httpHelper from '@/app/core/request'
import { rsaEncrypt } from '@/app/core/encrypt'
import { useRoute, useRouter } from 'vue-router'
import { checkerPassWd } from '@/app/core/tools'
import { getPwdPolicy } from '@/app/apis/user'
import moment from 'moment'
import { Base64 } from 'js-base64'

const route = useRoute()
const router = useRouter()
let expire_time: string = route.query?.expire_time as string || ''
expire_time = moment(expire_time? parseInt(expire_time) * 1000 : 0).format('YYYY-MM-DD HH:mm:ss')
const fromRef = ref<FormInstance>()
const form = ref<Record<string, string>>({
  account: route.query?.username as string || '',
  newPassWd: '',
  confirmPassWd: ''
})

const newPassWdChecker: FormItemRule['validator'] = (_rule, value, callback) => {
  checkerPassWd(value, callback, policy.value, pwdLen.value)
  callback()
}

const repeatNewPassWdChecker: FormItemRule['validator'] = (_rule, value, callback) => {
  if (form.value.newPassWd && value !== form.value.newPassWd) {
    return callback(new Error('两次输入不相同，请重新输入'))
  }
  callback()
}

const formRules = ref({
  newPassWd: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { validator: newPassWdChecker, trigger: 'blur'}
  ],
  confirmPassWd: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: repeatNewPassWdChecker, trigger: 'blur'}
  ]
})
const policy = ref('low')
const pwdLen = ref<number>(1)

/**
 * @description 提交重置密码表单
 */
const onSubmit = () => {
  fromRef.value?.validate(valid => {
    if (valid) {
      let params = {
        pwd: rsaEncrypt(form.value.newPassWd || ''),
        // username: this.form.account,
        id: route.query?.key as string || '',
        value: route.query.value || ''
      }
      httpHelper<Record<string, unknown>>('/api/account/set_password/', 'post', params).then((res) => {
        if (Number(res.r) !== 0) {
          ElMessage.error(res.e)
        } else {
          ElMessage.success('修改成功')
          router.replace('/login')
        }
      }).catch((err) => {
        ElMessage.error(err as string || '修改密码失败')
      })
    }
  })
}
    /* 获取Token */
const getToken = async () => {
  return httpHelper<{ public_key: string, global_public_key: string, salt: string }>(
    '/api/account/token/',
    'post',
    {
      username: Base64.encode(form.value.account || '')
    }).then((res) => {
      if (Number(res.r) !== 0) {
        ElMessage.error(res.e)
      }
      localStorage.setItem('arw_public_key', res.data?.public_key || '')
      localStorage.setItem('global_public_key', res.data?.global_public_key || '')
      return res.data?.salt || ''
    }).catch((err) => {
      ElMessage.error(err as string || '获取Token失败')
      return err || ''
    })
}

onMounted(() => {
  getPwdPolicy().then((res) => {
    if (res?.r === 0) {
      policy.value = res?.data?.policy || 'low'
      pwdLen.value = res?.data?.pwd_length || 1
    }
  })
  getToken()
})
</script>

<style scoped>
.reset-con{
  height: calc(100vh - 44px);
  width: 100%;
  background-color: #f6f6f6;
  padding-top: 150px;
}

.reset-con-main{
  width: 800px;
  background-color: #FFF;
  margin: 0 auto;
}

.reset-con-main-title{
  border-bottom: 1px solid #f6f6f6;
}

h2{
  height: 60px;
  line-height: 60px;
  padding-left: 15px;
}

.reset-con-main-body{
  padding: 20px 20px 70px;
}

.reset-con-main-body-form{
  width: 450px;
  margin: 0 auto;
}

.colorFF9A00{
  color: #ff9a00;
}
</style>
<style lang="scss">
.reset-msg-success {
  padding: 13px 15px 13px 20px !important;
  color: #67C23A;
  background-color: #F0F9EB;

  i {
    margin-right: 10px;
    color: #67C23A;
    font-size: 12px;
  }
}

.reset-msg-error {
  padding: 13px 15px 13px 20px !important;
  color: #F56C6C;
  background-color: #FEF0F0;

  i {
    margin-right: 10px;
    color: #F56C6C;
    font-size: 12px;
  }
}
</style>
