export default {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      // 自定义正则：同时匹配两种格式
      // 1. AIO/项目名-issue#168 描述文案
      // 2. 类型：feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert
      // 'build'：构建系统或外部依赖项的更改，'chore'：构建过程或辅助工具的变动
      // 'ci'：持续集成（continuous integration），'docs'：文档（documentation）
      // 'feat'：新功能（feature），'fix'：修复 bug
      // 'perf'：性能优化，'refactor'：代码重构（不包括 bug 修复、功能新增）
      // 'revert'：代码回退，'style'：代码格式（不影响功能，例如空格、分号等格式修正）
      // 'test'：添加测试或修改现有测试
      headerPattern: /^((AIO\/[a-zA-Z0-9]+-issue#\d+\s+.+)|((feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?:\s.+))$/,
      headerCorrespondence: ['type', 'scope', 'subject'], // 保持字段映射兼容性
    },
  },
  rules: {
    'type-empty': [0], // 关闭 type 必填规则 → 允许不写 type
    'subject-empty': [0], // 关闭 subject 必填规则 → 允许不写 subject
    'type-enum': [0],
    'type-case': [0],
    'subject-case': [0, 'always'],
    'header-max-length': [2, 'always', 80] // commit message 的 header 部分最大长度为 80 个字符
  }
}