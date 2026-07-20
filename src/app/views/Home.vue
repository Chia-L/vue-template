<template>
  <div class="home-view">
    <h1>{{ t('home.title') }}</h1>
    <p>{{ t('home.welcome') }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped>
.home-view {
  padding: 20px;
}
</style>
