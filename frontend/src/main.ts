import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createDiscreteApi, zhCN, dateZhCN } from 'naive-ui'
import router from './router'
import App from './App.vue'
import { useToastStore } from './stores/toast'

// 全局自定义样式（Naive UI 使用 CSS-in-JS，无需单独导入 CSS）
import './assets/styles/main.css'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)

/**
 * Naive UI discrete API：用于全局消息提示。
 * 该实例独立于组件树，可在任意位置（Store、Axios 拦截器、普通函数）中调用。
 */
const { message } = createDiscreteApi(['message'], {
  configProviderProps: {
    locale: zhCN,
    dateLocale: dateZhCN
  }
})

// 将全局 message 注入 toast store，统一对外暴露 success/error/warning/info
useToastStore().setMessageApi(message)

app.mount('#app')
