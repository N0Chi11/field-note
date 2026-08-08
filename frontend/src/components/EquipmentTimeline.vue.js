/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
/**
 * 设备借用时间轴弹窗（甘特图）
 * 完全复刻原始 HTML 版本的 timeline / gantt 设计
 */
import { ref, computed, watch } from 'vue';
import { NModal, NSpin } from 'naive-ui';
import { getEquipmentById } from '@/api/equipment';
import { getRequests } from '@/api/borrow';
import { useToastStore } from '@/stores/toast';
const props = defineProps();
const emit = defineEmits();
/** v-model:visible 双向绑定 */
const show = computed({
    get: () => props.visible,
    set: (v) => emit('update:visible', v)
});
const toast = useToastStore();
/* ------------------------------------------------------------------ *
 * 数据状态
 * ------------------------------------------------------------------ */
const loading = ref(false);
const equipment = ref(null);
const requests = ref([]);
/** 甘特图时间范围 */
const ganttRange = ref('month');
/* ------------------------------------------------------------------ *
 * 状态文本 / 样式映射（与原 HTML 一致）
 * ------------------------------------------------------------------ */
const STATUS_TEXT = {
    pending: '待审核',
    approved: '已通过',
    borrowing: '借用中',
    return_pending: '待归还确认',
    returned: '已归还',
    rejected: '已拒绝',
    cancelled: '已取消'
};
function statusText(status) {
    return STATUS_TEXT[status] || status;
}
/** 状态徽章 class（下划线转连字符，与原 HTML 一致） */
function statusClass(status) {
    return `status-${status.replace(/_/g, '-')}`;
}
/** 甘特条 class */
function barClass(status) {
    return `status-${status.replace(/_/g, '-')}`;
}
/* ------------------------------------------------------------------ *
 * 工具函数
 * ------------------------------------------------------------------ */
/** 日期格式化（与原 HTML fmt 一致） */
function fmt(dateStr) {
    if (!dateStr)
        return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime()))
        return dateStr;
    return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}
/** 类别图标 */
const CATEGORY_ICONS = {
    相机: '📷',
    镜头: '🔭',
    灯光: '💡',
    灯具: '💡',
    录音设备: '🎙️',
    麦克风: '🎙️',
    三脚架: '📐',
    稳定器: '🎯'
};
function categoryIcon(category) {
    return CATEGORY_ICONS[category] || '📦';
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
/* ------------------------------------------------------------------ *
 * 当前借用状态
 * ------------------------------------------------------------------ */
/** 当前借用中的记录（用于状态卡片） */
const currentBorrower = computed(() => {
    return requests.value.find((r) => r.status === 'borrowing') || null;
});
const isBorrowed = computed(() => !!currentBorrower.value);
const dateRange = computed(() => {
    const now = new Date();
    const range = ganttRange.value;
    if (range === 'month') {
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59);
        return { startDate, endDate };
    }
    else if (range === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        const startDate = new Date(now.getFullYear(), q * 3, 1);
        const endDate = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59);
        return { startDate, endDate };
    }
    else {
        const startDate = new Date(now.getFullYear(), 0, 1);
        const endDate = new Date(now.getFullYear(), 11, 31, 23, 59);
        return { startDate, endDate };
    }
});
/**
 * 日期转百分比位置（完全复刻原 HTML dateToPercent）
 * 将日期 clamp 到 [startDate, endDate] 区间后计算占比
 */
