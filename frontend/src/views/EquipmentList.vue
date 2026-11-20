<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import FilterTabs from '@/components/common/FilterTabs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import EditorialIcon from '@/components/common/EditorialIcon.vue'
import type { EditorialIconName } from '@/components/common/EditorialIcon.vue'
import EquipmentTimeline from '@/components/EquipmentTimeline.vue'
import ChristmasGiftBox from '@/components/ChristmasGiftBox.vue'
import ChristmasGiftParcel from '@/components/ChristmasGiftParcel.vue'
import { getEquipment } from '@/api/equipment'
import { addFavorite, getFavorites, removeFavorite } from '@/api/experience'
import { useToastStore } from '@/stores/toast'
import { CHRISTMAS_COVER } from '@/utils/christmasAssets'
import type { Equipment, EquipmentStatus } from '@/types/models'

const toast = useToastStore()

/* ------------------------------------------------------------------ *
 * 时间轴弹窗状态
 * ------------------------------------------------------------------ */
const timelineVisible = ref(false)
const timelineEquipmentId = ref<number | null>(null)
const giftBoxVisible = ref(false)

const loading = ref(false)
const equipmentList = ref<Equipment[]>([])
const favoriteIds = ref<Set<number>>(new Set())
const favoriteLoadingIds = ref<Set<number>>(new Set())
const activeCategory = ref('all')
const keyword = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const activeStatus = ref('all')
const loadError = ref(false)
const imageFailures = ref<Set<number>>(new Set())
const availableCount = computed(() => equipmentList.value.filter(e => e.status === 'available').length)
const visibleCount = computed(() => visibleGroups.value.reduce((total, group) => total + group.items.length, 0))

/** 类别图标映射（与原 HTML 设计一致） */
const CATEGORY_ICONS: Record<string, EditorialIconName> = {
  相机: 'camera',
  镜头: 'lens',
  稳定器: 'gimbal',
  录音设备: 'microphone',
  麦克风: 'microphone',
  灯光: 'light',
  灯具: 'light',
  三脚架: 'tripod'
}

function categoryIcon(category: string): EditorialIconName {
  return CATEGORY_ICONS[category] || 'equipment'
}

/** 状态配置：文本 + 颜色 */
const STATUS_CONFIG: Record<
  EquipmentStatus,
  { text: string; color: string; bg: string }
> = {
  available: { text: '可借用', color: 'var(--success)', bg: 'var(--success-bg)' },
  borrowed: { text: '借用中', color: 'var(--warning)', bg: 'var(--warning-bg)' },
  repair: { text: '维修中', color: 'var(--danger)', bg: 'var(--danger-bg)' }
}

function statusText(status: EquipmentStatus): string {
  return STATUS_CONFIG[status]?.text || status
}

/** 按类别分组 */
interface CategoryGroup {
  category: string
  icon: EditorialIconName
  items: Equipment[]
  count: number
}

const groupedByCategory = computed<CategoryGroup[]>(() => {
  const map = new Map<string, Equipment[]>()
  for (const e of equipmentList.value) {
    const cat = e.category || '其他'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(e)
  }
  return Array.from(map.entries()).map(([category, items]) => ({
    category,
    icon: categoryIcon(category),
    items,
    count: items.length
  }))
})

/** 顶部类别筛选标签（含数量） */
const categoryTabs = computed(() => [
  { key: 'all', label: `全部 (${equipmentList.value.length})`, icon: 'catalog' as const },
  {
    key: 'favorites',
    label: `我的收藏 (${favoriteIds.value.size})`,
    icon: 'favorite' as const
  },
  ...groupedByCategory.value.map((g) => ({
    key: g.category,
    label: `${g.category} (${g.count})`,
    icon: g.icon
  }))
])

/** 当前可见的分组 */
const visibleGroups = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase()
  return groupedByCategory.value
    .filter(group => ['all', 'favorites'].includes(activeCategory.value) || group.category === activeCategory.value)
    .map(group => {
      const items = group.items.filter(e =>
        (activeCategory.value !== 'favorites' || favoriteIds.value.has(e.id)) &&
        (activeStatus.value === 'all' || e.status === activeStatus.value) &&
        (!query || [e.name, e.code, e.category, e.notes || ''].some(value => value.toLocaleLowerCase().includes(query)))
      )
      return { ...group, items, count: items.length }
    })
    .filter(group => group.count > 0)
})

function resetFilters() {
  keyword.value = ''
  activeCategory.value = 'all'
  activeStatus.value = 'all'
}

