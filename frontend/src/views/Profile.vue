<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import AvatarCropper from '@/components/common/AvatarCropper.vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { getRequests } from '@/api/borrow'
import { uploadAvatar } from '@/api/auth'
import {
  editorialSoundEnabled,
  playStampSound,
  setEditorialSoundEnabled
} from '@/utils/editorialSound'
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
const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
const avatarCropFile = ref<File | null>(null)

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

function toggleEditorialSound() {
  setEditorialSoundEnabled(!editorialSoundEnabled.value)
}

function chooseAvatar() {
  if (!avatarUploading.value) avatarInput.value?.click()
}

async function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    toast.warning('仅支持 JPEG、PNG、GIF 或 WebP 图片')
    input.value = ''
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.warning('头像图片不能超过 10MB')
    input.value = ''
    return
  }

  avatarCropFile.value = file
  input.value = ''
}

function cancelAvatarCrop() {
  avatarCropFile.value = null
}

async function uploadCroppedAvatar(file: File) {
  avatarCropFile.value = null
  avatarUploading.value = true
  try {
    await uploadAvatar(file)
    await authStore.fetchUser()
    toast.success('头像已更新')
    playStampSound()
  } catch (e: any) {
    toast.error(errMsg(e, '头像上传失败'))
  } finally {
    avatarUploading.value = false
  }
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
          <div class="profile-avatar-wrap">
            <div
              class="profile-avatar-large"
              :class="{ 'is-uploading': avatarUploading }"
            >
              <img
                v-if="authStore.user.avatar_url"
                :src="authStore.user.avatar_url"
                :alt="`${authStore.user.name}的头像`"
              />
              <span v-else>{{ getInitials(authStore.user.name) }}</span>
            </div>
            <button
              type="button"
              class="avatar-edit"
              :disabled="avatarUploading"
              @click="chooseAvatar"
            >
              {{ avatarUploading ? '上传中' : '更换头像' }}
            </button>
            <input
              ref="avatarInput"
              class="avatar-input"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              @change="handleAvatarChange"
            />
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

        <section class="experience-setting">
          <div>
            <span class="experience-kicker">EDITORIAL EXPERIENCE</span>
            <strong>界面声音</strong>
            <p>开启后可听到轻微的翻页、书签和盖章声，设置仅保存在当前设备。</p>
          </div>
          <button
            type="button"
            class="sound-switch"
            :class="{ active: editorialSoundEnabled }"
            role="switch"
            :aria-checked="editorialSoundEnabled"
            @click="toggleEditorialSound"
          >
            <span></span>
            {{ editorialSoundEnabled ? '已开启' : '已关闭' }}
          </button>
        </section>

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
    <AvatarCropper
      :file="avatarCropFile"
      @cancel="cancelAvatarCrop"
      @confirm="uploadCroppedAvatar"
    />
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
  padding: 22px 0 28px;
  border-top: 1px solid var(--text);
  border-bottom: 1px solid var(--text);
  animation: slideUp 0.3s ease;
}
.page-header::before {
  content: 'MEMBER FILE / PERSONAL ARCHIVE';
  display: block;
  margin-bottom: 26px;
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.22em;
}
.page-header h1 {
  font-family: var(--font);
  font-size: clamp(46px, 5vw, 70px);
  font-weight: 500;
  line-height: 0.94;
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
  border-radius: 1px;
  border-top: 5px solid var(--text);
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
  border-radius: 0;
  background: var(--text);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: var(--shadow-accent);
  overflow: hidden;
  transition: opacity var(--transition);
}
.profile-avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.profile-avatar-large.is-uploading {
  opacity: 0.45;
}
.profile-avatar-wrap {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}
.avatar-edit {
  width: 72px;
  padding: 5px 0;
  border: 0;
  border-bottom: 1px solid var(--text);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-ui);
  font-size: 11px;
  cursor: pointer;
}
.avatar-edit:hover:not(:disabled) {
  color: var(--accent);
  border-color: var(--accent);
}
.avatar-edit:disabled {
  cursor: wait;
}
.avatar-input {
  display: none;
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
  border-radius: 1px;
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
  grid-template-columns: repeat(5, 1fr);
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

.experience-setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  margin: 0 0 24px;
  padding: 18px 0;
  border-top: 1px solid var(--border-light);
  border-bottom: 1px solid var(--border-light);
}
.experience-setting strong { display: block; margin-top: 8px; font: 600 16px/1 var(--font); }
.experience-setting p { max-width: 350px; margin: 7px 0 0; color: var(--text-tertiary); font: 11px/1.6 var(--font-ui); }
.experience-kicker { color: var(--accent); font: 700 9px/1 var(--font-ui); letter-spacing: .16em; }
.sound-switch {
  min-width: 92px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  font: 600 11px/1 var(--font-ui);
  cursor: pointer;
}
.sound-switch span { width: 11px; height: 11px; border-radius: 50%; background: var(--text-tertiary); box-shadow: 0 0 0 4px var(--bg-input); }
.sound-switch.active { border-color: #9d604d; color: #9d604d; }
.sound-switch.active span { background: #9d604d; box-shadow: 0 0 0 4px rgba(157,96,77,.15); }

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
  .experience-setting { align-items: flex-start; flex-direction: column; }
}
</style>
