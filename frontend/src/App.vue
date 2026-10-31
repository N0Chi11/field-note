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
    primaryColor: '#A84424',
    primaryColorHover: '#C65D35',
    primaryColorPressed: '#7E2D1A',
    primaryColorSuppl: '#A84424',
    infoColor: '#61517F',
    successColor: '#356449',
    warningColor: '#87551D',
    errorColor: '#A13537',
    borderRadius: '3px',
    borderRadiusSmall: '2px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    bodyColor: '#EFE5D8',
    cardColor: '#FBF5EB',
    modalColor: '#FBF5EB',
    popoverColor: '#FBF5EB',
    borderColor: '#D7C5B7',
    textColorBase: '#2D222D'
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