async function clearSearch() {
  keyword.value = ''
  await nextTick()
  searchInput.value?.focus()
}

function markImageFailed(id: number) {
  imageFailures.value = new Set([...imageFailures.value, id])
}

function loadEquipment() {
  loading.value = true
  loadError.value = false
  Promise.allSettled([getEquipment(), getFavorites()])
    .then(([equipmentResult, favoriteResult]) => {
      if (equipmentResult.status === 'rejected') throw equipmentResult.reason
      const data = equipmentResult.value
      equipmentList.value = Array.isArray(data) ? data : []
      if (favoriteResult.status === 'fulfilled') {
        favoriteIds.value = new Set(
          (favoriteResult.value || []).map((favorite) => favorite.equipment_id)
        )
      }
    })
    .catch((e: any) => {
      loadError.value = true
      toast.error(errMsg(e, '加载设备列表失败'))
      equipmentList.value = []
    })
    .finally(() => {
      loading.value = false
    })
}

function isFavorite(equipmentId: number): boolean {
  return favoriteIds.value.has(equipmentId)
}

async function toggleFavorite(e: Equipment) {
  if (favoriteLoadingIds.value.has(e.id)) return
  favoriteLoadingIds.value = new Set([...favoriteLoadingIds.value, e.id])
  try {
    const wasFavorite = favoriteIds.value.has(e.id)
    if (wasFavorite) {
      await removeFavorite(e.id)
      toast.success(`已取消收藏 ${e.name}`)
    } else {
      await addFavorite(e.id)
      toast.success(
        e.status === 'available'
          ? `已收藏 ${e.name}`
          : `已收藏，${e.name} 恢复可借时会提醒你`
      )
    }
    // Merge into the latest state, so concurrent requests for different items
    // never overwrite another successful favorite operation.
    const next = new Set(favoriteIds.value)
    if (wasFavorite) next.delete(e.id)
    else next.add(e.id)
    favoriteIds.value = next
  } catch (error: any) {
    toast.error(errMsg(error, '收藏操作失败'))
  } finally {
    const next = new Set(favoriteLoadingIds.value)
    next.delete(e.id)
    favoriteLoadingIds.value = next
  }
}

/** 查看设备借用时间轴：打开时间轴弹窗 */
function viewTimeline(e: Equipment) {
  timelineEquipmentId.value = e.id
  timelineVisible.value = true
}

/** 统一错误信息提取 */
function errMsg(e: any, fallback = '操作失败'): string {
  const d = e?.data?.detail
  if (typeof d === 'string' && d) return d
  if (d && typeof d === 'object' && d.message) return d.message
  return e?.message || fallback
}

onMounted(loadEquipment)
</script>

