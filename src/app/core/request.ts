import 
  axios, 
  { 
    type AxiosInstance,
    type AxiosRequestConfig,
    type AxiosResponse,
    type InternalAxiosRequestConfig 
  } from 'axios'
import { useUserStore } from "@/app/stores/user"
import router from "@/app/router/index"


declare module 'axios' {
  interface AxiosRequestConfig {
    retry?: number           // 重试次数
    retryDelay?: number      // 重试延迟时间
    retryCount?: number     // 内部记录重试次数
  }
}

interface ApiResponse<T> {
  r: number
  e?: string
  data: T
}

// 创建 axios 实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  responseType: 'json',
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
  timeout: 15000,
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error: { config?: InternalAxiosRequestConfig; response?: { status?: number } }) => {
    const status = error.response?.status ?? undefined
    
    if (status === 403) {
      useUserStore().resetToken().then(() => {
        router.replace('/login')
      })
      return
    }
    // 统一错误处理
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 导出请求方法
export const http = {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return service.get(url, config)
  },

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return service.post(url, data, config)
  },

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return service.put(url, data, config)
  },

  delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return service.delete(url, config)
  },
}

export const httpService = service

type MethodType = 'get' | 'post' | 'put' | 'delete' 

const httpHelper = <T>(url: string, method: MethodType, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> => {
  method = method.toLowerCase() as MethodType
  if (method === 'get' || method === 'delete') {
    return http[method](url, config)
  } 
    return http[method](url, data, config)
  
}

export default httpHelper