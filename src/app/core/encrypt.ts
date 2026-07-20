import JSEncrypt from 'jsencrypt'
import { useUserStore } from '../stores/user'
import httpHelper from '@/app/core/request'
import CryptoJS from 'crypto-js'

/* 
 * 字符串分块
 * @param str 待分块的字符串
 * @param len 每个块的长度
 * @returns 字符串分块数组
 * */
function splitByLen(str: string, len: number): string[] {
  const chunks = []
  for (let i = 0; i < str.length; i += len) {
    chunks.push(str.substring(i, i + len))
  }
  return chunks
}

/*
 * RSA 加密
 * @param str 待加密的字符串
 * @param salt 可选的盐值前缀，传入时拼接为 salt + str 再加密
 * @returns 加密后的字符串
 * */
export const rsaEncrypt = (str: string, salt?: string): string => {
  const encrypt = new JSEncrypt()
  const prefix = useUserStore().signPrefix
  if (!prefix) return str
  encrypt.setPublicKey(prefix)
  const input = salt ? salt + str : str
  const chunks = splitByLen(input, 10)
  const encryptedChunks = chunks.map(chunk => encodeURIComponent(encrypt.encrypt(chunk)))
  return encryptedChunks.join('-block-')
}

/**
 * 生成一个32位的随机数
 * @param length
 * @param chars
 * @returns {string}
 */
function randomString(length=32, chars='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    let result = '';
    for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

// AES加密
export const aesEncrypt = (msg: string, key: {AES_KEY: string, AES_IV: string}) => {
  const srcs = CryptoJS.enc.Utf8.parse(msg);
  const encrypted = CryptoJS.AES.encrypt(srcs, CryptoJS.enc.Utf8.parse(key.AES_KEY), {
    iv: CryptoJS.enc.Utf8.parse(key.AES_IV),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding
  })
  return encrypted.ciphertext.toString();
}

// AES解密，如果需要过滤，传入过滤规则
export const aesDecrypt = (msg: string, rule: string | null, key: {AES_KEY: string, AES_IV: string}) => {
  const AES_KEY = CryptoJS.enc.Utf8.parse(key.AES_KEY)
  const iv = CryptoJS.enc.Utf8.parse(key.AES_IV)
  const hex = CryptoJS.enc.Hex.parse(msg)
  const str = CryptoJS.enc.Base64.stringify(hex)
  const decrypted = CryptoJS.AES.decrypt(str, AES_KEY, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding
  })
  const result = decrypted.toString(CryptoJS.enc.Utf8)
  if (rule) {
    return result.toString().replace(rule, '')
  }
  return result.toString()
}

interface AESKeyResponse {
  salt: string
  token_key: string
  token_iv: string
}

export const getAESKey = async () => {
  const randomStr = randomString()
  const encryptStr = rsaEncrypt(randomStr)
  const {data: res} = await httpHelper<AESKeyResponse>('/api/aes/test/', 'post', {key: encryptStr})
  const hash = CryptoJS.MD5(randomStr + res.salt).toString()
  const key = {
      AES_KEY: hash.slice(0, 16),
      AES_IV: hash.slice(16),
  }
  const data = {
      AES_KEY: aesDecrypt(res.token_key, null, key),
      AES_IV: aesDecrypt(res.token_iv, null, key),
  }
  return data
}
