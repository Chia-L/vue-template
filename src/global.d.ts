export {}


interface AppConfig<T = Record<string, string>> extends Record<string, string> {
  app: T
  login: T
}

declare global {
  const APP_CONFIG: AppConfig
  interface Window {
    APP_CONFIG: AppConfig
  }
  namespace NodeJS {
    interface Global {
      APP_CONFIG: AppConfig
    }
  }
}

declare module 'vue' {
  export interface ComponentCustomProperties {
    $appConfig: AppConfig
  }
}
