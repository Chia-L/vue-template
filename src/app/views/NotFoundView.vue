<template>
  <div class="not-found-view">
    <h1>{{ t('notFound.title') }}</h1>
    <p>{{ t('notFound.message') }}</p>
    <router-link to="/">{{ t('notFound.backHome') }}</router-link>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.not-found-view {
  padding: 20px;
  text-align: center;
}
</style>
