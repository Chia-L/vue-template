import httpHelper from '@/app/core/request'

/* 获取远端时间 */
export const getRemoteTime = (): Promise<{now: string}> => {
  return new Promise((resolve, reject) => {
    httpHelper<{now: string}>('/api/system_set/server_time/', 'post').then((res) => {
      if (res.r !== 0) {
        ElMessage.error(res.e)
        return reject(res.e)
      }
      resolve(res.data)
    }).catch(reject)
  })
}