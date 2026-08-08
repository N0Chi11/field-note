/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted } from 'vue';
import AppLayout from '@/components/AppLayout.vue';
import FilterTabs from '@/components/common/FilterTabs.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import EquipmentTimeline from '@/components/EquipmentTimeline.vue';
import { getEquipment } from '@/api/equipment';
import { useToastStore } from '@/stores/toast';
const toast = useToastStore();
/* ------------------------------------------------------------------ *
 * 时间轴弹窗状态
 * ------------------------------------------------------------------ */
const timelineVisible = ref(false);
const timelineEquipmentId = ref(null);
const loading = ref(false);
const equipmentList = ref([]);
const activeCategory = ref('all');
/** 类别图标映射（与原 HTML 设计一致） */
const CATEGORY_ICONS = {
    相机: '📷',
    稳定器: '🎯',
    麦克风: '🎙️',
    灯具: '💡',
    三脚架: '📐'
};
function categoryIcon(category) {
    return CATEGORY_ICONS[category] || '📦';
}
/** 状态配置：文本 + 颜色 */
const STATUS_CONFIG = {
    available: { text: '可借用', color: 'var(--success)', bg: 'var(--success-bg)' },
    borrowed: { text: '借用中', color: 'var(--warning)', bg: 'var(--warning-bg)' },
    repair: { text: '维修中', color: 'var(--danger)', bg: 'var(--danger-bg)' }
};
function statusText(status) {
    return STATUS_CONFIG[status]?.text || status;
}
const groupedByCategory = computed(() => {
    const map = new Map();
    for (const e of equipmentList.value) {
        const cat = e.category || '其他';
        if (!map.has(cat))
            map.set(cat, []);
        map.get(cat).push(e);
    }
    return Array.from(map.entries()).map(([category, items]) => ({
        category,
        icon: categoryIcon(category),
        items,
        count: items.length
    }));
});
/** 顶部类别筛选标签（含数量） */
const categoryTabs = computed(() => [
    { key: 'all', label: `全部 (${equipmentList.value.length})`, icon: '📋' },
    ...groupedByCategory.value.map((g) => ({
        key: g.category,
        label: `${g.category} (${g.count})`,
        icon: g.icon
    }))
]);
/** 当前可见的分组 */
const visibleGroups = computed(() => {
    if (activeCategory.value === 'all')
        return groupedByCategory.value;
    return groupedByCategory.value.filter((g) => g.category === activeCategory.value);
});
function loadEquipment() {
    loading.value = true;
    getEquipment()
        .then((data) => {
        equipmentList.value = Array.isArray(data) ? data : [];
    })
        .catch((e) => {
        toast.error(errMsg(e, '加载设备列表失败'));
        equipmentList.value = [];
    })
        .finally(() => {
        loading.value = false;
    });
}
/** 查看设备借用时间轴：打开时间轴弹窗 */
function viewTimeline(e) {
    timelineEquipmentId.value = e.id;
    timelineVisible.value = true;
}
/** 统一错误信息提取 */
function errMsg(e, fallback = '操作失败') {
    const d = e?.data?.detail;
    if (typeof d === 'string' && d)
        return d;
    if (d && typeof d === 'object' && d.message)
        return d.message;
    return e?.message || fallback;
}
onMounted(loadEquipment);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['equipment-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-image']} */ ;
/** @type {__VLS_StyleScopedClasses['equipment-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-image']} */ ;
/** @type {__VLS_StyleScopedClasses['status-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['status-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['status-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['equipment-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['category-name']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof AppLayout, typeof AppLayout, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(AppLayout, new AppLayout({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
var __VLS_3 = {};
__VLS_2.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "page-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "page-desc" },
});
if (__VLS_ctx.equipmentList.length) {
    /** @type {[typeof FilterTabs, ]} */ ;
    // @ts-ignore
    const __VLS_4 = __VLS_asFunctionalComponent(FilterTabs, new FilterTabs({
        modelValue: (__VLS_ctx.activeCategory),
        tabs: (__VLS_ctx.categoryTabs),
        ...{ class: "category-tabs" },
    }));
    const __VLS_5 = __VLS_4({
        modelValue: (__VLS_ctx.activeCategory),
        tabs: (__VLS_ctx.categoryTabs),
        ...{ class: "category-tabs" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_4));
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "state-wrap" },
    });
    /** @type {[typeof EmptyState, ]} */ ;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent(EmptyState, new EmptyState({
        icon: "⏳",
        text: "正在加载设备清单...",
    }));
    const __VLS_8 = __VLS_7({
        icon: "⏳",
        text: "正在加载设备清单...",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
}
else if (!__VLS_ctx.equipmentList.length) {
    /** @type {[typeof EmptyState, ]} */ ;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent(EmptyState, new EmptyState({
        icon: "📦",
        text: "暂无设备",
        subText: "设备将在管理员录入后显示",
    }));
    const __VLS_11 = __VLS_10({
        icon: "📦",
        text: "暂无设备",
        subText: "设备将在管理员录入后显示",
    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "categories" },
    });
    for (const [group] of __VLS_getVForSourceType((__VLS_ctx.visibleGroups))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            key: (group.category),
            ...{ class: "category-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "category-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "category-icon" },
        });
        (group.icon);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "category-name" },
        });
        (group.category);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "category-count" },
        });
        (group.count);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "equipment-grid" },
        });
        for (const [e, idx] of __VLS_getVForSourceType((group.items))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
                key: (e.id),
                ...{ class: "equipment-card" },
                ...{ style: ({ animationDelay: `${idx * 0.05}s` }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-image" },
            });
            if (e.image_url) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    src: (e.image_url),
                    alt: (e.name),
                });
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "image-placeholder" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "placeholder-icon" },
                });
                (e.icon || __VLS_ctx.categoryIcon(e.category));
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "status-tag" },
                ...{ class: (e.status) },
            });
            (__VLS_ctx.statusText(e.status));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-body" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-code" },
            });
            (e.code);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-name" },
                title: (e.name),
            });
            (e.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-category" },
            });
            (e.category);
            if (e.notes) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "card-notes" },
                });
                (e.notes);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "card-footer" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(__VLS_ctx.loading))
                            return;
                        if (!!(!__VLS_ctx.equipmentList.length))
                            return;
                        __VLS_ctx.viewTimeline(e);
                    } },
                ...{ class: "timeline-btn" },
            });
        }
    }
}
/** @type {[typeof EquipmentTimeline, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(EquipmentTimeline, new EquipmentTimeline({
    visible: (__VLS_ctx.timelineVisible),
    equipmentId: (__VLS_ctx.timelineEquipmentId),
}));
const __VLS_14 = __VLS_13({
    visible: (__VLS_ctx.timelineVisible),
    equipmentId: (__VLS_ctx.timelineEquipmentId),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['category-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['state-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['categories']} */ ;
