<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import EditorialIcon from '@/components/common/EditorialIcon.vue'
import { getMyFeedback, submitFeedback } from '@/api/experience'
import { useToastStore } from '@/stores/toast'
import { formatSystemDateTime } from '@/utils/dateTime'
import type { FeedbackItem, FeedbackType } from '@/types/models'

const toast = useToastStore()
const submitting = ref(false)
const feedbackType = ref<FeedbackType>('suggestion')
const content = ref('')
const contact = ref('')
const feedbackHistory = ref<FeedbackItem[]>([])
const historyLoading = ref(false)

const typeOptions: Array<{ value: FeedbackType; label: string; desc: string }> = [
  { value: 'suggestion', label: '功能建议', desc: '想让系统变得更好用的新想法' },
  { value: 'bug', label: '遇到问题', desc: '页面异常、操作不顺或显示错误' },
  { value: 'other', label: '其他想说', desc: '任何与网页使用有关的留言' }
]

function errMsg(e: any, fallback = '提交失败，请稍后再试') {
  return e?.data?.detail || e?.message || fallback
}

async function submit() {
  if (content.value.trim().length < 5) {
    toast.warning('请至少写下 5 个字，让我们更好理解你的反馈')
    return
  }
  submitting.value = true
  try {
    await submitFeedback({
      feedback_type: feedbackType.value,
      content: content.value.trim(),
      contact: contact.value.trim() || undefined
    })
    content.value = ''
    contact.value = ''
    feedbackType.value = 'suggestion'
    await loadHistory()
    toast.success('反馈已寄出，感谢你的认真表达')
  } catch (e: any) {
    toast.error(errMsg(e))
  } finally {
    submitting.value = false
  }
}

const typeLabel = { bug: '遇到问题', suggestion: '功能建议', other: '其他想说' }
const statusLabel = { open: '待查看', reviewed: '已阅读', resolved: '已处理' }

async function loadHistory() {
  historyLoading.value = true
  try {
    feedbackHistory.value = await getMyFeedback()
  } catch (e: any) {
    toast.error(errMsg(e, '反馈记录加载失败'))
  } finally {
    historyLoading.value = false
  }
}

onMounted(loadHistory)
</script>

<template>
  <AppLayout>
    <main class="page">
      <header class="page-header">
        <span>OPEN LETTER / SYSTEM FEEDBACK</span>
        <h1>留下你的<br />一页意见</h1>
        <p>页面哪里不顺手、还缺少什么，或者只是一个灵光乍现的想法，都可以写给我们。</p>
      </header>

      <section class="feedback-sheet">
        <div class="sheet-mark"><EditorialIcon name="edit" :size="48" /></div>
        <div class="form-body">
          <div class="section-label">01 / 反馈类型</div>
          <div class="type-grid">
            <button
              v-for="option in typeOptions"
              :key="option.value"
              type="button"
              class="type-card"
              :class="{ active: feedbackType === option.value }"
              @click="feedbackType = option.value"
            >
              <strong>{{ option.label }}</strong>
              <span>{{ option.desc }}</span>
            </button>
          </div>

          <label class="field">
            <span class="section-label">02 / 具体说说</span>
            <textarea v-model="content" maxlength="2000" placeholder="例如：在手机上查看借用日历时，希望能更方便地切换日期……"></textarea>
            <em>{{ content.length }} / 2000</em>
          </label>

          <label class="field field--contact">
            <span class="section-label">03 / 联系方式（选填）</span>
            <input v-model="contact" maxlength="100" placeholder="微信号、手机号或邮箱，方便管理员向你确认细节" />
          </label>

          <div class="form-foot">
            <p>管理员可查看你的姓名、学号与本条反馈；联系方式只用于跟进此事。</p>
            <button type="button" class="submit" :disabled="submitting" @click="submit">
              {{ submitting ? '正在寄出…' : '寄出这页反馈' }}
            </button>
          </div>
        </div>
      </section>

      <section class="history">
        <div class="history-head">
          <div>
            <span class="section-label">YOUR LETTERS / FOLLOW-UP</span>
            <h2>我的反馈进度</h2>
          </div>
          <button type="button" @click="loadHistory">刷新</button>
        </div>
        <p v-if="historyLoading" class="history-empty">正在整理你的留言…</p>
        <p v-else-if="!feedbackHistory.length" class="history-empty">还没有寄出的反馈；你的第一条建议会从这里开始。</p>
        <div v-else class="history-list">
          <article v-for="item in feedbackHistory" :key="item.id" class="history-item">
            <div class="history-meta">
              <span>{{ typeLabel[item.feedback_type] }}</span>
              <b :class="item.status">{{ statusLabel[item.status] }}</b>
              <time>{{ formatSystemDateTime(item.created_at) }}</time>
            </div>
            <p>{{ item.content }}</p>
            <div v-if="item.admin_note" class="reply">
              <span>管理员处理说明</span>
              <strong v-if="item.handler_name">{{ item.handler_name }}</strong>
              <p>{{ item.admin_note }}</p>
            </div>
            <div v-else-if="item.status !== 'open'" class="reply reply--plain">管理员已阅读，正在跟进中。</div>
          </article>
        </div>
      </section>
    </main>
  </AppLayout>