<template>
  <AppLayout>
    <div class="page">
      <!-- 页面标题 -->
      <div class="page-header">
        <div class="catalog-heading">
          <div class="catalog-copy">
            <div class="catalog-postmark">
              <img class="catalog-mark" src="/assets/christmas-seal-v1.svg" alt="" aria-hidden="true" width="42" height="42" />
              <p class="catalog-season-line">把圣诞的灯火，留在胶片上。</p>
            </div>
            <h1 class="page-title">器材设备清单</h1>
            <p class="page-desc">仅可借用清单中已编号的器材。</p>
            <button
              type="button"
              class="catalog-gift-button"
              aria-haspopup="dialog"
              @click="giftBoxVisible = true"
            >
              <ChristmasGiftParcel class="catalog-gift-button__box" />
              <span class="catalog-gift-button__label">相机抽奖</span>
              <svg class="catalog-gift-button__arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13m-5-5 5 5-5 5"/></svg>
            </button>
          </div>
          <div class="catalog-stage" aria-hidden="true">
            <img class="catalog-cover" :src="CHRISTMAS_COVER" alt="" fetchpriority="high" />
            <span class="catalog-viewfinder"></span>
          </div>
        </div>
        <div class="catalog-index">
          <div class="catalog-index__row"><span>器材总数</span><strong>{{ loading ? '—' : equipmentList.length }}</strong></div>
          <div class="catalog-index__row"><span>当前可借</span><strong class="available-number">{{ loading ? '—' : availableCount }}</strong></div>
          <div class="catalog-index__guide">
            <router-link to="/calendar" class="catalog-calendar">查看预约日历 <span aria-hidden="true">↗</span></router-link>
            <p>可借状态表示器材已在库，预约时段请以时间轴为准。</p>
          </div>
        </div>
      </div>

      <div class="catalog-tools">
        <div class="catalog-search">
          <svg class="catalog-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/></svg>
          <input ref="searchInput" v-model="keyword" type="search" aria-label="搜索器材" placeholder="按名称、编号或类别查找器材" />
          <button v-if="keyword" type="button" class="catalog-search-clear" aria-label="清除搜索" @click="clearSearch">×</button>
        </div>
        <label class="catalog-status">状态
          <select v-model="activeStatus" aria-label="筛选器材状态">
            <option value="all">全部状态</option>
            <option value="available">可借用</option>
            <option value="borrowed">借用中</option>
            <option value="repair">维修中</option>
          </select>
        </label>
        <span class="catalog-results" role="status" aria-live="polite">{{ visibleCount }} 件匹配</span>
      </div>

      <!-- 类别筛选 -->
      <FilterTabs
        v-if="equipmentList.length"
        v-model="activeCategory"
        :tabs="categoryTabs"
        class="category-tabs"
      />

      <!-- 加载中 -->
      <div v-if="loading" class="state-wrap">
        <EmptyState icon="pending" text="正在加载设备清单..." />
      </div>

      <!-- 空状态 -->
      <div v-else-if="loadError" class="catalog-empty">
        <EmptyState icon="warning" text="器材清单加载失败" sub-text="检查网络连接后重新加载" />
        <button type="button" class="reset-btn" @click="loadEquipment">重新加载</button>
      </div>
      <EmptyState
        v-else-if="!equipmentList.length"
        icon="equipment"
        text="暂无设备"
        sub-text="设备将在管理员录入后显示"
      />

      <!-- 分组设备列表 -->
      <div v-else class="categories">
        <div v-if="!visibleGroups.length" class="catalog-empty">
          <EmptyState
            :icon="activeCategory === 'favorites' ? 'favorite' : 'equipment'"
            :text="activeCategory === 'favorites' && !favoriteIds.size ? '还没有收藏设备' : '没有找到匹配的器材'"
            sub-text="试试其他关键词或筛选条件；点击器材上的「收藏」可加入收藏清单"
          />
          <button type="button" class="reset-btn" @click="resetFilters">查看全部器材</button>
        </div>
        <section
          v-for="group in visibleGroups"
          :key="group.category"
          class="category-section"
        >
          <!-- 类别标题：图标 + 名称 + 数量 -->
          <div class="category-header">
            <EditorialIcon class="category-icon" :name="group.icon" :size="34" />
            <span class="category-name">{{ group.category }}</span>
            <span class="category-count">{{ group.count }} 件</span>
          </div>

          <!-- 设备卡片网格 -->
          <div class="equipment-grid">
            <article
              v-for="(e, idx) in group.items"
              :key="e.id"
              class="equipment-card"
              :style="{ animationDelay: `${idx * 0.05}s` }"
            >
              <!-- 图片区域 -->
              <div class="card-image">
                <img v-if="e.image_url && !imageFailures.has(e.id)" :src="e.image_url" :alt="e.name" loading="lazy" decoding="async" @error="markImageFailed(e.id)" />
                <div v-else class="image-placeholder">
                  <EditorialIcon class="placeholder-icon" :name="categoryIcon(e.category)" :size="82" />
                </div>
                <!-- 状态标签：覆盖在图片右上角 -->
                <span class="status-tag" :class="e.status">
                  {{ statusText(e.status) }}
                </span>
                <button
                  type="button"
                  class="favorite-btn"
                  :class="{ active: isFavorite(e.id) }"
                  :disabled="favoriteLoadingIds.has(e.id)"
                  :aria-pressed="isFavorite(e.id)"
                  :aria-label="isFavorite(e.id) ? `取消收藏${e.name}` : `收藏${e.name}`"
                  @click.stop="toggleFavorite(e)"
                >
                  {{ isFavorite(e.id) ? '已收藏' : '收藏' }}
                </button>
              </div>

              <!-- 信息区 -->
              <div class="card-body">
                <div class="card-code">{{ e.code }}</div>
                <div class="card-name" :title="e.name">{{ e.name }}</div>
                <div class="card-category">{{ e.category }}</div>
                <div v-if="e.notes" class="card-notes">
                  <EditorialIcon name="warning" :size="18" />
                  <span>{{ e.notes }}</span>
                </div>
              </div>

              <!-- 操作区 -->
              <div class="card-footer">
                <button class="timeline-btn" @click="viewTimeline(e)">
                  查看占用时间
                </button>
                <router-link v-if="e.status !== 'repair'" :to="{ path: '/borrow', query: { equipment_id: e.id } }" class="borrow-link" :aria-label="`预约借用${e.name}`">预约借用 <span aria-hidden="true">↗</span></router-link>
                <span v-else class="borrow-unavailable">维修中，暂不可预约</span>
              </div>
            </article>
          </div>
        </section>
      </div>
    </div>

    <!-- 时间轴弹窗 -->
    <EquipmentTimeline
      v-model:visible="timelineVisible"
      :equipment-id="timelineEquipmentId"
    />
    <ChristmasGiftBox v-model:show="giftBoxVisible" />
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 1260px;
  margin: 0 auto;
}

