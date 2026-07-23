export default [
  {
    url: '/api/login',
    method: 'POST',
    response: ({ body }) => {
      const { username, password } = body
      
      if (username === 'admin' && password === '123456') {
        return {
          code: 200,
          message: '登录成功',
          data: {
            token: 'mock-token-' + Date.now(),
            userInfo: {
              id: 1,
              username: 'admin',
              role: 'admin'
            }
          }
        }
      }
      
      return {
        code: 401,
        message: '用户名或密码错误',
        data: null
      }
    }
  },
  {
    url: '/api/user/info',
    method: 'GET',
    response: () => {
      return {
        code: 200,
        message: '成功',
        data: {
          id: 1,
          username: 'admin',
          role: 'admin',
          email: 'admin@example.com'
        }
      }
    }
  },
  // 测试AES密钥
  {
    url: '/api/aes/test/',
    method: 'POST',
    response: () => {
      return {
        r: 1,
        e: '',
        data: {
          salt: '1234567890123456',
          token_key: '1234567890123456',
          token_iv: '1234567890123456'
        }
      }
    }
  }
]
