/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted } from 'vue';
import { NSpin } from 'naive-ui';
import AppLayout from '@/components/AppLayout.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import FilterTabs from '@/components/common/FilterTabs.vue';
import { getLogs } from '@/api/admin';
import { useToastStore } from '@/stores/toast';
const toast = useToastStore();
/** 后端实际写入的 action 字符串（中文）与图标/颜色映射 */
const ACTION_META = {
    提交申请: { icon: '📝', color: 'var(--info)' },
    审批通过: { icon: '✅', color: 'var(--success)' },
    拒绝申请: { icon: '❌', color: 'var(--danger)' },
    确认领取: { icon: '📦', color: 'var(--warning)' },
    提交归还: { icon: '📷', color: 'var(--warning)' },
    确认归还: { icon: '🔄', color: 'var(--success)' },
    取消申请: { icon: '🚫', color: 'var(--text-tertiary)' },
    删除记录: { icon: '🗑️', color: 'var(--danger)' },
    添加设备: { icon: '➕', color: 'var(--success)' },
    编辑设备: { icon: '✏️', color: 'var(--warning)' },
    删除设备: { icon: '🗑️', color: 'var(--danger)' },
    设备设为维修: { icon: '🔧', color: 'var(--warning)' },
    设备设为可用: { icon: '✓', color: 'var(--success)' },
    添加内存卡: { icon: '➕', color: 'var(--success)' },
    编辑内存卡: { icon: '✏️', color: 'var(--warning)' },
    删除内存卡: { icon: '🗑️', color: 'var(--danger)' }
};
/** 默认元数据：无图标用 • */
const DEFAULT_META = {
    icon: '•',
    color: 'var(--text-tertiary)'
};
function metaOf(action) {
    return ACTION_META[action] || DEFAULT_META;
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
];
const loading = ref(false);
const logs = ref([]);
const activeTab = ref('all');
/** 预计算每条日志的元数据，避免模板中多次调用 */
const logsWithMeta = computed(() => logs.value.map((log) => ({ log, meta: metaOf(log.action) })));
/** 相对时间格式化 */
function fmtLogTime(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime()))
        return '';
    const diff = Date.now() - d.getTime();
    if (diff < 60000)
        return '刚刚';
    if (diff < 3600000)
        return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000)
        return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000)
        return Math.floor(diff / 86400000) + '天前';
    return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
/**
 * 加载日志列表（按 action 筛选）
 * 注意：getLogs 可能返回数组或分页对象，用 Array.isArray 兼容处理
 */
async function loadLogs() {
    loading.value = true;
    try {
        const params = {};
        if (activeTab.value !== 'all') {
            params.action = activeTab.value;
        }
        const result = (await getLogs(params));
        logs.value = Array.isArray(result) ? result : result.items;
    }
    catch (e) {
        toast.error(errMsg(e, '加载日志失败'));
        logs.value = [];
    }
    finally {
        loading.value = false;
    }
}
/** 切换筛选标签 */
function onTabChange(v) {
    activeTab.value = v;
    loadLogs();
}
onMounted(loadLogs);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['log-item']} */ ;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toolbar" },
});
/** @type {[typeof FilterTabs, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(FilterTabs, new FilterTabs({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.activeTab),
    tabs: (__VLS_ctx.tabs),
}));
const __VLS_5 = __VLS_4({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.activeTab),
    tabs: (__VLS_ctx.tabs),
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
let __VLS_7;
let __VLS_8;
let __VLS_9;
const __VLS_10 = {
    'onUpdate:modelValue': (__VLS_ctx.onTabChange)
};
var __VLS_6;
const __VLS_11 = {}.NSpin;
/** @type {[typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
    show: (__VLS_ctx.loading),
}));
const __VLS_13 = __VLS_12({
    show: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
__VLS_14.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "spin-area" },
});
if (__VLS_ctx.logs.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "log-list" },
    });
    for (const [{ log, meta }] of __VLS_getVForSourceType((__VLS_ctx.logsWithMeta))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (log.id),
            ...{ class: "log-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "log-icon" },
            ...{ style: ({
                    color: meta.color,
                    background: `color-mix(in srgb, ${meta.color} 14%, transparent)`
                }) },
        });
        (meta.icon);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "log-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "log-top" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "log-action" },
            ...{ style: ({ color: meta.color }) },
        });
        (log.action);
        if (log.detail) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "log-detail" },
            });
            (log.detail);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "log-foot" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "log-actor" },
        });
        (log.actor_name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "log-time" },
        });
        (__VLS_ctx.fmtLogTime(log.created_at));
    }
}
else if (!__VLS_ctx.loading) {
    /** @type {[typeof EmptyState, ]} */ ;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent(EmptyState, new EmptyState({
        icon: "🗒️",
        text: "暂无操作日志",
    }));
    const __VLS_16 = __VLS_15({
        icon: "🗒️",
        text: "暂无操作日志",
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
}
var __VLS_14;
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['spin-area']} */ ;
/** @type {__VLS_StyleScopedClasses['log-list']} */ ;
/** @type {__VLS_StyleScopedClasses['log-item']} */ ;
/** @type {__VLS_StyleScopedClasses['log-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['log-main']} */ ;
/** @type {__VLS_StyleScopedClasses['log-top']} */ ;
/** @type {__VLS_StyleScopedClasses['log-action']} */ ;
/** @type {__VLS_StyleScopedClasses['log-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['log-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['log-actor']} */ ;
/** @type {__VLS_StyleScopedClasses['log-time']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NSpin: NSpin,
            AppLayout: AppLayout,
            EmptyState: EmptyState,
            FilterTabs: FilterTabs,
            tabs: tabs,
            loading: loading,
            logs: logs,
            activeTab: activeTab,
            logsWithMeta: logsWithMeta,
            fmtLogTime: fmtLogTime,
            onTabChange: onTabChange,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
