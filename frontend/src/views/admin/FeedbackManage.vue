<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import FilterTabs from '@/components/common/FilterTabs.vue'
import { getFeedback, updateFeedback } from '@/api/admin'
import { useToastStore } from '@/stores/toast'
import { formatSystemDateTime } from '@/utils/dateTime'
import type { FeedbackItem, FeedbackStatus } from '@/types/models'

const toast = useToastStore()
const loading = ref(false)
const items = ref<FeedbackItem[]>([])
const activeStatus = ref<'all' | FeedbackStatus>('all')
const editing = ref<FeedbackItem | null>(null)
const note = ref('')
const saving = ref(false)

const statusTabs = [
  { key: 'all', label: '全部' },
  { key: 'open', label: '待查看' },
  { key: 'reviewed', label: '已阅读' },
  { key: 'resolved', label: '已处理' }
]
const typeLabel = { bug: '遇到问题', suggestion: '功能建议', other: '其他想说' }
const statusLabel = { open: '待查看', reviewed: '已阅读', resolved: '已处理' }
const openCount = computed(() => items.value.filter(item => item.status === 'open').length)

function errMsg(e: any, fallback = '操作失败') { return e?.data?.detail || e?.message || fallback }
async function load() {
  loading.value = true
  try {
    const result = await getFeedback(activeStatus.value === 'all' ? undefined : { status: activeStatus.value })
    items.value = result.items
  } catch (e: any) { toast.error(errMsg(e, '加载反馈失败')) } finally { loading.value = false }
}
function openEditor(item: FeedbackItem) { editing.value = item; note.value = item.admin_note || '' }
async function save(status: FeedbackStatus) {
  if (!editing.value) return
  saving.value = true
  try {
    await updateFeedback(editing.value.id, { status, admin_note: note.value.trim() || undefined })
    toast.success('处理状态已更新')
    editing.value = null
    load()
  } catch (e: any) { toast.error(errMsg(e, '更新失败')) } finally { saving.value = false }
}
onMounted(load)
</script>

<template>
  <AppLayout>
    <main class="page">
      <header class="page-header">
        <span>LISTENING DESK / USER NOTES</span>
        <h1>用户反馈</h1>
        <p>查看用户在网页使用过程中的问题、建议与留言。<b v-if="openCount">当前列表有 {{ openCount }} 条待查看。</b></p>
      </header>
      <FilterTabs v-model="activeStatus" :tabs="statusTabs" @update:model-value="load" />
      <div v-if="loading" class="loading">正在翻阅反馈…</div>
      <div v-else-if="items.length" class="feedback-list">
        <article v-for="item in items" :key="item.id" class="feedback-card">
          <div class="feedback-card__rail"></div>
          <div class="feedback-card__main">
            <div class="feedback-card__meta"><span class="type">{{ typeLabel[item.feedback_type] }}</span><span class="status" :class="item.status">{{ statusLabel[item.status] }}</span><time>{{ formatSystemDateTime(item.created_at) }}</time></div>
            <p class="feedback-card__content">{{ item.content }}</p>
            <div class="feedback-card__from"><b>{{ item.user_name }}</b> · {{ item.user_student_id }}<span v-if="item.contact"> · 联系方式：{{ item.contact }}</span></div>
            <div v-if="item.admin_note" class="feedback-card__note">管理员备注：{{ item.admin_note }}</div>
          </div>
          <button class="handle" type="button" @click="openEditor(item)">处理</button>
        </article>
      </div>
      <EmptyState v-else icon="clipboard" text="这里还没有用户反馈" />
      <div v-if="editing" class="mask" @click.self="editing = null"><section class="dialog"><button class="close" type="button" @click="editing = null">×</button><span>FEEDBACK #{{ editing.id }}</span><h2>处理这条反馈</h2><p>{{ editing.content }}</p><textarea v-model="note" maxlength="1000" placeholder="写下将向用户公开的处理说明"></textarea><div class="dialog-actions"><button type="button" :disabled="saving" @click="save('reviewed')">标为已阅读</button><button type="button" class="resolve" :disabled="saving" @click="save('resolved')">标为已处理</button></div></section></div>
    </main>
  </AppLayout>
</template>

<style scoped>
.page { max-width: 1080px; margin: 0 auto; }.page-header { margin-bottom: 20px; padding: 24px 0 30px; border-top: 1px solid var(--text); border-bottom: 1px solid var(--text); }.page-header span,.dialog>span { color: var(--accent); font:700 10px/1 var(--font-ui); letter-spacing:.19em; }.page-header h1 { margin:20px 0 8px; font:500 clamp(48px,6vw,72px)/.9 var(--font); }.page-header p { margin:0; color:var(--text-secondary); font:13px/1.6 var(--font-ui); }.page-header b { color:var(--accent); }.feedback-list { margin-top:18px; border-top:1px solid var(--text); }.feedback-card { display:grid; grid-template-columns:6px 1fr auto; gap:18px; padding:18px 16px 18px 0; border-bottom:1px solid var(--border); background:var(--bg-card); }.feedback-card__rail { background:var(--accent); }.feedback-card__meta { display:flex; flex-wrap:wrap; gap:8px; align-items:center; color:var(--text-tertiary); font:11px/1 var(--font-ui); }.type,.status { padding:4px 7px; border:1px solid var(--border); }.status.open { color:#a65d35; border-color:#d6a47b; }.status.reviewed { color:#5f6e9d; }.status.resolved { color:#3f7c59; }.feedback-card__content { margin:12px 0; white-space:pre-wrap; color:var(--text); font:15px/1.7 var(--font-ui); }.feedback-card__from,.feedback-card__note { color:var(--text-tertiary); font:11px/1.6 var(--font-ui); }.feedback-card__note { margin-top:8px; padding:8px 10px; background:var(--bg-input); }.handle { align-self:start; padding:8px 12px; border:1px solid var(--text); background:transparent; color:var(--text); font:600 11px/1 var(--font-ui); cursor:pointer; }.handle:hover { background:var(--text); color:var(--bg-card); }.loading { padding:50px; text-align:center; color:var(--text-tertiary); }.mask { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; padding:20px; background:rgba(22,22,19,.65); }.dialog { position:relative; width:min(560px,100%); padding:30px; background:#f2efe7; border-top:5px solid #191917; box-shadow:14px 14px 0 rgba(202,161,55,.7); }.close { position:absolute; top:10px; right:15px; border:0; background:none; font-size:28px; cursor:pointer; }.dialog h2 { margin:12px 0; font:500 32px/1 var(--font); }.dialog p { color:var(--text-secondary); font:13px/1.7 var(--font-ui); }.dialog textarea { box-sizing:border-box; width:100%; min-height:110px; margin-top:12px; padding:12px; border:1px solid var(--border); border-radius:0; background:var(--bg-input); font:13px/1.6 var(--font-ui); resize:vertical; }.dialog-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:18px; }.dialog-actions button { padding:10px 12px; border:1px solid var(--text); background:transparent; cursor:pointer; font:600 12px/1 var(--font-ui); }.dialog-actions .resolve { background:var(--text); color:var(--bg-card); }.dialog-actions button:disabled { opacity:.5; cursor:wait; }@media(max-width:640px){.feedback-card{grid-template-columns:5px 1fr;}.handle{grid-column:2;justify-self:start;}.dialog{padding:24px 18px;}}
</style>