function dateToPercent(date) {
    const { startDate, endDate } = dateRange.value;
    const d = new Date(date);
    if (isNaN(d.getTime()))
        return 0;
    const clamped = Math.max(startDate.getTime(), Math.min(endDate.getTime(), d.getTime()));
    const totalMs = endDate.getTime() - startDate.getTime();
    if (totalMs <= 0)
        return 0;
    return ((clamped - startDate.getTime()) / totalMs) * 100;
}
const ticks = computed(() => {
    const now = new Date();
    const range = ganttRange.value;
    const result = [];
    if (range === 'month') {
        const lastDay = dateRange.value.endDate.getDate();
        const tickCount = 5;
        const tickStep = Math.ceil(lastDay / tickCount);
        for (let i = 0; i <= tickCount; i++) {
            const day = 1 + i * tickStep;
            if (day > lastDay)
                break;
            const tickDate = new Date(now.getFullYear(), now.getMonth(), day);
            result.push({ pct: dateToPercent(tickDate), label: `${day}日` });
        }
    }
    else if (range === 'quarter') {
        const months = [
            '1月', '2月', '3月', '4月', '5月', '6月',
            '7月', '8月', '9月', '10月', '11月', '12月'
        ];
        const q = Math.floor(now.getMonth() / 3);
        for (let i = 0; i < 3; i++) {
            const m = q * 3 + i;
            const tickDate = new Date(now.getFullYear(), m, 1);
            result.push({ pct: dateToPercent(tickDate), label: months[m] });
        }
    }
    else {
        const months = ['1月', '4月', '7月', '10月'];
        for (let i = 0; i < 4; i++) {
            const tickDate = new Date(now.getFullYear(), i * 3, 1);
            result.push({ pct: dateToPercent(tickDate), label: months[i] });
        }
    }
    return result;
});
/** 网格线位置（与原 HTML 一致：从 i=1 开始，跳过首刻度） */
const gridLines = computed(() => {
    const now = new Date();
    const range = ganttRange.value;
    const result = [];
    if (range === 'month') {
        const lastDay = dateRange.value.endDate.getDate();
        const tickCount = 5;
        const tickStep = Math.ceil(lastDay / tickCount);
        for (let i = 1; i <= tickCount; i++) {
            const day = 1 + i * tickStep;
            if (day > lastDay)
                break;
            const tickDate = new Date(now.getFullYear(), now.getMonth(), day);
            result.push(dateToPercent(tickDate));
        }
    }
    else if (range === 'quarter') {
        const q = Math.floor(now.getMonth() / 3);
        for (let i = 1; i < 3; i++) {
            const m = q * 3 + i;
            const tickDate = new Date(now.getFullYear(), m, 1);
            result.push(dateToPercent(tickDate));
        }
    }
    else {
        for (let i = 1; i < 4; i++) {
            const tickDate = new Date(now.getFullYear(), i * 3, 1);
            result.push(dateToPercent(tickDate));
        }
    }
    return result;
});
/** 今天线位置 */
const todayPct = computed(() => dateToPercent(new Date()));
const showTodayLine = computed(() => todayPct.value >= 0 && todayPct.value <= 100);
const bars = computed(() => {
    const { startDate, endDate } = dateRange.value;
    const startTs = startDate.getTime();
    const endTs = endDate.getTime();
    const range = requests.value.filter((r) => {
        const bStart = new Date(r.borrow_time).getTime();
        // 已归还的记录用实际归还时间作为结束时间
        const endTime = r.actual_return || r.return_time;
        const rEnd = new Date(endTime).getTime();
        return bStart <= endTs && rEnd >= startTs;
    });
    return range.map((r) => {
        const leftPct = dateToPercent(r.borrow_time);
        // 已归还的记录用实际归还时间作为结束时间
        const endTime = r.actual_return || r.return_time;
        const rightPct = dateToPercent(endTime);
        const widthPct = Math.max(rightPct - leftPct, 2);
        const barText = r.user_name +
            (r.status === 'borrowing'
                ? ' · 借用中'
                : r.status === 'returned'
                    ? ' · 已归还'
                    : '');
        const title = `${r.work_order_no} | ${r.user_name} | ${fmt(r.borrow_time)} → ${fmt(endTime)}${r.actual_return ? ' (提前归还)' : ''}`;
        return { left: leftPct, width: widthPct, status: r.status, text: barText, title };
    });
});
/** 设备名截断（与原 HTML 一致：超过 10 字截断） */
const rowLabel = computed(() => {
    const name = equipment.value?.name || '';
    return name.length > 10 ? name.substring(0, 10) + '…' : name;
});
/* ------------------------------------------------------------------ *
 * 完整借用记录列表（按创建时间倒序）
 * ------------------------------------------------------------------ */
const historyList = computed(() => {
    return [...requests.value].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
});
/* ------------------------------------------------------------------ *
 * 数据加载
 * ------------------------------------------------------------------ */
