<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NSpin } from 'naive-ui'
import AppLayout from '@/components/AppLayout.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { getYearbook } from '@/api/experience'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import { getEditorialPoem } from '@/utils/editorialPoetry'
import { downloadYearbookPoster } from '@/utils/posterExport'
import type { YearbookData } from '@/types/models'

const toast = useToastStore()
const authStore = useAuthStore()
const selectedYear = ref(new Date().getFullYear())
const loading = ref(false)
const data = ref<YearbookData | null>(null)
const poem = getEditorialPoem()

const hasStory = computed(() => (data.value?.successful_borrows || 0) > 0)

async function load() {
  loading.value = true
  try {
    data.value = await getYearbook(selectedYear.value)
  } catch (error: any) {
    toast.error(error?.message || '借用年鉴加载失败')
  } finally {
    loading.value = false
  }
}

function changeYear(event: Event) {
  selectedYear.value = Number((event.target as HTMLSelectElement).value)
  load()
}

async function download() {
  if (!data.value) return
  try {
    await downloadYearbookPoster(data.value, poem, authStore.user?.avatar_url)
    toast.success('年鉴海报已生成')
  } catch (error: any) {
    toast.error(error?.message || '海报生成失败')
  }
}

onMounted(load)
</script>

<template>
  <AppLayout>
    <main class="yearbook-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">PERSONAL ARCHIVE / ANNUAL EDITION</p>
          <h1>借用年鉴</h1>
        </div>
        <div class="header-actions">
          <select :value="selectedYear" aria-label="选择年份" @change="changeYear">
            <option v-for="year in data?.available_years || [selectedYear]" :key="year" :value="year">
              {{ year }} 年
            </option>
          </select>
          <button type="button" :disabled="!data" @click="download">下载画报</button>
        </div>
      </header>

      <n-spin :show="loading">
        <section v-if="data" class="yearbook-sheet">
          <div class="issue-line">
            <span>NEW MEDIA CENTER</span><span>NO. {{ data.year }}</span>
          </div>
          <div class="year-hero">
            <div class="year">{{ data.year }}</div>
            <div class="identity">
              <div class="portrait">
                <img v-if="authStore.user?.avatar_url" :src="authStore.user.avatar_url" alt="个人头像" />
                <span v-else>{{ data.user_name.charAt(0) }}</span>
              </div>
              <p>ANNUAL EQUIPMENT ARCHIVE</p>
              <h2>{{ data.user_name }}</h2>
              <span>{{ data.student_id }}</span>
            </div>
          </div>

          <div class="stat-grid">
            <article><strong>{{ data.successful_borrows }}</strong><span>有效借用</span></article>
            <article><strong>{{ data.total_hours }}</strong><span>累计小时</span></article>
            <article><strong>{{ data.returned_count }}</strong><span>完成归还</span></article>
            <article><strong>{{ data.on_time_rate }}%</strong><span>准时归还</span></article>
          </div>

          <div v-if="hasStory" class="archive-columns">
            <section class="ranking">
              <p class="section-label">MOST BORROWED / 器材索引</p>
              <ol>
                <li v-for="item in data.top_equipment" :key="item.equipment_id">
                  <span>{{ item.name }} <small>{{ item.code }}</small></span>
                  <strong>{{ item.count }}</strong>
                </li>
              </ol>
            </section>
            <section class="projects">
              <p class="section-label">RECENT STORIES / 最近项目</p>
              <article v-for="project in data.recent_projects.slice(0, 4)" :key="project.work_order_no">
                <span>{{ project.equipment_name }}</span>
                <p>{{ project.reason }}</p>
              </article>
            </section>
          </div>
          <EmptyState
            v-else
            icon="clipboard"
            text="这一年的故事还没有开始"
            sub-text="完成第一笔有效借用后，年鉴会自动生长"
          />

          <blockquote>
            <span v-for="line in poem.lines" :key="line">{{ line }}</span>
            <cite>— {{ poem.author }} / {{ poem.title }}</cite>
          </blockquote>
        </section>
      </n-spin>
    </main>
  </AppLayout>
</template>

