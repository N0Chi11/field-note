<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { getRequests } from '@/api/borrow'
import type {
  BorrowDetail,
  BorrowRequestQuery,
  PaginatedResponse
} from '@/types/models'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToastStore()

const isAdmin = computed(() => !!authStore.isAdmin)
const requests = ref<BorrowDetail[]>([])

// 姓名首字（用于头像）
function getInitials(name?: string): string {
  return name ? name.charAt(0).toUpperCase() : '?'
}

// 借用统计
const stats = computed(() => {
  const list = requests.value
  return {
    total: list.length,
    pending: list.filter((r) => r.status === 'pending').length,
    borrowing: list.filter((r) => r.status === 'borrowing').length,
    returned: list.filter((r) => r.status === 'returned').length,
    rejected: list.filter((r) => r.status === 'rejected').length
  }
})

// 加载借用记录（管理员看全部，普通用户后端仅返回本人的）
async function loadRequests() {
  try {
    const all: BorrowDetail[] = []
    let page = 1
    const size = 100
    // 安全上限，避免异常时死循环
    for (let i = 0; i < 50; i++) {
      const params: BorrowRequestQuery & { page?: number; size?: number } = {
        page,
        size
      }
      const res = (await getRequests(params)) as unknown as PaginatedResponse<BorrowDetail>
      all.push(...res.items)
      if (res.items.length === 0 || all.length >= res.total) break
      page++
    }
    requests.value = all
  } catch (e: any) {
    toast.error(errMsg(e, '加载借用记录失败'))
    requests.value = []
  }
}

// 统一错误信息提取
function errMsg(e: any, fallback = '操作失败'): string {
  const d = e?.data?.detail
  if (typeof d === 'string' && d) return d
  if (d && typeof d === 'object' && d.message) return d.message
  return e?.message || fallback
}

function goOverview() {
  router.push('/overview')
}

async function handleLogout() {
  await authStore.logout()
  router.replace('/login')
}

onMounted(loadRequests)
</script>

<template>
  <AppLayout>
    <div class="page">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1>个人中心</h1>
        <p>查看您的账户信息与借用统计</p>
      </div>

      <!-- 个人信息卡片 -->
      <div v-if="authStore.user" class="profile-card">
        <div class="profile-header">
          <div class="profile-avatar-large">
            {{ getInitials(authStore.user.name) }}
          </div>
          <div class="profile-info">
            <div class="profile-name">{{ authStore.user.name }}</div>
            <div class="profile-id">{{ authStore.user.student_id }}</div>
            <span class="profile-role-badge" :class="{ user: !isAdmin }">
              {{ isAdmin ? '管理员' : '用户' }}
            </span>
          </div>
        </div>

        <!-- 统计数据网格 -->
        <div class="profile-stats">
          <div class="profile-stat">
            <div class="profile-stat-value">{{ stats.total }}</div>
            <div class="profile-stat-label">总申请</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value">{{ stats.pending }}</div>
            <div class="profile-stat-label">待审核</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value">{{ stats.borrowing }}</div>
            <div class="profile-stat-label">借用中</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value">{{ stats.returned }}</div>
            <div class="profile-stat-label">已归还</div>
          </div>
          <div class="profile-stat">
            <div class="profile-stat-value">{{ stats.rejected }}</div>
            <div class="profile-stat-label">已拒绝</div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="profile-actions">
          <button type="button" class="btn btn-secondary" @click="goOverview">
            查看借用记录
          </button>
          <button type="button" class="btn btn-danger" @click="handleLogout">
            退出登录
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
}

/* Page Header */
.page-header {
  margin-bottom: 28px;
  animation: slideUp 0.3s ease;
}
.page-header h1 {
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
  letter-spacing: -0.4px;
}
.page-header p {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Profile Card */
.profile-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 32px;
  max-width: 620px;
  box-shadow: var(--shadow-sm);
  animation: slideUp 0.3s ease;
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 24px;
}
.profile-avatar-large {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--accent-gradient);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: var(--shadow-accent);
}
.profile-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
}
.profile-id {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
.profile-role-badge {
  display: inline-block;
  margin-top: 8px;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  background: var(--accent-bg);
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.profile-role-badge.user {
  background: var(--info-bg);
  color: var(--info);
}

/* Profile Stats */
.profile-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.profile-stat {
  text-align: center;
  padding: 16px 8px;
  background: var(--bg-input);
  border-radius: var(--radius);
}
.profile-stat-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--text);
}
.profile-stat-label {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* Profile Actions */
.profile-actions {
  display: flex;
  gap: 12px;
}
.profile-actions .btn {
  flex: 1;
  justify-content: center;
}

/* Buttons */
.btn {
  padding: 11px 22px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
  font-family: var(--font-ui);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  white-space: nowrap;
}
.btn-secondary {
  background: var(--bg-card);
  color: var(--text);
  border: 1px solid var(--border);
}
.btn-secondary:hover {
  background: var(--bg-hover);
  border-color: var(--text-tertiary);
}
.btn-danger {
  background: linear-gradient(135deg, #c25b5b, #a84848);
  color: white;
  box-shadow: 0 2px 8px rgba(194, 91, 91, 0.2);
}
.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(194, 91, 91, 0.3);
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none !important;
}

@media (max-width: 560px) {
  .profile-card {
    padding: 24px 20px;
  }
  .profile-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .profile-actions {
    flex-direction: column;
  }
}
</style>