async function fetchRequestsByEquipment(equipmentId) {
    const all = [];
    let page = 1;
    const size = 100;
    for (let i = 0; i < 50; i++) {
        const params = {
            equipment_id: equipmentId,
            page,
            size
        };
        const res = (await getRequests(params));
        all.push(...res.items);
        if (res.items.length === 0 || all.length >= res.total)
            break;
        page++;
    }
    // 过滤掉 rejected / cancelled（与原 HTML 过滤 rejected 的意图一致，避免无样式条）
    return all.filter((r) => r.status !== 'rejected' && r.status !== 'cancelled');
}
async function loadData() {
    if (!props.equipmentId)
        return;
    loading.value = true;
    try {
        const [eq, reqs] = await Promise.all([
            getEquipmentById(props.equipmentId),
            fetchRequestsByEquipment(props.equipmentId)
        ]);
        equipment.value = eq;
        requests.value = reqs;
    }
    catch (e) {
        toast.error(errMsg(e, '加载时间轴数据失败'));
        equipment.value = null;
        requests.value = [];
    }
    finally {
        loading.value = false;
    }
}
/** 弹窗打开时加载数据 */
watch(() => props.visible, (v) => {
    if (v && props.equipmentId) {
        loadData();
    }
});
/** 弹窗打开状态下切换设备时重新加载 */
watch(() => props.equipmentId, (id) => {
    if (id && props.visible) {
        loadData();
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['modal-close']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header-info']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-status-text']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-status-text']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-range-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-range-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-grid-line']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['status-pending']} */ ;
/** @type {__VLS_StyleScopedClasses['status-pending']} */ ;
/** @type {__VLS_StyleScopedClasses['status-approved']} */ ;
/** @type {__VLS_StyleScopedClasses['status-approved']} */ ;
/** @type {__VLS_StyleScopedClasses['status-borrowing']} */ ;
/** @type {__VLS_StyleScopedClasses['status-borrowing']} */ ;
/** @type {__VLS_StyleScopedClasses['status-return-pending']} */ ;
/** @type {__VLS_StyleScopedClasses['status-return-pending']} */ ;
/** @type {__VLS_StyleScopedClasses['status-returned']} */ ;
/** @type {__VLS_StyleScopedClasses['status-returned']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-header-label']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-row-label']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-history-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    show: (__VLS_ctx.show),
    autoFocus: (false),
    maskClosable: (true),
    ...{ class: "timeline-modal-wrap" },
}));
const __VLS_2 = __VLS_1({
    show: (__VLS_ctx.show),
    autoFocus: (false),
    maskClosable: (true),
    ...{ class: "timeline-modal-wrap" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "timeline-modal" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "modal-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "modal-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.show = false;
        } },
    ...{ class: "modal-close" },
    type: "button",
});
const __VLS_5 = {}.NSpin;
/** @type {[typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(__VLS_5, new __VLS_5({
    show: (__VLS_ctx.loading),
}));
const __VLS_7 = __VLS_6({
    show: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
__VLS_8.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "modal-body" },
});
if (__VLS_ctx.equipment) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "timeline-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "timeline-header-icon" },
    });
    if (__VLS_ctx.equipment.image_url) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (__VLS_ctx.equipment.image_url),
            alt: (__VLS_ctx.equipment.name),
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "timeline-header-emoji" },
        });
        (__VLS_ctx.equipment.icon || __VLS_ctx.categoryIcon(__VLS_ctx.equipment.category));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "timeline-header-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.equipment.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.equipment.code);
    (__VLS_ctx.equipment.category);
    if (__VLS_ctx.isBorrowed && __VLS_ctx.currentBorrower) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "timeline-status-card borrowed" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "status-card-icon" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "timeline-status-text" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "sub" },
        });
        (__VLS_ctx.currentBorrower.user_name);
        (__VLS_ctx.currentBorrower.user_student_id);
        (__VLS_ctx.fmt(__VLS_ctx.currentBorrower.return_time));
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "timeline-status-card available" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "status-card-icon" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "timeline-status-text" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "sub" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-wrapper" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.equipment))
                    return;
                __VLS_ctx.ganttRange = 'month';
            } },
        type: "button",
        ...{ class: "gantt-range-btn" },
        ...{ class: ({ active: __VLS_ctx.ganttRange === 'month' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.equipment))
                    return;
                __VLS_ctx.ganttRange = 'quarter';
            } },
        type: "button",
        ...{ class: "gantt-range-btn" },
        ...{ class: ({ active: __VLS_ctx.ganttRange === 'quarter' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.equipment))
                    return;
                __VLS_ctx.ganttRange = 'year';
            } },
        type: "button",
        ...{ class: "gantt-range-btn" },
        ...{ class: ({ active: __VLS_ctx.ganttRange === 'year' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-container" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-chart" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-header-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-header-scale" },
    });
    for (const [t, i] of __VLS_getVForSourceType((__VLS_ctx.ticks))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (i),
            ...{ class: "gantt-header-tick" },
            ...{ style: ({ left: t.pct + '%' }) },
        });
        (t.label);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-row-label" },
    });
    (__VLS_ctx.rowLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-row-track" },
    });
    for (const [pct, i] of __VLS_getVForSourceType((__VLS_ctx.gridLines))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            key: ('grid-' + i),
            ...{ class: "gantt-grid-line" },
            ...{ style: ({ left: pct + '%' }) },
        });
    }
    if (__VLS_ctx.showTodayLine) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "gantt-grid-line today" },
            ...{ style: ({ left: __VLS_ctx.todayPct + '%' }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "gantt-today-label" },
            ...{ style: ({ left: __VLS_ctx.todayPct + '%' }) },
        });
    }
    for (const [bar, i] of __VLS_getVForSourceType((__VLS_ctx.bars))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: ('bar-' + i),
            ...{ class: "gantt-bar" },
            ...{ class: (__VLS_ctx.barClass(bar.status)) },
            ...{ style: ({ left: bar.left + '%', width: bar.width + '%' }) },
            title: (bar.title),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "gantt-bar-text" },
        });
        (bar.text);
    }
    if (__VLS_ctx.bars.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "gantt-no-bars" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-legend" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-legend-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-legend-dot" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-legend-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-legend-dot" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-legend-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-legend-dot" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-legend-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-legend-dot" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-legend-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "gantt-legend-dot" },
        ...{ style: {} },
    });
    if (__VLS_ctx.historyList.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "gantt-history-list" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "gantt-history-title" },
        });
        for (const [r] of __VLS_getVForSourceType((__VLS_ctx.historyList))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (r.id),
                ...{ class: "gantt-history-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "status-badge" },
                ...{ class: (__VLS_ctx.statusClass(r.status)) },
            });
            (__VLS_ctx.statusText(r.status));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "history-content" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "work-order" },
            });
            (r.work_order_no);
            (r.user_name);
            (r.user_student_id);
            (__VLS_ctx.fmt(r.borrow_time));
            (__VLS_ctx.fmt(r.actual_return || r.return_time));
            if (r.actual_return) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "early-return-tag" },
                });
            }
        }
    }
}
var __VLS_8;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['timeline-modal-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-close']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header-emoji']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header-info']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['borrowed']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-status-text']} */ ;
/** @type {__VLS_StyleScopedClasses['sub']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['available']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-status-text']} */ ;
/** @type {__VLS_StyleScopedClasses['sub']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-range-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-range-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-range-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-container']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-chart']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-header']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-header-label']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-header-scale']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-header-tick']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-row']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-row-label']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-row-track']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-grid-line']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-grid-line']} */ ;
/** @type {__VLS_StyleScopedClasses['today']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-today-label']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-bar-text']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-no-bars']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-legend-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-legend-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-legend-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-legend-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-legend-item']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-legend-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-history-list']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-history-title']} */ ;
/** @type {__VLS_StyleScopedClasses['gantt-history-item']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['history-content']} */ ;
/** @type {__VLS_StyleScopedClasses['work-order']} */ ;
/** @type {__VLS_StyleScopedClasses['early-return-tag']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NModal: NModal,
            NSpin: NSpin,
            show: show,
            loading: loading,
            equipment: equipment,
            ganttRange: ganttRange,
            statusText: statusText,
            statusClass: statusClass,
            barClass: barClass,
            fmt: fmt,
            categoryIcon: categoryIcon,
            currentBorrower: currentBorrower,
            isBorrowed: isBorrowed,
            ticks: ticks,
            gridLines: gridLines,
            todayPct: todayPct,
            showTodayLine: showTodayLine,
            bars: bars,
            rowLabel: rowLabel,
            historyList: historyList,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
