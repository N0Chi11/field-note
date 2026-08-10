<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppLayout from '@/components/AppLayout.vue'
import FilterTabs from '@/components/common/FilterTabs.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import EquipmentTimeline from '@/components/EquipmentTimeline.vue'
import { getEquipment } from '@/api/equipment'
import { useToastStore } from '@/stores/toast'
import type { Equipment, EquipmentStatus } from '@/types/models'

const toast = useToastStore()

/* ------------------------------------------------------------------ *
 * 时间轴弹窗状态
 * ------------------------------------------------------------------ */
const timelineVisible = ref(false)
const timelineEquipmentId = ref<number | null>(null)

const loading = ref(false)
const equipmentList = ref<Equipment[]>([])
const activeCategory = ref('all')

/** 类别图标映射（与原 HTML 设计一致） */
const CATEGORY_ICONS: Record<string, string> = {
  相机: '📷',
  稳定器: '🎯',
  麦克风: '🎙️',
  灯具: '💡',
  三脚架: '📐'
}

function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category] || '📦'
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
  icon: string
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
  { key: 'all', label: `全部 (${equipmentList.value.length})`, icon: '📋' },
  ...groupedByCategory.value.map((g) => ({
    key: g.category,
    label: `${g.category} (${g.count})`,
    icon: g.icon
  }))
])

/** 当前可见的分组 */
const visibleGroups = computed(() => {
  if (activeCategory.value === 'all') return groupedByCategory.value
  return groupedByCategory.value.filter(
    (g) => g.category === activeCategory.value
  )
})

function loadEquipment() {
  loading.value = true
  getEquipment()
    .then((data) => {
      equipmentList.value = Array.isArray(data) ? data : []
    })
    .catch((e: any) => {
      toast.error(errMsg(e, '加载设备列表失败'))
      equipmentList.value = []
    })
    .finally(() => {
      loading.value = false
    })
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
        <h1 class="page-title">器材设备清单</h1>
        <p class="page-desc">
          所有可借用设备均已编号并附有照片，未在清单中的物品不可借用
        </p>
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
        <EmptyState icon="⏳" text="正在加载设备清单..." />
      </div>

      <!-- 空状态 -->
      <EmptyState
        v-else-if="!equipmentList.length"
        icon="📦"
        text="暂无设备"
        sub-text="设备将在管理员录入后显示"
      />

      <!-- 分组设备列表 -->
      <div v-else class="categories">
        <section
          v-for="group in visibleGroups"
          :key="group.category"
          class="category-section"
        >
          <!-- 类别标题：图标 + 名称 + 数量 -->
          <div class="category-header">
            <span class="category-icon">{{ group.icon }}</span>
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
                <img v-if="e.image_url" :src="e.image_url" :alt="e.name" />
                <div v-else class="image-placeholder">
                  <span class="placeholder-icon">{{
                    e.icon || categoryIcon(e.category)
                  }}</span>
                </div>
                <!-- 状态标签：覆盖在图片右上角 -->
                <span class="status-tag" :class="e.status">
                  {{ statusText(e.status) }}
                </span>
              </div>

              <!-- 信息区 -->
              <div class="card-body">
                <div class="card-code">{{ e.code }}</div>
                <div class="card-name" :title="e.name">{{ e.name }}</div>
                <div class="card-category">{{ e.category }}</div>
                <div v-if="e.notes" class="card-notes">⚠️ {{ e.notes }}</div>
              </div>

              <!-- 操作区 -->
              <div class="card-footer">
                <button class="timeline-btn" @click="viewTimeline(e)">
                  查看时间轴
                </button>
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
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 1260px;
  margin: 0 auto;
}

/* ---------- 页面标题 ---------- */
.page-header {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.6fr);
  align-items: end;
  gap: 32px;
  margin-bottom: 26px;
  padding: 22px 0 34px;
  border-top: 1px solid var(--text);
  border-bottom: 1px solid var(--text);
}
.page-header::before {
  content: 'NEW MEDIA CENTER / EQUIPMENT CATALOGUE';
  grid-column: 1 / -1;
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.22em;
  color: var(--accent);
}
.page-title {
  font-size: clamp(48px, 6vw, 82px);
  font-weight: 500;
  line-height: 0.92;
  margin: 0;
  color: var(--text);
  font-family: var(--font);
  letter-spacing: -0.055em;
}
.page-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.8;
  max-width: 390px;
  justify-self: end;
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
  border-bottom: 3px solid var(--text);
}
.category-icon {
  font-size: 22px;
  line-height: 1;
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
  transition: transform var(--transition), box-shadow var(--transition),
    border-color var(--transition);
  animation: cardFadeIn 0.5s ease both;
}
.equipment-card:hover {
  transform: translateY(-3px);
  box-shadow: 6px 7px 0 #1A1A18;
  border-color: var(--text);
}

/* ---------- 卡片图片区 ---------- */
.card-image {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #E8E4DA;
  overflow: hidden;
}
.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.72) contrast(1.04);
  transition: transform 0.5s ease, filter 0.5s ease;
}
.equipment-card:hover .card-image img {
  transform: scale(1.05);
  filter: saturate(1) contrast(1.02);
}
.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 35% 30%, rgba(36, 63, 160, 0.2), transparent 34%), linear-gradient(145deg, #D8D4C8, #F4F1E9);
}
.placeholder-icon {
  font-size: 48px;
  opacity: 0.5;
  line-height: 1;
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
  font-family: var(--font-ui);
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
  padding: 10px 18px 18px;
}
.timeline-btn {
  width: 100%;
  height: 38px;
  border: 1px solid var(--border);
  border-radius: 1px;
  background: var(--text);
  color: var(--bg-card);
  color: var(--text-secondary);
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
  .page-header {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .page-desc {
    justify-self: start;
  }
  .equipment-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
  .page-title {
    font-size: 46px;
  }
  .category-name {
    font-size: 15px;
  }
}
</style>
