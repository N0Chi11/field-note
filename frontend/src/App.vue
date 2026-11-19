<script setup lang="ts">
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  zhCN,
  dateZhCN,
  type GlobalThemeOverrides
} from 'naive-ui'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#7F3344',
    primaryColorHover: '#964456',
    primaryColorPressed: '#652636',
    primaryColorSuppl: '#7F3344',
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
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