/** @type {__VLS_StyleScopedClasses['category-section']} */ ;
/** @type {__VLS_StyleScopedClasses['category-header']} */ ;
/** @type {__VLS_StyleScopedClasses['category-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['category-name']} */ ;
/** @type {__VLS_StyleScopedClasses['category-count']} */ ;
/** @type {__VLS_StyleScopedClasses['equipment-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['equipment-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-image']} */ ;
/** @type {__VLS_StyleScopedClasses['image-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['status-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['card-code']} */ ;
/** @type {__VLS_StyleScopedClasses['card-name']} */ ;
/** @type {__VLS_StyleScopedClasses['card-category']} */ ;
/** @type {__VLS_StyleScopedClasses['card-notes']} */ ;
/** @type {__VLS_StyleScopedClasses['card-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-btn']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AppLayout: AppLayout,
            FilterTabs: FilterTabs,
            EmptyState: EmptyState,
            EquipmentTimeline: EquipmentTimeline,
            timelineVisible: timelineVisible,
            timelineEquipmentId: timelineEquipmentId,
            loading: loading,
            equipmentList: equipmentList,
            activeCategory: activeCategory,
            categoryIcon: categoryIcon,
            statusText: statusText,
            categoryTabs: categoryTabs,
            visibleGroups: visibleGroups,
            viewTimeline: viewTimeline,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
