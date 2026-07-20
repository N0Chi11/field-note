<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { NForm, NFormItem, NInput, NButton, useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const form = reactive({
  student_id: '',
  password: '',
})

const rules: FormRules = {
  student_id: [
    {
      required: true,
      message: '请输入学号',
      trigger: ['blur', 'input'],
    },
  ],
  password: [
    {
      required: true,
      message: '请输入密码',
      trigger: ['blur', 'input'],
    },
  ],
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const response = (err as Record<string, any>).response
    if (response?.data?.detail) {
      return typeof response.data.detail === 'string'
        ? response.data.detail
        : '登录失败，请检查输入'
    }
    const msg = (err as Record<string, any>).message
    if (typeof msg === 'string' && msg) {
      return msg
    }
  }
  return '登录失败，请稍后重试'
}

async function handleLogin() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    await authStore.login(form.student_id, form.password)
    message.success('登录成功')
    router.push('/equipment')
  } catch (err) {
    message.error(getErrorMessage(err))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <div class="login__card">
      <!-- Logo 区域 -->
      <div class="login__header">
        <span class="login__logo">📷</span>
        <h1 class="login__title">器材设备管理系统</h1>
        <p class="login__subtitle">Equipment Management System</p>
      </div>

      <!-- 登录表单 -->
      <n-form
        ref="formRef"
        :model="form"
        :rules="rules"
        size="large"
        label-placement="top"
        class="login__form"
      >
        <n-form-item path="student_id" label="学号">
          <n-input
            v-model:value="form.student_id"
            placeholder="请输入学号"
            clearable
          />
        </n-form-item>

        <n-form-item path="password" label="密码">
          <n-input
            v-model:value="form.password"
            type="password"
            show-password-on="click"
            placeholder="请输入密码"
            @keyup.enter="handleLogin"
          />
        </n-form-item>

        <n-button
          type="primary"
          block
          size="large"
          :loading="loading"
          class="login__btn"
          @click="handleLogin"
        >
          登录
        </n-button>
      </n-form>

      <p class="login__footer">A107 新媒体中心 · 器材设备管理系统</p>
    </div>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg) 0%, #e8e4de 100%);
  padding: 20px;
}

.login__card {
  width: 400px;
  max-width: 100%;
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  padding: 40px 36px 32px;
}

.login__header {
  text-align: center;
  margin-bottom: 32px;
}

.login__logo {
  font-size: 48px;
  line-height: 1;
  display: block;
  margin-bottom: 12px;
}

.login__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
}

.login__subtitle {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 6px 0 0 0;
  letter-spacing: 0.5px;
}

.login__form {
  margin-bottom: 8px;
}

.login__btn {
  margin-top: 8px;
}

/* 覆盖 Naive UI 按钮主色为主题强调色 */
.login__form :deep(.n-button--primary-type) {
  --n-color: var(--accent) !important;
  --n-color-hover: #a67a26 !important;
  --n-color-pressed: #946d22 !important;
  --n-color-focus: #a67a26 !important;
  --n-text-color: #ffffff !important;
  --n-text-color-hover: #ffffff !important;
  --n-text-color-pressed: #ffffff !important;
  --n-text-color-focus: #ffffff !important;
}

/* 覆盖输入框聚焦颜色为主题强调色 */
.login__form :deep(.n-input--focus) {
  --n-border-color: var(--accent) !important;
  --n-border-color-focus: var(--accent) !important;
  --n-box-shadow-focus: 0 0 0 2px rgba(184, 134, 43, 0.15) !important;
  --n-caret-color: var(--accent) !important;
}

.login__footer {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 24px 0 0 0;
}

@media (max-width: 480px) {
  .login__card {
    padding: 32px 24px 24px;
  }

  .login__logo {
    font-size: 40px;
  }

  .login__title {
    font-size: 20px;
  }
}
</style>
