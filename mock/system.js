import Mock from 'mockjs'
import path from 'path'
import fs from 'fs'

/**
 * 获取路由权限
 * @param dir 路由文件目录
 * @param excludeFiles 排除的文件
 * @param ext 文件扩展名
 * @returns 路由权限
 */
function getRoutePerms(dir, excludeFiles = [], ext = '.ts') {
  if (!dir) return []
  const fileDir = path.resolve(process.cwd(), dir)
  const files = fs.readdirSync(fileDir)
  const targetFiles = files.filter(file => !excludeFiles.includes(file) && file.endsWith(ext))

  // 同步读文件内容
  const perms = []
  targetFiles.forEach(file => {
    const fileContent = fs.readFileSync(path.resolve(fileDir, file), 'utf-8')
    fileContent.match(/perms: \[([^\]]+)\]/gi)?.forEach(item => {
      const strList = item
        ?.match(/('|")[^'"]+('|")/g)
        ?.map(item => item?.replace(/['"]/g, '')) || []
      perms.push(...strList)
    })
  })
 
  return perms
}

export default [
  // 系统时间
  {
    url: '/api/system_set/server_time/',
    method: 'post',
    response: () => {
      return {
        r: 0,
        e: '',
        data: {
          now: Mock.mock('@datetime("yyyy-MM-dd HH:mm:ss")'),
        },
      }
    },
  },

  // 登录
  {
    url: '/api/account/login/',
    method: 'post',
    response: () => {
      return {
        r: 0,
        e: '',
        data: {
          policy: 'low',
          pwd_length: 1,
          change_flog: 0
        }
      }
    },
  },

  // 获取 token
  {
    url: '/api/account/token/',
    method: 'post',
    response: () => {
      return {
        r: 0,
        e: '',
        data: {
          public_key: 'mock-signPrefix',
          global_public_key: 'mock-globalSignPrefix',
          token: 'mock-token',
          salt: 'mock-salt'
        }
      }
    },
  },

  // 登出
  {
    url: '/api/account/logout/',
    method: 'get',
    response: () => {
      return {
        r: 0,
        e: '',
        data: {},
      }
    },
  },

  // 用户信息
  {
    url: '/api/account/info/',
    method: 'post',
    response: () => {
      const allPerms = getRoutePerms('./src/app/router', ['index.ts', 'guard.ts', 'static.ts'])
      return {
        r: 0,
        e: '',
        data: {
          "role": "Super-Admin",
          "role_name": "系统管理员",
          "routes": allPerms ,
          "name": Mock.mock('@cname'),
          "user": "admin"
        }
      }
    },
  },

  // 忘记密码
  {
    url: '/api/account/forget_password/',
    method: 'post',
    response: () => {
      return {
        r: 0,
        e: '',
        data: {},
      }
    },
  },

  // 获取密码策略
  {
    url: '/api/account/get_pwd_tactic/',
    method: 'post',
    response: () => {
      return {
        r: 0,
        e: '',
        data: {
          policy: 'low',
          pwd_length: 6
        }
      }
    },
  },

  // 修改密码
  {
    url: '/api/account/change_password/',
    method: 'post',
    response: () => {
      return {
        r: 0,
        e: '',
        data: {},
      }
    },
  },

  // 设置密码
  {
    url: '/api/account/set_password/',
    method: 'post',
    response: () => {
      return {
        r: 0,
        e: '',
        data: {},
      }
    },
  },

  // 检查用户是否被锁定
  {
    url: '/api/account/is_user_locked/',
    method: 'post',
    response: () => {
      return {
        r: 0,
        e: '',
        data: {},
      }
    },
  },

  // 锁定用户
  {
    url: '/api/account/lock/',
    method: 'post',
    response: () => {
      return {
        r: 0,
        e: '',
        data: null,
      }
    },
  },

  // 解锁用户
  {
    url: '/api/account/unlock/',
    method: 'post',
    response: () => {
      return {
        r: 0,
        e: '',
        data: {
          router: '/',
          unlocked: false
        },
      }
    },
  },

  // 获取消息通知设置
  {
    url: '/api/account/get_message_notify/',
    method: 'post',
    response: () => {
      return {
        r: 0,
        e: '',
        data: {
          email: "",
          no_noti: "1",
          phone: "",
          vx_chat: ""
        },
      }
    },
  },

  // 设置消息通知
  {
    url: '/api/account/set_message_notify/',
    method: 'post',
    response: () => {
      return {
        r: 0,
        e: '',
        data: {},
      }
    },
  },

  // 验证密码
  {
    url: '/api/account/verify_password/',
    method: 'post',
    response: () => {
      return {
        r: 0,
        e: '',
        data: {},
      }
    },
  },

  // AES 密钥测试
  {
    url: '/api/aes/test/',
    method: 'post',
    response: () => {
      return {
        r: 0,
        e: '',
        data: {
          key: Mock.mock('@guid'),
          iv: Mock.mock('@guid'),
          encrypted: Mock.mock('@guid'),
        },
      }
    },
  },
]
