<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import enUs from 'element-plus/es/locale/lang/en'


const { locale } = useI18n()
const curLang = computed(() => {
  console.log(locale.value)
  return locale.value === 'zh-cn' ? zhCn : enUs
})
</script>

<template>
  <el-config-provider :locale="curLang">
    <router-view />
  </el-config-provider>

</template>

<style>
</style>
