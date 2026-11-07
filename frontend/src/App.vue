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
    primaryColor: '#315F80',
    primaryColorHover: '#4B7F9A',
    primaryColorPressed: '#21445F',
    primaryColorSuppl: '#315F80',
    infoColor: '#315F80',
    successColor: '#356449',
    warningColor: '#87551D',
    errorColor: '#A13537',
    borderRadius: '3px',
    borderRadiusSmall: '2px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    bodyColor: '#EAF0F2',
    cardColor: '#F9FBFA',
    modalColor: '#F9FBFA',
    popoverColor: '#F9FBFA',
    borderColor: '#C4D4DB',
    textColorBase: '#192D3D'
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
