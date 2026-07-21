<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider, zhCN, dateZhCN } from 'naive-ui'
</script>

<template>
  <NConfigProvider :locale="zhCN" :date-locale="dateZhCN" :inline-theme-disabled="true">
    <NMessageProvider>
      <NDialogProvider>
        <router-view />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
