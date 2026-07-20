<template>
  <div class="w-full h-screen flex items-center justify-center">
    <div class="w-[400px] border border-solid border-[#e3eaed] rounded-[5px]">
      <!-- Header -->
      <div class="h-[44px] leading-[28px] text-[1em] font-700 bg-[#f8f8f8] px-[16px] py-[8px] border-b border-solid border-b-[#ebeef5]">
        会话锁定
      </div>
      <!-- Content -->
      <div class="p-[20px] bg-white">
        <template v-if="flag">
          <p class="mb-[10px]">
            密码
          </p>
          <el-input
            v-model.trim="nPass"
            type="password"
            show-password
            placeholder="请输入密码"
          />
          <p v-show="!nPass && nPassFlag" class="text-red-500 text-14 mt-[4px]">
            密码不能为空
          </p>
          <p class="text-14 leading-[22px] mt-[10px] ml-[6px]">
            会话已锁定，请输入密码解锁
          </p>
        </template>
        <template v-else>
          <p class="text-center leading-[80px]">
            解锁成功，<span>{{ timeNum }}</span>秒后自动跳转至锁定前页面...
          </p>
        </template>
      </div>
      <!-- Footer -->
      <div class="border-t border-solid border-t-[#ebeef5] p-[17px] flex justify-end bg-white">
        <el-button type="primary" :disabled="!flag" @click="btnUnlock">
          解锁
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Base64 } from 'js-base64'
import httpHelper from '@/app/core/request'
import { unlockSession } from '@/app/apis/user'
import type { UserInfo } from '@/app/types/user'
import { rsaEncrypt } from '@/app/core/encrypt'
import { bindEventListener, removeEventListener } from '@/app/core/tools'
import { useUserStore } from '@/app/stores/user'

const router = useRouter()
const userStore = useUserStore()

const flag = ref(true)
const nPassFlag = ref(false)
const timeNum = ref(3)
const nPass = ref('')
const requestIng = ref(false)

let countdownTimer: ReturnType<typeof setInterval> | null = null

/* 获取 Token (salt) */
const getToken = (): Promise<{ salt: string }> => {
  return new Promise((resolve, reject) => {
    // 直接从 info 接口获取用户名，不依赖 store（store.userInfor 可能为空）
    httpHelper<UserInfo>('/api/account/info/', 'post')
      .then((res) => {
        const username = res?.data?.user || ''
        return httpHelper<{ salt: string, public_key: string, global_public_key: string }>('/api/account/token/', 'post', { username: Base64.encode(username) })
      })
      .then((res) => {
        if (String(res.r) !== '0') {
          ElMessage.error(res.e)
          return reject(new Error(res.e))
        }
        userStore.setProperty('signPrefix', res.data.public_key)
        userStore.setProperty('globalSignPrefix', res.data.global_public_key)
        resolve({ salt: res.data.salt })
      })
      .catch(reject)
  })
}

/* 获取数据（解锁） */
const getData = (isRefresh: boolean, isMounted?: boolean) => {
  getToken().then((token) => {
    const params = {
      pwd: rsaEncrypt(token.salt + nPass.value),
      is_refresh: isRefresh
    }
    unlockSession(params).then((res) => {
      requestIng.value = false
      if (res.r !== 0) {
        if (!isMounted) {
          flag.value = true
          ElMessage.error(res.e)
        }
      } else {
        flag.value = false
        timeNum.value = 3
        if (!res.data.unlocked) {
          ElMessage.success('该用户已解锁')
        }
        countdownTimer = setInterval(() => {
          if (timeNum.value === 0) {
            router.push(res.data.router)
            if (countdownTimer) clearInterval(countdownTimer)
            return
          }
          timeNum.value -= 1
        }, 999)
      }
    }).catch(() => {
      requestIng.value = false
    })
  }).catch(() => {
    requestIng.value = false
  })
}

/* 点击解锁 */
const btnUnlock = () => {
  nPassFlag.value = true
  if (!nPass.value) return
  if (requestIng.value) return
  requestIng.value = true
  getData(false)
}

/* 回车解锁 */
const doEnter = (e: Event) => {
  if ((e as KeyboardEvent).keyCode === 13) {
    btnUnlock()
  }
}

onMounted(() => {
  bindEventListener(window, 'keydown', doEnter)
  getData(true, true)
})

onBeforeUnmount(() => {
  removeEventListener(window, 'keydown', doEnter)
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>