/* ---------- 页面标题 ---------- */
.page-header {
  margin-bottom: 26px;
  border: 1px solid var(--foil);
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
}
.page-title {
  font-size: clamp(30px, 3.55vw, 57px);
  font-weight: 500;
  line-height: 1.12;
  margin: 0;
  color: var(--text-on-dark);
  font-family: var(--font);
  letter-spacing: -0.045em;
}
.page-desc {
  font-size: 13px;
  color: #ffe9d8;
  margin: 11px 0 0;
  line-height: 1.8;
}
.catalog-heading {
  display: grid;
  grid-template-columns: minmax(0, .88fr) minmax(0, 1.12fr);
  min-height: clamp(275px, 25vw, 364px);
  background: var(--festive-green);
}
.catalog-copy {
  position: relative;
  isolation: isolate;
  padding: clamp(26px, 2.8vw, 42px);
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  background:
    radial-gradient(ellipse at 90% 0, #c5374a 0, transparent 60%),
    var(--accent-gradient), var(--festive-red);
}
.catalog-copy::before {
  content: '';
  position: absolute;
  inset: 9px;
  border: 1px solid #ffe1ac73;
  pointer-events: none;
}
.catalog-copy::after {
  content: '';
  position: absolute;
  right: 9px;
  top: 9px;
  width: min(36%, 162px);
  aspect-ratio: 252 / 146;
  background: url('/assets/christmas-bells-v1.svg') right top / contain no-repeat;
  opacity: .94;
  z-index: -1;
  pointer-events: none;
}
.catalog-stage {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border-left: 1px solid #e3bd84;
}
.catalog-cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 89% center;
  pointer-events: none;
}
.catalog-stage::after {
  content: '';
  position: absolute;
  inset: 0;
  background: url('/assets/christmas-cover-trim-v2.svg') center / 100% 100% no-repeat;
  pointer-events: none;
}
.catalog-viewfinder {
  position: absolute;
  inset: clamp(8px, 1.2vw, 17px);
  color: #fff1ca;
  opacity: .76;
  z-index: 1;
  background:
    linear-gradient(currentColor, currentColor) left top / 21px 1px,
    linear-gradient(currentColor, currentColor) left top / 1px 21px,
    linear-gradient(currentColor, currentColor) right top / 21px 1px,
    linear-gradient(currentColor, currentColor) right top / 1px 21px,
    linear-gradient(currentColor, currentColor) left bottom / 21px 1px,
    linear-gradient(currentColor, currentColor) left bottom / 1px 21px,
    linear-gradient(currentColor, currentColor) right bottom / 21px 1px,
    linear-gradient(currentColor, currentColor) right bottom / 1px 21px;
  background-repeat: no-repeat;
  pointer-events: none;
}
.catalog-postmark { display: flex; align-items: center; gap: 10px; margin-bottom: clamp(13px, 1.9vw, 24px); }
.catalog-mark { width: 42px; height: 42px; flex: 0 0 auto; filter: drop-shadow(0 2px 3px #5c132963); }
.catalog-season-line {
  margin: 0;
  color: #fff2d8;
  font: 500 14px/1.6 var(--font);
  letter-spacing: .04em;
}
.catalog-gift-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 62px;
  margin-top: clamp(14px, 2vw, 24px);
  padding: 5px 12px 5px 4px;
  border: 1px solid #ffe6b4;
  background: #fff1d6;
  color: #174935;
  box-shadow: 3px 3px 0 #6f1b31;
  text-align: left;
  white-space: nowrap;
  transition: background var(--transition), transform var(--transition);
}
.catalog-gift-button__box { width: 65px; height: 50px; flex: 0 0 auto; }
.catalog-gift-button__label { font: 700 16px/1.3 var(--font); }
.catalog-gift-button__arrow { width: 19px; height: 19px; margin-left: 5px; }
.catalog-gift-button:hover { background: #fffaea; transform: translateY(-1px); }
.catalog-gift-button:focus-visible {
  outline-color: #fff0d4;
  outline-offset: 4px;
}

/* ---------- 类别筛选 ---------- */
.category-tabs {
  margin: 0 0 26px;
}

/* ---------- 状态展示 ---------- */
.state-wrap {
  padding: 24px 0;
}

/* ---------- 类别分组 ---------- */
.categories {
  display: flex;
  flex-direction: column;
  gap: 48px;
}
.category-section {
  animation: slideUp 0.4s ease both;
}
.category-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 0 0 10px;
  border-bottom: 1px solid var(--text);
}
.category-icon {
  filter: contrast(1.04);
}
.category-name {
  font-size: 22px;
  font-weight: 500;
  color: var(--text);
  font-family: var(--font);
}
.category-count {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-left: auto;
  padding: 2px 0;
  letter-spacing: 0.08em;
}

/* ---------- 设备卡片网格 ---------- */
.equipment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 18px 14px;
}

