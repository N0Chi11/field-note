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
    primaryColor: '#243FA0',
    primaryColorHover: '#3152BC',
    primaryColorPressed: '#172B78',
    primaryColorSuppl: '#243FA0',
    infoColor: '#315AA6',
    successColor: '#277455',
    warningColor: '#A76A13',
    errorColor: '#B9362B',
    borderRadius: '3px',
    borderRadiusSmall: '2px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    bodyColor: '#F2EFE7',
    cardColor: '#FCFBF7',
    modalColor: '#FCFBF7',
    popoverColor: '#FCFBF7',
    borderColor: '#D5D0C5',
    textColorBase: '#1A1A18'
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
