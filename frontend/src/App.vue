<script setup lang="ts">
import { defineAsyncComponent, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  zhCN,
  dateZhCN,
  type GlobalThemeOverrides
} from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useCameraDrawStore } from '@/stores/cameraDraw'

const ChristmasGiftBox = defineAsyncComponent(() => import('@/components/ChristmasGiftBox.vue'))
const route = useRoute()
const authStore = useAuthStore()
const cameraDraw = useCameraDrawStore()

// Clear an open draw on navigation before the login page opens a new one.
watch([() => route.fullPath, () => authStore.isLoggedIn], cameraDraw.close, { flush: 'sync' })

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#A5243D',
    primaryColorHover: '#B72B43',
    primaryColorPressed: '#821C36',
    primaryColorSuppl: '#A5243D',
    infoColor: '#345C50',
    successColor: '#356449',
    warningColor: '#87551D',
    errorColor: '#A13537',
    borderRadius: '3px',
    borderRadiusSmall: '2px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    bodyColor: '#F3EEE4',
    cardColor: '#FFFBF3',
    modalColor: '#FFFBF3',
    popoverColor: '#FFFBF3',
    borderColor: '#D3C8B7',
    textColorBase: '#242C25'
  }
}
</script>

<template>
  <NConfigProvider
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme-overrides="themeOverrides"
  >
    <NMessageProvider>
      <NDialogProvider>
        <router-view />
        <ChristmasGiftBox v-if="route.meta.auth && authStore.isLoggedIn" v-model:show="cameraDraw.visible" />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