.equipment-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 1px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition), box-shadow var(--transition),
    border-color var(--transition);
  animation: cardFadeIn 0.5s ease both;
}
.equipment-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--foil);
}

/* ---------- 卡片图片区 ---------- */
.card-image {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #E9E7DA;
  overflow: hidden;
}
.card-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 16px;
  filter: saturate(0.9);
  transition: transform 0.5s ease, filter 0.5s ease;
}
.equipment-card:hover .card-image img {
  transform: scale(1.035);
  filter: saturate(1) contrast(1.02);
}
.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: radial-gradient(circle at 50% 46%, #f9f4e8 0 28%, transparent 28.4%), #E0EADB;
}
.image-placeholder::before {
  content: '';
  position: absolute;
  width: 88px;
  height: 58px;
  right: 16px;
  bottom: 9px;
  background: url('/assets/christmas-garland-v2.svg') right center / 100% auto no-repeat;
  opacity: .56;
  pointer-events: none;
}
.image-placeholder::after {
  content: '';
  position: absolute;
  inset: 22px;
  border: 1px solid #856a4a33;
  pointer-events: none;
}
.placeholder-icon {
  opacity: 0.92;
  filter: contrast(1.05);
}

/* ---------- 状态标签 ---------- */
.status-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 1px;
  backdrop-filter: blur(4px);
  box-shadow: none;
  font-family: var(--font-ui);
  letter-spacing: 0.3px;
}
.status-tag.available {
  color: var(--success);
  background: var(--success-bg);
}
.status-tag.borrowed {
  color: var(--warning);
  background: var(--warning-bg);
}
.status-tag.repair {
  color: var(--danger);
  background: var(--danger-bg);
}

.favorite-btn {
  position: absolute;
  left: 10px;
  top: 10px;
  z-index: 2;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-card), transparent 8%);
  color: var(--text);
  padding: 4px 9px;
  font: 600 11px/1 var(--font-ui);
  letter-spacing: 0.08em;
  cursor: pointer;
  backdrop-filter: blur(6px);
}
.favorite-btn:hover,
.favorite-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.favorite-btn.active {
  animation: bookmark-slip .32s cubic-bezier(.22,.75,.28,1) both;
}
@keyframes bookmark-slip {
  from { transform: translateY(-9px); opacity: .2; }
  to { transform: translateY(0); opacity: 1; }
}
.favorite-btn:disabled {
  opacity: 0.55;
  cursor: wait;
}

