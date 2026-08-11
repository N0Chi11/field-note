<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NSpin } from 'naive-ui'
import AppLayout from '@/components/AppLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import FilterTabs from '@/components/common/FilterTabs.vue'
import EditorialIcon from '@/components/common/EditorialIcon.vue'
import type { EditorialIconName } from '@/components/common/EditorialIcon.vue'
import { getLogs } from '@/api/admin'
import { useToastStore } from '@/stores/toast'
import { formatSystemDateTime, parseSystemDateTime } from '@/utils/dateTime'
import type { OperationLog, PaginatedResponse } from '@/types/models'

const toast = useToastStore()

/** 操作类型元数据：图标、颜色 */
interface ActionMeta {
  icon: EditorialIconName
  color: string
}

/** 后端实际写入的 action 字符串（中文）与图标/颜色映射 */
const ACTION_META: Record<string, ActionMeta> = {
  提交申请: { icon: 'tag', color: 'var(--info)' },
  审批通过: { icon: 'approved', color: 'var(--success)' },
  拒绝申请: { icon: 'rejected', color: 'var(--danger)' },
  确认领取: { icon: 'parcel', color: 'var(--warning)' },
  提交归还: { icon: 'camera', color: 'var(--warning)' },
  确认归还: { icon: 'refresh', color: 'var(--success)' },
  取消申请: { icon: 'cancelled', color: 'var(--text-tertiary)' },
  删除记录: { icon: 'delete', color: 'var(--danger)' },
  添加设备: { icon: 'add', color: 'var(--success)' },
  编辑设备: { icon: 'edit', color: 'var(--warning)' },
  删除设备: { icon: 'delete', color: 'var(--danger)' },
  设备设为维修: { icon: 'maintenance', color: 'var(--warning)' },
  设备设为可用: { icon: 'approved', color: 'var(--success)' },
  添加内存卡: { icon: 'add', color: 'var(--success)' },
  编辑内存卡: { icon: 'edit', color: 'var(--warning)' },
  删除内存卡: { icon: 'delete', color: 'var(--danger)' }
}

const DEFAULT_META: ActionMeta = {
  icon: 'clipboard',
  color: 'var(--text-tertiary)'
}

function metaOf(action: string): ActionMeta {
  return ACTION_META[action] || DEFAULT_META
}

/** 筛选标签：全部 + 各操作类型 */
const tabs = [
  { key: 'all', label: '全部' },
  { key: '提交申请', label: '提交申请' },
  { key: '审批通过', label: '审批通过' },
  { key: '拒绝申请', label: '拒绝申请' },
  { key: '确认领取', label: '确认领取' },
  { key: '提交归还', label: '提交归还' },
  { key: '确认归还', label: '确认归还' },
  { key: '取消申请', label: '取消申请' },
  { key: '删除记录', label: '删除记录' },
  { key: '添加设备', label: '添加设备' },
  { key: '编辑设备', label: '编辑设备' },
  { key: '删除设备', label: '删除设备' },
  { key: '设备设为维修', label: '设备设为维修' },
  { key: '设备设为可用', label: '设备设为可用' },
  { key: '添加内存卡', label: '添加内存卡' },
  { key: '编辑内存卡', label: '编辑内存卡' },
  { key: '删除内存卡', label: '删除内存卡' }
]

const loading = ref(false)
const logs = ref<OperationLog[]>([])
const activeTab = ref<string>('all')

/** 预计算每条日志的元数据，避免模板中多次调用 */
const logsWithMeta = computed(() =>
  logs.value.map((log) => ({ log, meta: metaOf(log.action) }))
)

/** 相对时间格式化 */
function fmtLogTime(iso: string): string {
  const d = parseSystemDateTime(iso)
  if (!d) return ''
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 604800000) return Math.floor(diff / 86400000) + '天前'
  return formatSystemDateTime(d).slice(5).replace('-', '.')
}

