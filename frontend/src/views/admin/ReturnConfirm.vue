<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NTag, NButton, NSpin, NImage, NPopconfirm } from 'naive-ui'
import AppLayout from '@/components/AppLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { getRequests } from '@/api/borrow'
import { confirmReturn } from '@/api/admin'
import { useToastStore } from '@/stores/toast'
import type { BorrowDetail, PaginatedResponse } from '@/types/models'

const toast = useToastStore()

const loading = ref(false)
const confirmingId = ref<number | null>(null)
const records = ref<BorrowDetail[]>([])

/** 日期格式化：YYYY-MM-DD HH:mm */
function fmt(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 统一错误信息提取 */
function errMsg(e: any, fallback = '操作失败'): string {
  const d = e?.data?.detail
  if (typeof d === 'string' && d) return d
  if (d && typeof d === 'object' && d.message) return d.message
  return e?.message || fallback
}

/**
 * 兼容返回结构：
 * - 类型声明为 BorrowDetail[]，但后端可能返回分页结构 { items, total, page, size }
 * - 这里两种都能处理
 */
function normalize(data: any): BorrowDetail[] {
  if (Array.isArray(data)) return data as BorrowDetail[]
  if (data && Array.isArray((data as PaginatedResponse<BorrowDetail>).items)) {
    return (data as PaginatedResponse<BorrowDetail>).items
  }
  return []
}

/** 加载待归还确认的记录（status=return_pending） */
async function loadRecords() {
  loading.value = true
  try {
    const all: BorrowDetail[] = []
    let page = 1
    const size = 100
    // return_pending 通常不多，循环拉取兜底，最多 5 页
    for (let i = 0; i < 5; i++) {
      const res = (await getRequests({
        status: 'return_pending',
        page,
        size
      } as any)) as any
      const list = normalize(res)
      all.push(...list)
      const total = typeof res?.total === 'number' ? res.total : list.length
      if (list.length === 0 || all.length >= total) break
      page++
    }
    records.value = all
  } catch (e: any) {
    toast.error(errMsg(e, '加载归还记录失败'))
    records.value = []
  } finally {
    loading.value = false
  }
}

/** 确认归还完成 */
async function handleConfirm(r: BorrowDetail) {
  confirmingId.value = r.id
  try {
    await confirmReturn(r.id)
    toast.success('归还确认完成')
    // 刷新列表
    await loadRecords()
  } catch (e: any) {
    toast.error(errMsg(e, '确认失败'))
  } finally {
    confirmingId.value = null
  }
}

onMounted(loadRecords)
</script>

<template>
  <AppLayout>
    <div class="page">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">归还确认</h1>
        <p class="page-desc">确认用户归还的设备</p>
      </div>

      <n-spin :show="loading">
        <div class="spin-area">
          <div v-if="records.length" class="return-list">
            <div v-for="r in records" :key="r.id" class="return-card">
              <!-- 卡片头部：工单号 + 状态标签 -->
              <div class="card-head">
                <span class="work-order">{{ r.work_order_no }}</span>
                <n-tag type="warning" size="small" round>待归还确认</n-tag>
              </div>

              <!-- 卡片主体 -->
              <div class="card-body">
                <div class="field">
                  <span class="label">设备</span>
                  <span class="value">{{ r.equipment_name }}</span>
                </div>
                <div class="field">
                  <span class="label">借用人</span>
                  <span class="value">{{ r.user_name }}</span>
                </div>
                <div class="field">
                  <span class="label">借用时间</span>
                  <span class="value">{{ fmt(r.borrow_time) }}</span>
                </div>
                <div class="field">
                  <span class="label">归还时间</span>
                  <span class="value">{{ fmt(r.return_time) }}</span>
                </div>
                <div v-if="r.card_name" class="field">
                  <span class="label">配套内存卡</span>
                  <span class="value">{{ r.card_name }}</span>
                </div>
                <div v-if="r.return_photo_url" class="field full">
                  <span class="label">归还照片</span>
                  <div class="photo-wrap">
                    <n-image
                      :src="r.return_photo_url"
                      :preview-src="r.return_photo_url"
                      :width="96"
                      :height="96"
                      object-fit="cover"
                      class="return-photo"
                      alt="归还照片"
                    />
                  </div>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="card-actions">
                <n-popconfirm @positive-click="handleConfirm(r)">
                  <template #trigger>
                    <n-button
                      type="success"
                      :loading="confirmingId === r.id"
                    >
                      确认归还完成
                    </n-button>
                  </template>
                  确认设备已归还入库？确认后状态将变为「已归还」。
                </n-popconfirm>
              </div>
            </div>
          </div>
          <EmptyState
            v-else-if="!loading"
            icon="📦"
            text="暂无待归还确认的记录"
          />
        </div>
      </n-spin>
    </div>
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 1100px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 20px;
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--text);
}
.page-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}
.spin-area {
  min-height: 220px;
}
.return-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.return-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--border);
}
.work-order {
  font-weight: 700;
  font-size: 15px;
  color: var(--text);
  letter-spacing: 0.3px;
}
.card-body {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px 16px;
}
.field {
  display: flex;
  gap: 8px;
  font-size: 13px;
  line-height: 1.7;
}
.field.full {
  grid-column: 1 / -1;
}
.field .label {
  color: var(--text-tertiary);
  flex-shrink: 0;
  min-width: 72px;
}
.field .value {
  color: var(--text);
  word-break: break-word;
}
.photo-wrap {
  display: inline-block;
}
.return-photo :deep(.n-image-img) {
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: transform 0.2s;
}
.return-photo :deep(.n-image-img:hover) {
  transform: scale(1.04);
}
.card-actions {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