/* ---------- 卡片信息区 ---------- */
.card-body {
  padding: 18px 18px 10px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.card-code {
  font-size: 12px;
  color: var(--accent);
  font-weight: 600;
  font-family: var(--font-data);
  letter-spacing: 0.5px;
}
.card-name {
  font-size: 20px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.4;
  font-family: var(--font);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-category {
  font-size: 12px;
  color: var(--text-tertiary);
}
.card-notes {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 12px;
  color: var(--warning);
  background: var(--warning-bg);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  margin-top: 4px;
  line-height: 1.5;
  word-break: break-word;
}

/* ---------- 卡片操作区 ---------- */
.card-footer {
  padding: 12px 18px 18px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--border-light);
}
.timeline-btn {
  width: 100%;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: 1px;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  font-family: var(--font-ui);
}
.timeline-btn:hover {
  border-color: var(--accent);
  color: #fff;
  background: var(--accent);
}

/* ---------- 卡片淡入动画 ---------- */
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ---------- 响应式 ---------- */
@media (max-width: 640px) {
  .equipment-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .category-name {
    font-size: 23px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .favorite-btn.active { animation: none; }
}

.catalog-index {
  border-top: 4px solid transparent;
  padding: 12px clamp(17px, 2.2vw, 30px);
  display: grid;
  grid-template-columns: minmax(100px, .69fr) minmax(100px, .69fr) minmax(0, 1.6fr);
  align-items: center;
  gap: 14px clamp(18px, 2.3vw, 34px);
  background: linear-gradient(132deg, var(--bg-card), #f2eddb) padding-box, var(--festive-ribbon) border-box;
  font-family: var(--font-ui);
}
.catalog-index__row { display: flex; align-items: baseline; justify-content: space-between; gap: 9px; }
.catalog-index__row span { color: var(--text-secondary); font-size: 12px; }
.catalog-index__row strong { font: 400 34px/1.1 var(--font); font-variant-numeric: tabular-nums; }
.available-number { color: var(--success); }
.catalog-index__guide { border-left: 1px dashed var(--foil); padding-left: 16px; }
.catalog-calendar { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; font-weight: 700; }
.catalog-index p { font-size: 11px; color: var(--text-secondary); margin: 4px 0 0; line-height: 1.65; }
.catalog-tools { display: flex; gap: 16px; align-items: center; margin-bottom: 18px; padding: 8px 12px; border: 1px solid var(--border); background: var(--bg-card); font-family: var(--font-ui); }
.catalog-search { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; border-bottom: 1px solid var(--text); padding: 7px 0; }
.catalog-search-icon { width: 20px; height: 20px; flex-shrink: 0; stroke: var(--accent); stroke-width: 1.5; stroke-linecap: round; }
.catalog-search input { min-width: 0; width: 100%; background: transparent; border: none; padding: 4px; color: var(--text); }
.catalog-search input::-webkit-search-cancel-button { display: none; }
.catalog-search-clear { width: 28px; height: 28px; flex-shrink: 0; border: 0; background: transparent; color: var(--text-secondary); font-size: 20px; line-height: 1; }
.catalog-search-clear:hover { color: var(--accent); }
.catalog-search input:focus-visible { outline-offset: 3px; }
.catalog-status { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-secondary); }
.catalog-status select { padding: 10px 24px 10px 12px; background: var(--bg-card); color: var(--text); border: 1px solid var(--border); }
.catalog-results { font: 11px var(--font-data); color: var(--text-secondary); white-space: nowrap; }
.catalog-empty { text-align: center; padding: 30px 0; }
.reset-btn { padding: 10px 18px; border: 1px solid var(--text); color: var(--text); background: transparent; }
.borrow-link { color: var(--accent); font: 600 12px var(--font-ui); white-space: nowrap; }
.borrow-link span { margin-left: 4px; }
.borrow-unavailable { font: 11px var(--font-ui); color: var(--text-secondary); }
@media (max-width: 660px) {
  .catalog-index { grid-template-columns: 1fr 1fr; gap: 9px 22px; }
  .catalog-index__guide { grid-column: 1 / -1; border: 0; border-top: 1px dashed var(--foil); padding: 8px 0 0; }
  .catalog-index__row strong { font-size: 32px; }
  .catalog-heading { grid-template-columns: 1fr; min-height: 0; }
  .catalog-stage { grid-row: 1; aspect-ratio: 1.7; border-left: 0; border-bottom: 1px solid #edce98; }
  .catalog-cover { object-position: 91% center; }
  .catalog-copy { padding: 18px 22px 22px; }
  .catalog-copy::before { inset: 6px; }
  .catalog-postmark { gap: 8px; margin-bottom: 9px; }
  .catalog-mark { width: 32px; height: 32px; }
  .catalog-season-line { font-size: 13px; }
  .page-title { font-size: clamp(30px, 8.5vw, 41px); }
  .page-desc { margin-top: 6px; font-size: 12px; }
  .catalog-gift-button { margin-top: 13px; }
  .catalog-copy::after { width: 107px; opacity: .8; }
}
@media (max-width: 640px) {
  .catalog-tools { flex-wrap: wrap; gap: 10px 12px; padding: 10px 12px; }
  .catalog-search { flex-basis: 100%; }
  .catalog-results { margin-left: auto; }
}
</style>
