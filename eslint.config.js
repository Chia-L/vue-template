import globals from "globals"
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import prettierConfig from 'eslint-config-prettier'
import { readFile } from 'node:fs/promises'

const autoImportFile = new URL('./.eslintrc-auto-imports.json', import.meta.url);
const autoImportGlobals = JSON.parse(await readFile(autoImportFile, 'utf8'));

export default [ 
  // 基础配置
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettierConfig,
  {
    languageOptions: {
      globals: {
        ...autoImportGlobals.globals, // 注入自动导入的全局变量（如 nextTick, ref 等）
        ...globals.browser, // 注入浏览器全局变量（如 window, document, navigator 等）
        // Element Plus 全局组件
        ElMessage: true,
        ElMessageBox: true,
        ElNotification: true,
        ElLoading: true,
      },
    },
  },
  // 忽略的文件
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'pnpm-lock.yaml',
      '.pnpm-store/**',
      'src/auto-imports.d.ts',
      'src/components.d.ts',
    ],
  },

  // Vue 文件配置
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/component-name-in-template-casing': ['error', 'kebab-case'],
      'vue/max-attributes-per-line': ['error', {
        singleline: { max: 3 },
        multiline: { max: 1 },
      }],
      'vue/no-v-model-argument': 'off',
    },
  },

  // TypeScript 文件配置
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'camelcase': 'off',
      '@typescript-eslint/camelcase': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
      }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'objectLiteralProperty',
          format: ['camelCase', 'snake_case', 'UPPER_CASE'],
          filter: {
            regex: '^.*@.*$',
            match: false,
          },
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'snake_case'],
          leadingUnderscore: 'forbid',
        },
        {
          selector: 'function',
          format: ['camelCase'],
        },
        {
          selector: 'class',
          format: ['PascalCase'],
        },
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: {
            regex: '^I[A-Z]',
            match: false,
          },
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
        },
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
        {
          selector: 'enumMember',
          format: ['PascalCase'],
        },
        {
          selector: 'property',
          format: ['camelCase', 'snake_case', 'UPPER_CASE'],
          filter: {
            regex: '^.*@.*$',
            match: false,
          },
        },
      ],
      'prefer-spread': 'off',
      'prefer-rest-params': 'off',
      'max-depth': ['error', 3],
      'no-else-return': ['error', { allowElseIf: false }],
    },
  },

  // 所有文件通用配置
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        browser: true,
        es2021: true,
        node: true,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]