</template>

<style scoped>
.page { max-width: 980px; margin: 0 auto; }
.page-header { padding: 24px 0 32px; border-top: 1px solid var(--text); border-bottom: 1px solid var(--text); }
.page-header > span, .section-label { color: var(--accent); font: 700 10px/1 var(--font-ui); letter-spacing: .2em; }
.page-header h1 { margin: 24px 0 12px; font: 500 clamp(48px, 7vw, 82px)/.85 var(--font); letter-spacing: -.06em; }
.page-header p { max-width: 480px; margin: 0; color: var(--text-secondary); font: 14px/1.7 var(--font-ui); }
.feedback-sheet { position: relative; display: grid; grid-template-columns: 94px 1fr; margin-top: 26px; background: var(--bg-card); border: 1px solid var(--border); border-top: 5px solid var(--text); box-shadow: var(--shadow-sm); }
.sheet-mark { display: grid; place-items: start center; padding-top: 28px; border-right: 1px solid var(--border-light); color: var(--accent); }
.form-body { padding: 28px; }
.type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0 28px; }
.type-card { min-height: 92px; padding: 14px; border: 1px solid var(--border); background: var(--bg-input); text-align: left; cursor: pointer; transition: .18s ease; }
.type-card:hover, .type-card.active { border-color: var(--text); background: #e9e2d6; transform: translateY(-2px); }
.type-card.active { box-shadow: inset 4px 0 var(--accent); }
.type-card strong { display: block; margin-bottom: 8px; color: var(--text); font: 600 15px/1 var(--font); }
.type-card span { color: var(--text-tertiary); font: 11px/1.5 var(--font-ui); }
.field { position: relative; display: grid; gap: 10px; margin-top: 22px; }
textarea, input { width: 100%; box-sizing: border-box; border: 1px solid var(--border); border-radius: 0; background: var(--bg-input); color: var(--text); font-family: var(--font-ui); outline: none; }
textarea { min-height: 150px; padding: 14px; resize: vertical; line-height: 1.7; }
input { padding: 12px 14px; }
textarea:focus, input:focus { border-color: var(--accent); box-shadow: 3px 3px 0 var(--accent-light); }
.field em { position: absolute; right: 10px; bottom: 9px; color: var(--text-tertiary); font: 10px/1 var(--font-ui); font-style: normal; }
.form-foot { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-top: 28px; padding-top: 18px; border-top: 1px solid var(--border-light); }
.form-foot p { max-width: 390px; margin: 0; color: var(--text-tertiary); font: 11px/1.6 var(--font-ui); }
.submit { padding: 12px 18px; border: 1px solid var(--text); background: var(--text); color: var(--bg-card); font: 600 13px/1 var(--font-ui); cursor: pointer; white-space: nowrap; }
.submit:hover:not(:disabled) { background: var(--accent); border-color: var(--accent); }
.submit:disabled { opacity: .55; cursor: wait; }
.history { margin-top: 34px; padding-top: 22px; border-top: 1px solid var(--text); }
.history-head { display:flex; align-items:end; justify-content:space-between; gap:18px; }
.history-head h2 { margin:9px 0 0; font:500 32px/1 var(--font); }
.history-head button { padding:7px 10px; border:1px solid var(--border); background:transparent; color:var(--text-secondary); font:600 11px/1 var(--font-ui); cursor:pointer; }
.history-empty { padding:26px 0; color:var(--text-tertiary); font:13px/1.6 var(--font-ui); }
.history-list { margin-top:18px; border-top:1px solid var(--border); }
.history-item { padding:18px 0; border-bottom:1px solid var(--border); }
.history-meta { display:flex; flex-wrap:wrap; align-items:center; gap:8px; color:var(--text-tertiary); font:11px/1 var(--font-ui); }
.history-meta span,.history-meta b { padding:4px 7px; border:1px solid var(--border); font-weight:600; }
.history-meta b.open { color:#a65d35; }.history-meta b.reviewed { color:#5f6e9d; }.history-meta b.resolved { color:#3f7c59; }
.history-meta time { margin-left:auto; }.history-item > p { margin:12px 0 0; color:var(--text); white-space:pre-wrap; font:14px/1.7 var(--font-ui); }
.reply { margin-top:13px; padding:12px 14px; border-left:3px solid var(--accent); background:var(--bg-input); color:var(--text-secondary); font:12px/1.65 var(--font-ui); }
.reply span { color:var(--accent); font-weight:700; font-size:10px; letter-spacing:.1em; }.reply strong { margin-left:7px; color:var(--text); font-weight:600; }.reply p { margin:7px 0 0; white-space:pre-wrap; }.reply--plain { border-left-color:var(--border); }
@media (max-width: 640px) { .feedback-sheet { grid-template-columns: 1fr; } .sheet-mark { display: none; } .form-body { padding: 22px 18px; } .type-grid { grid-template-columns: 1fr; } .type-card { min-height: 66px; } .form-foot { align-items: stretch; flex-direction: column; } .submit { width: 100%; } }
</style>
