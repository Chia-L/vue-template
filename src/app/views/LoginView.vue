<template>
  <div class="login-view">
    <h1>{{ t('login.title') }}</h1>
    <p>{{ t('login.welcome') }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.login-view {
  padding: 20px;
}
</style>
