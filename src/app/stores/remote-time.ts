import { defineStore } from 'pinia'
import { getRemoteTime } from '@/app/apis/common'
import moment from 'moment'

export const useRemoteTimeStore = defineStore('remoteTime', {
  state: () => ({
    remoteTime: '获取中...',
    remoteTimeCache: '', // 远程时间缓存
    localTime: moment(),
    isLoading: false,
    timeCount: 300, // 本地计时，时间计数器
    timeOffset: 300, // 对时间隔，单位：秒
    timer: null as ReturnType<typeof setTimeout> | null, // 定时器，用于定时更新远程时间
  }),
  getters: {
    serverTime: (state): string => {
      const invalidStr = ['获取中...', '', null, undefined]
      const isValid = invalidStr.includes(state.remoteTime) || moment(state.remoteTime).isValid()
      return isValid ? state.remoteTime : moment().format('YYYY-MM-DD HH:mm:ss')
       }
  },
  actions: {
    /**
     * 更新远程时间
     * @description 更新远程时间，从服务器获取最新时间
     * @return {void} 无
     */
    updateRemoteTime() {
      this.isLoading = true
      return getRemoteTime().then(data => {
        this.remoteTime = data.now
        this.remoteTimeCache = data.now
        this.localTime = moment()
      }).finally(() => {
        this.isLoading = false
      })
    },

    /**
     * 修复远程时间
     * @description 修复远程时间，根据本地时间调整远程时间，保持与本地时间同步
     * @return {void} 无
     */
    fixRemoteTime() {
      if(this.isLoading) return 
      this.clearTimer()
      if (this.timeCount >= this.timeOffset) {
        this.timeCount = 0
        this.updateRemoteTime().then(() => {
          this.fixRemoteTime()
        })
        return
      }
      this.timer = setTimeout(() => {
        this.timeCount++
        if (moment(this.remoteTimeCache).isValid()) {
          const localTimeGap = moment().diff(this.localTime, 'second')
          if (localTimeGap > 0 && localTimeGap <= this.timeOffset) {
            this.remoteTime = moment(this.remoteTimeCache).add(localTimeGap, 's').format('YYYY-MM-DD HH:mm:ss')
          } else {
            this.remoteTime = moment(this.remoteTime).add(1, 's').format('YYYY-MM-DD HH:mm:ss')
          }
        }
        this.fixRemoteTime()
      }, 1000)
    },
    clearTimer() {
      if (this.timer) {
        clearTimeout(this.timer)
        this.timer = null
      }
    }
  } 
})