/** 统一错误信息提取 */
function errMsg(e: any, fallback = '操作失败'): string {
  const d = e?.data?.detail
  if (typeof d === 'string' && d) return d
  if (d && typeof d === 'object' && d.message) return d.message
  return e?.message || fallback
}

/**
 * 加载日志列表（按 action 筛选）
 * 注意：getLogs 可能返回数组或分页对象，用 Array.isArray 兼容处理
 */
async function loadLogs() {
  loading.value = true
  try {
    const params: any = {}
    if (activeTab.value !== 'all') {
      params.action = activeTab.value
    }
    const result = (await getLogs(params)) as unknown as
      | OperationLog[]
      | PaginatedResponse<OperationLog>
    logs.value = Array.isArray(result) ? result : result.items
  } catch (e: any) {
    toast.error(errMsg(e, '加载日志失败'))
    logs.value = []
  } finally {
    loading.value = false
  }
}

/** 切换筛选标签 */
function onTabChange(v: string) {
  activeTab.value = v
  loadLogs()
}

onMounted(loadLogs)
</script>

<template>
  <AppLayout>
    <div class="page">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">操作日志</h1>
        <p class="page-desc">查看所有借用审批与设备管理操作记录</p>
      </div>

      <!-- 筛选标签栏 -->
      <div class="toolbar">
        <FilterTabs v-model="activeTab" :tabs="tabs" @update:model-value="onTabChange" />
      </div>

      <!-- 日志列表 -->
      <n-spin :show="loading">
        <div class="spin-area">
          <div v-if="logs.length" class="log-list">
            <div
              v-for="{ log, meta } in logsWithMeta"
              :key="log.id"
              class="log-item"
            >
              <!-- 左侧彩色图标 -->
              <div
                class="log-icon"
                :style="{
                  color: meta.color,
                  background: `color-mix(in srgb, ${meta.color} 14%, transparent)`
                }"
              >
                <EditorialIcon :name="meta.icon" :size="34" />
              </div>

              <!-- 中间主体 -->
              <div class="log-main">
                <div class="log-top">
                  <span class="log-action" :style="{ color: meta.color }">
                    {{ log.action }}
                  </span>
                </div>
                <div v-if="log.detail" class="log-detail">{{ log.detail }}</div>
                <div class="log-foot">
                  <span class="log-actor">{{ log.actor_name }}</span>
                  <span class="log-time">{{ fmtLogTime(log.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
          <EmptyState v-else-if="!loading" icon="clipboard" text="暂无操作日志" />
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
  margin-bottom: 22px;
  padding: 20px 0 26px;
  border-top: 1px solid var(--text);
  border-bottom: 1px solid var(--text);
}
.page-header::before {
  content: 'SYSTEM CHRONICLE / AUDIT LOG';
  display: block;
  margin-bottom: 24px;
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.22em;
}
.page-title {
  font-size: clamp(44px, 5vw, 68px);
  font-weight: 500;
  line-height: 0.94;
  margin: 0 0 6px;
  color: var(--text);
}
.page-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}
.toolbar {
  margin-bottom: 16px;
}
.spin-area {
  min-height: 240px;
}
.log-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.log-item {
  display: flex;
  gap: 14px;
  padding: 14px 16px;
  background: var(--bg-card);
  border-radius: 0;
  border: 0;
  border-top: 1px solid var(--text);
  transition: box-shadow 0.15s;
}
.log-item:hover {
  box-shadow: var(--shadow-sm);
}
.log-icon {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
}
.log-main {
  flex: 1;
  min-width: 0;
}
.log-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.log-action {
  font-weight: 600;
  font-size: 14px;
}
.log-detail {
  font-size: 13px;
  color: var(--text-secondary);
  word-break: break-word;
  line-height: 1.6;
  margin-bottom: 6px;
}
.log-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-tertiary);
}
.log-actor {
  color: var(--text-secondary);
  font-weight: 500;
}
.log-time {
  margin-left: auto;
}
</style>