<style scoped>
.yearbook-page { max-width: 1180px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: end; gap: 24px; padding: 22px 0 30px; border-block: 1px solid var(--text); }
.eyebrow { margin: 0 0 26px; color: var(--accent); font: 700 10px/1 var(--font-ui); letter-spacing: .22em; }
h1 { margin: 0; font: 500 clamp(50px, 7vw, 88px)/.88 var(--font); letter-spacing: -.055em; }
.header-actions { display: flex; gap: 8px; }.header-actions select,.header-actions button { height: 40px; border: 1px solid var(--text); background: transparent; padding: 0 14px; font-family: var(--font-ui); }.header-actions button { background: var(--text); color: var(--bg-card); cursor: pointer; }
.yearbook-sheet { position: relative; margin: 28px auto; background: var(--bg-card); border: 1px solid var(--text); padding: 28px 34px 36px 48px; box-shadow: 10px 12px 0 rgba(25,25,23,.12); overflow: hidden; }
.yearbook-sheet::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 12px; background: var(--accent); }
.issue-line { display: flex; justify-content: space-between; color: var(--text-secondary); font: 700 10px/1 var(--font-ui); letter-spacing: .18em; }
.year-hero { display: grid; grid-template-columns: 1.15fr .85fr; align-items: end; padding: 26px 0 30px; border-bottom: 2px solid var(--text); }
.year { font: 500 clamp(100px, 17vw, 210px)/.75 Georgia, var(--font); letter-spacing: -.08em; }.identity { position: relative; padding: 0 96px 4px 0; }.identity p { color: var(--accent); font: 700 10px/1 var(--font-ui); letter-spacing: .18em; }.identity h2 { margin: 16px 0 4px; font: 500 clamp(30px, 5vw, 58px)/1 var(--font); }.identity > span { color: var(--text-tertiary); }.portrait { position: absolute; right: 0; bottom: 0; width: 74px; height: 74px; border-radius: 50%; border: 3px solid #b89a63; background: #191917; color: #f2efe7; overflow: hidden; display: grid; place-items: center; font: 500 32px/1 Georgia, serif; }.portrait img { width: 100%; height: 100%; object-fit: cover; }
.stat-grid { display: grid; grid-template-columns: repeat(4,1fr); border-bottom: 1px solid var(--text); }.stat-grid article { padding: 24px 18px 22px 0; border-right: 1px solid var(--border); }.stat-grid article:last-child { border: 0; }.stat-grid strong { display: block; font: 500 clamp(38px, 5vw, 68px)/1 Georgia, var(--font); }.stat-grid article:first-child strong { color: #9d604d; }.stat-grid span { display: block; margin-top: 9px; color: var(--text-tertiary); font: 700 10px/1 var(--font-ui); letter-spacing: .13em; }
.archive-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 44px; padding: 32px 0; }.section-label { padding-bottom: 10px; border-bottom: 2px solid var(--text); font: 700 10px/1 var(--font-ui); letter-spacing: .14em; }.ranking ol { list-style: decimal-leading-zero; padding-left: 28px; }.ranking li { padding: 10px 0; border-bottom: 1px solid var(--border); }.ranking li span { display: inline-flex; flex-direction: column; }.ranking li > strong { float: right; font: 500 25px/1 Georgia; }.ranking small { color: var(--text-tertiary); margin-top: 3px; }.projects article { padding: 10px 0; border-bottom: 1px solid var(--border); }.projects article span { color: var(--accent); font: 700 10px/1 var(--font-ui); letter-spacing: .1em; }.projects article p { margin: 5px 0 0; line-height: 1.5; }
blockquote { margin: 20px 0 0; padding: 26px 0 0; border-top: 2px solid #b89a63; display: flex; flex-direction: column; font: 500 22px/1.55 var(--font); }blockquote cite { margin-top: 12px; color: var(--text-tertiary); font: 600 10px/1 var(--font-ui); letter-spacing: .1em; text-transform: uppercase; }
@media (max-width: 720px) { .page-header { align-items: start; flex-direction: column; }.yearbook-sheet { padding: 22px 18px 28px 32px; }.year-hero,.archive-columns { grid-template-columns: 1fr; gap: 18px; }.stat-grid { grid-template-columns: 1fr 1fr; }.year { font-size: 96px; }.stat-grid strong { font-size: 42px; } }
</style>
