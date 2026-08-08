/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted } from 'vue';
import { NTag, NButton, NInput, NSelect, NSpin, NModal, NImage, NPopconfirm } from 'naive-ui';
import AppLayout from '@/components/AppLayout.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { getStats, approveRequest, rejectRequest, confirmPickup, confirmReturn } from '@/api/admin';
import { getRequests, deleteRequest } from '@/api/borrow';
import { getCards } from '@/api/card';
import { useToastStore } from '@/stores/toast';
const toast = useToastStore();
// ===== 状态文本 / 颜色 =====
const STATUS_TEXT = {
    pending: '待审核',
    approved: '已通过',
    borrowing: '借用中',
    return_pending: '待归还确认',
    returned: '已归还',
    rejected: '已拒绝',
    cancelled: '已取消'
};
const STATUS_COLORS = {
    pending: 'warning',
    approved: 'info',
    borrowing: 'success',
    return_pending: 'primary',
    returned: 'default',
    rejected: 'error',
    cancelled: 'default'
};
function statusText(status) {
    return STATUS_TEXT[status] || status;
}
function statusTagType(status) {
    return (STATUS_COLORS[status] || 'default');
}
// ===== 日期格式化 =====
function fmt(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime()))
        return dateStr || '-';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
// ===== 错误信息提取 =====
function errMsg(e, fallback = '操作失败') {
    const d = e?.data?.detail;
    if (typeof d === 'string' && d)
        return d;
    if (d && typeof d === 'object' && d.message)
        return d.message;
    return e?.message || fallback;
}
// ===== 数据 =====
const loading = ref(false);
const stats = ref({
    total: 0,
    pending: 0,
    borrowing: 0,
    return_pending: 0
});
const records = ref([]);
const cards = ref([]);
const selectedFilter = ref('pending');
const statItems = computed(() => [
    {
        key: 'pending',
        label: '待审核',
        value: stats.value.pending,
        color: '#d9a421',
        bg: 'rgba(217, 164, 33, 0.12)',
        icon: '⏳'
    },
    {
        key: 'borrowing',
        label: '借用中',
        value: stats.value.borrowing,
        color: 'var(--success)',
        bg: 'var(--success-bg)',
        icon: '📦'
    },
    {
        key: 'return_pending',
        label: '待归还确认',
        value: stats.value.return_pending,
        color: 'var(--info)',
        bg: 'rgba(91, 124, 153, 0.12)',
        icon: '📥'
    },
    {
        key: 'all',
        label: '总申请数',
        value: stats.value.total,
        color: 'var(--text-tertiary)',
        bg: 'rgba(153, 153, 153, 0.12)',
        icon: '📋'
    }
]);
function selectFilter(key) {
    selectedFilter.value = key;
}
// ===== 本地筛选 =====
const filteredRecords = computed(() => {
    if (selectedFilter.value === 'all')
        return records.value;
    return records.value.filter((r) => r.status === selectedFilter.value);
});
const filterTitle = computed(() => {
    switch (selectedFilter.value) {
        case 'pending':
            return '待审核申请';
        case 'borrowing':
            return '借用中记录';
        case 'return_pending':
            return '待归还确认记录';
        default:
            return '全部申请记录';
    }
});
// ===== 相机判断（通过设备类别）=====
function isCamera(record) {
    return (record.equipment_category === '相机' ||
        /相机|camera/i.test(record.equipment_category));
}
// ===== 可用内存卡选项（领取弹窗使用）=====
const availableCards = computed(() => cards.value.filter((c) => c.status === 'available'));
// 卡 ID 从 1 开始，用 0 作为「不配卡」哨兵值
const NO_CARD = 0;
const cardOptions = computed(() => [
    { label: '不配卡', value: NO_CARD },
    ...availableCards.value.map((c) => ({
        label: `${c.code} - ${c.name}`,
        value: c.id
    }))
]);
// ===== 数据加载 =====
// 注：getRequests 类型声明为 BorrowDetail[]，但后端可能返回分页结构 { items, total, page, size }
function normalize(data) {
    if (Array.isArray(data))
        return data;
    if (data && Array.isArray(data.items)) {
        return data.items;
    }
    return [];
}
async function loadStats() {
    try {
        stats.value = await getStats();
    }
    catch (e) {
        toast.error(errMsg(e, '加载统计失败'));
    }
}
async function loadRecords() {
    loading.value = true;
    try {
        const all = [];
        let page = 1;
        const size = 100;
        // 分页拉取全部记录（管理员视角），安全上限避免异常死循环
        for (let i = 0; i < 50; i++) {
            const params = {
                page,
                size
            };
            const res = (await getRequests(params));
            const list = normalize(res);
            all.push(...list);
            const total = typeof res?.total === 'number' ? res.total : list.length;
            if (list.length === 0 || all.length >= total)
                break;
            page++;
        }
        records.value = all;
    }
    catch (e) {
        toast.error(errMsg(e, '加载借用记录失败'));
        records.value = [];
    }
    finally {
        loading.value = false;
    }
}
async function loadCards() {
    try {
        const data = await getCards();
        cards.value = Array.isArray(data) ? data : [];
    }
    catch (e) {
        toast.error(errMsg(e, '加载内存卡列表失败'));
        cards.value = [];
    }
}
async function reload() {
    await Promise.all([loadStats(), loadRecords(), loadCards()]);
}
// ===== 审批 / 拒绝弹窗 =====
const showApproveModal = ref(false);
const showRejectModal = ref(false);
const currentRecord = ref(null);
const approveComment = ref('');
const rejectComment = ref('');
const actionLoading = ref(false);
function openApprove(r) {
    currentRecord.value = r;
    approveComment.value = '';
    showApproveModal.value = true;
}
function openReject(r) {
    currentRecord.value = r;
    rejectComment.value = '';
    showRejectModal.value = true;
}
async function submitApprove() {
    if (!currentRecord.value)
        return;
    actionLoading.value = true;
    try {
        await approveRequest(currentRecord.value.id, approveComment.value.trim() || undefined);
        toast.success('已审批通过');
        showApproveModal.value = false;
        await reload();
    }
    catch (e) {
        toast.error(errMsg(e, '审批失败'));
    }
    finally {
        actionLoading.value = false;
    }
}
async function submitReject() {
    if (!currentRecord.value)
        return;
    if (!rejectComment.value.trim()) {
        toast.warning('请填写拒绝理由');
        return;
    }
    actionLoading.value = true;
    try {
        await rejectRequest(currentRecord.value.id, rejectComment.value.trim());
        toast.success('已拒绝申请');
        showRejectModal.value = false;
        await reload();
    }
    catch (e) {
        toast.error(errMsg(e, '拒绝失败'));
    }
    finally {
        actionLoading.value = false;
    }
}
// ===== 确认领取弹窗 =====
const showPickupModal = ref(false);
const pickupRecord = ref(null);
const pickupCardId = ref(NO_CARD);
async function openPickup(r) {
    pickupRecord.value = r;
    pickupCardId.value = NO_CARD;
    // 如果是相机设备，刷新可用内存卡列表，避免使用过期数据
    if (isCamera(r)) {
        await loadCards();
    }
    showPickupModal.value = true;
}
async function submitPickup() {
    if (!pickupRecord.value)
        return;
    actionLoading.value = true;
    try {
        await confirmPickup(pickupRecord.value.id, pickupCardId.value === NO_CARD ? undefined : pickupCardId.value);
        toast.success('已确认领取');
        showPickupModal.value = false;
        await reload();
    }
    catch (e) {
        toast.error(errMsg(e, '确认领取失败'));
    }
    finally {
        actionLoading.value = false;
    }
}
// ===== 确认归还（Popconfirm 直接确认）=====
const returnLoadingId = ref(null);
async function handleConfirmReturn(r) {
    returnLoadingId.value = r.id;
    try {
        await confirmReturn(r.id);
        toast.success('归还确认完成');
        await reload();
    }
    catch (e) {
        toast.error(errMsg(e, '确认归还失败'));
    }
    finally {
        returnLoadingId.value = null;
    }
}
// ===== 删除（Popconfirm 确认）=====
const deleteLoadingId = ref(null);
async function handleDelete(r) {
    deleteLoadingId.value = r.id;
    try {
        await deleteRequest(r.id);
        toast.success('已删除该申请');
        await reload();
    }
    catch (e) {
        toast.error(errMsg(e, '删除失败'));
    }
    finally {
        deleteLoadingId.value = null;
    }
}
onMounted(reload);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['return-photo']} */ ;
/** @type {__VLS_StyleScopedClasses['n-image-img']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-grid']} */ ;
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
    ...{ class: "stat-grid" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.statItems))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectFilter(item.key);
            } },
        key: (item.key),
        ...{ class: "stat-card" },
        ...{ class: ({ active: __VLS_ctx.selectedFilter === item.key }) },
        ...{ style: ({ '--card-color': item.color, '--card-bg': item.bg }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-card__icon" },
    });
    (item.icon);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-card__content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-card__value" },
    });
    (item.value);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "stat-card__label" },
    });
    (item.label);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "toolbar-title" },
});
(__VLS_ctx.filterTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "toolbar-count" },
});
(__VLS_ctx.filteredRecords.length);
const __VLS_4 = {}.NSpin;
/** @type {[typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    show: (__VLS_ctx.loading),
}));
const __VLS_6 = __VLS_5({
    show: (__VLS_ctx.loading),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "spin-area" },
});
if (__VLS_ctx.filteredRecords.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "request-list" },
    });
    for (const [r] of __VLS_getVForSourceType((__VLS_ctx.filteredRecords))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (r.id),
            ...{ class: "request-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-head" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "work-order" },
        });
        (r.work_order_no);
        const __VLS_8 = {}.NTag;
        /** @type {[typeof __VLS_components.NTag, typeof __VLS_components.nTag, typeof __VLS_components.NTag, typeof __VLS_components.nTag, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            type: (__VLS_ctx.statusTagType(r.status)),
            size: "small",
            round: true,
        }));
        const __VLS_10 = __VLS_9({
            type: (__VLS_ctx.statusTagType(r.status)),
            size: "small",
            round: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        __VLS_11.slots.default;
        (__VLS_ctx.statusText(r.status));
        var __VLS_11;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "value" },
        });
        (r.equipment_name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "value" },
        });
        (r.user_name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "user-id" },
        });
        (r.user_id);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "value" },
        });
        (__VLS_ctx.fmt(r.borrow_time));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "value" },
        });
        (__VLS_ctx.fmt(r.return_time));
        if (r.approver_name) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "value" },
            });
            (r.approver_name);
        }
        if (r.card_name) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "field" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "value" },
            });
            (r.card_name);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "field full" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "value" },
        });
        (r.reason);
        if (r.admin_comment) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "field full" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "value comment" },
            });
            (r.admin_comment);
        }
        if (r.return_photo_url) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "field full" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "photo-wrap" },
            });
            const __VLS_12 = {}.NImage;
            /** @type {[typeof __VLS_components.NImage, typeof __VLS_components.nImage, ]} */ ;
            // @ts-ignore
            const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
                src: (r.return_photo_url),
                previewSrc: (r.return_photo_url),
                width: (96),
                height: (96),
                objectFit: "cover",
                ...{ class: "return-photo" },
                alt: "归还照片",
            }));
            const __VLS_14 = __VLS_13({
                src: (r.return_photo_url),
                previewSrc: (r.return_photo_url),
                width: (96),
                height: (96),
                objectFit: "cover",
                ...{ class: "return-photo" },
                alt: "归还照片",
            }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-actions" },
        });
        if (r.status === 'pending') {
            const __VLS_16 = {}.NButton;
            /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
            // @ts-ignore
            const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
                ...{ 'onClick': {} },
                size: "small",
                type: "success",
            }));
            const __VLS_18 = __VLS_17({
                ...{ 'onClick': {} },
                size: "small",
                type: "success",
            }, ...__VLS_functionalComponentArgsRest(__VLS_17));
            let __VLS_20;
            let __VLS_21;
            let __VLS_22;
            const __VLS_23 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.filteredRecords.length))
                        return;
                    if (!(r.status === 'pending'))
                        return;
                    __VLS_ctx.openApprove(r);
                }
            };
            __VLS_19.slots.default;
            var __VLS_19;
            const __VLS_24 = {}.NButton;
            /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
            // @ts-ignore
            const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
                ...{ 'onClick': {} },
                size: "small",
                type: "error",
                ghost: true,
            }));
            const __VLS_26 = __VLS_25({
                ...{ 'onClick': {} },
                size: "small",
                type: "error",
                ghost: true,
            }, ...__VLS_functionalComponentArgsRest(__VLS_25));
            let __VLS_28;
            let __VLS_29;
            let __VLS_30;
            const __VLS_31 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.filteredRecords.length))
                        return;
                    if (!(r.status === 'pending'))
                        return;
                    __VLS_ctx.openReject(r);
                }
            };
            __VLS_27.slots.default;
            var __VLS_27;
        }
        if (r.status === 'approved') {
            const __VLS_32 = {}.NButton;
            /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
            // @ts-ignore
            const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
                ...{ 'onClick': {} },
                size: "small",
                type: "primary",
            }));
            const __VLS_34 = __VLS_33({
                ...{ 'onClick': {} },
                size: "small",
                type: "primary",
            }, ...__VLS_functionalComponentArgsRest(__VLS_33));
            let __VLS_36;
            let __VLS_37;
            let __VLS_38;
            const __VLS_39 = {
                onClick: (...[$event]) => {
                    if (!(__VLS_ctx.filteredRecords.length))
                        return;
                    if (!(r.status === 'approved'))
                        return;
                    __VLS_ctx.openPickup(r);
                }
            };
            __VLS_35.slots.default;
            var __VLS_35;
        }
        if (r.status === 'return_pending') {
            const __VLS_40 = {}.NPopconfirm;
            /** @type {[typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, ]} */ ;
            // @ts-ignore
            const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
                ...{ 'onPositiveClick': {} },
            }));
            const __VLS_42 = __VLS_41({
                ...{ 'onPositiveClick': {} },
            }, ...__VLS_functionalComponentArgsRest(__VLS_41));
            let __VLS_44;
            let __VLS_45;
            let __VLS_46;
            const __VLS_47 = {
                onPositiveClick: (...[$event]) => {
                    if (!(__VLS_ctx.filteredRecords.length))
                        return;
                    if (!(r.status === 'return_pending'))
                        return;
                    __VLS_ctx.handleConfirmReturn(r);
                }
            };
            __VLS_43.slots.default;
            {
                const { trigger: __VLS_thisSlot } = __VLS_43.slots;
                const __VLS_48 = {}.NButton;
                /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
                // @ts-ignore
                const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
                    size: "small",
                    type: "success",
                    loading: (__VLS_ctx.returnLoadingId === r.id),
                }));
                const __VLS_50 = __VLS_49({
                    size: "small",
                    type: "success",
                    loading: (__VLS_ctx.returnLoadingId === r.id),
                }, ...__VLS_functionalComponentArgsRest(__VLS_49));
                __VLS_51.slots.default;
                var __VLS_51;
            }
            var __VLS_43;
        }
        const __VLS_52 = {}.NPopconfirm;
        /** @type {[typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
            ...{ 'onPositiveClick': {} },
        }));
        const __VLS_54 = __VLS_53({
            ...{ 'onPositiveClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_53));
        let __VLS_56;
        let __VLS_57;
        let __VLS_58;
        const __VLS_59 = {
            onPositiveClick: (...[$event]) => {
                if (!(__VLS_ctx.filteredRecords.length))
                    return;
                __VLS_ctx.handleDelete(r);
            }
        };
        __VLS_55.slots.default;
        {
            const { trigger: __VLS_thisSlot } = __VLS_55.slots;
            const __VLS_60 = {}.NButton;
            /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
            // @ts-ignore
            const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
                size: "small",
                quaternary: true,
                loading: (__VLS_ctx.deleteLoadingId === r.id),
            }));
            const __VLS_62 = __VLS_61({
                size: "small",
                quaternary: true,
                loading: (__VLS_ctx.deleteLoadingId === r.id),
            }, ...__VLS_functionalComponentArgsRest(__VLS_61));
            __VLS_63.slots.default;
            var __VLS_63;
        }
        var __VLS_55;
    }
}
else if (!__VLS_ctx.loading) {
    /** @type {[typeof EmptyState, ]} */ ;
    // @ts-ignore
    const __VLS_64 = __VLS_asFunctionalComponent(EmptyState, new EmptyState({
        icon: "📋",
        text: "暂无符合条件的借用记录",
    }));
    const __VLS_65 = __VLS_64({
        icon: "📋",
        text: "暂无符合条件的借用记录",
    }, ...__VLS_functionalComponentArgsRest(__VLS_64));
}
var __VLS_7;
const __VLS_67 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
    show: (__VLS_ctx.showApproveModal),
    preset: "card",
    title: "审批通过",
    ...{ style: {} },
}));
const __VLS_69 = __VLS_68({
    show: (__VLS_ctx.showApproveModal),
    preset: "card",
    title: "审批通过",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
__VLS_70.slots.default;
if (__VLS_ctx.currentRecord) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.currentRecord.work_order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.currentRecord.equipment_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.currentRecord.user_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.fmt(__VLS_ctx.currentRecord.borrow_time));
    (__VLS_ctx.fmt(__VLS_ctx.currentRecord.return_time));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.currentRecord.reason);
}
const __VLS_71 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
    value: (__VLS_ctx.approveComment),
    type: "textarea",
    placeholder: "审批备注（选填）",
    autosize: ({ minRows: 3, maxRows: 5 }),
    ...{ style: {} },
}));
const __VLS_73 = __VLS_72({
    value: (__VLS_ctx.approveComment),
    type: "textarea",
    placeholder: "审批备注（选填）",
    autosize: ({ minRows: 3, maxRows: 5 }),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_72));
{
    const { footer: __VLS_thisSlot } = __VLS_70.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-footer" },
    });
    const __VLS_75 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
        ...{ 'onClick': {} },
    }));
    const __VLS_77 = __VLS_76({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_76));
    let __VLS_79;
    let __VLS_80;
    let __VLS_81;
    const __VLS_82 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showApproveModal = false;
        }
    };
    __VLS_78.slots.default;
    var __VLS_78;
    const __VLS_83 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
        ...{ 'onClick': {} },
        type: "success",
        loading: (__VLS_ctx.actionLoading),
    }));
    const __VLS_85 = __VLS_84({
        ...{ 'onClick': {} },
        type: "success",
        loading: (__VLS_ctx.actionLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_84));
    let __VLS_87;
    let __VLS_88;
    let __VLS_89;
    const __VLS_90 = {
        onClick: (__VLS_ctx.submitApprove)
    };
    __VLS_86.slots.default;
    var __VLS_86;
}
var __VLS_70;
const __VLS_91 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
    show: (__VLS_ctx.showRejectModal),
    preset: "card",
    title: "拒绝申请",
    ...{ style: {} },
}));
const __VLS_93 = __VLS_92({
    show: (__VLS_ctx.showRejectModal),
    preset: "card",
    title: "拒绝申请",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_92));
__VLS_94.slots.default;
if (__VLS_ctx.currentRecord) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.currentRecord.work_order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.currentRecord.equipment_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.currentRecord.user_name);
}
const __VLS_95 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_96 = __VLS_asFunctionalComponent(__VLS_95, new __VLS_95({
    value: (__VLS_ctx.rejectComment),
    type: "textarea",
    placeholder: "请填写拒绝理由（必填）",
    autosize: ({ minRows: 3, maxRows: 5 }),
    ...{ style: {} },
}));
const __VLS_97 = __VLS_96({
    value: (__VLS_ctx.rejectComment),
    type: "textarea",
    placeholder: "请填写拒绝理由（必填）",
    autosize: ({ minRows: 3, maxRows: 5 }),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_96));
{
    const { footer: __VLS_thisSlot } = __VLS_94.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-footer" },
    });
    const __VLS_99 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_100 = __VLS_asFunctionalComponent(__VLS_99, new __VLS_99({
        ...{ 'onClick': {} },
    }));
    const __VLS_101 = __VLS_100({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_100));
    let __VLS_103;
    let __VLS_104;
    let __VLS_105;
    const __VLS_106 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showRejectModal = false;
        }
    };
    __VLS_102.slots.default;
    var __VLS_102;
    const __VLS_107 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_108 = __VLS_asFunctionalComponent(__VLS_107, new __VLS_107({
        ...{ 'onClick': {} },
        type: "error",
        loading: (__VLS_ctx.actionLoading),
        disabled: (!__VLS_ctx.rejectComment.trim()),
    }));
    const __VLS_109 = __VLS_108({
        ...{ 'onClick': {} },
        type: "error",
        loading: (__VLS_ctx.actionLoading),
        disabled: (!__VLS_ctx.rejectComment.trim()),
    }, ...__VLS_functionalComponentArgsRest(__VLS_108));
    let __VLS_111;
    let __VLS_112;
    let __VLS_113;
    const __VLS_114 = {
        onClick: (__VLS_ctx.submitReject)
    };
    __VLS_110.slots.default;
    var __VLS_110;
}
var __VLS_94;
const __VLS_115 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_116 = __VLS_asFunctionalComponent(__VLS_115, new __VLS_115({
    show: (__VLS_ctx.showPickupModal),
    preset: "card",
    title: "确认领取",
    ...{ style: {} },
}));
const __VLS_117 = __VLS_116({
    show: (__VLS_ctx.showPickupModal),
    preset: "card",
    title: "确认领取",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_116));
__VLS_118.slots.default;
if (__VLS_ctx.pickupRecord) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.pickupRecord.work_order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.pickupRecord.equipment_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.pickupRecord.user_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.fmt(__VLS_ctx.pickupRecord.borrow_time));
    (__VLS_ctx.fmt(__VLS_ctx.pickupRecord.return_time));
}
if (__VLS_ctx.pickupRecord && __VLS_ctx.isCamera(__VLS_ctx.pickupRecord)) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "pickup-card-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "select-label" },
    });
    const __VLS_119 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_120 = __VLS_asFunctionalComponent(__VLS_119, new __VLS_119({
        value: (__VLS_ctx.pickupCardId),
        options: (__VLS_ctx.cardOptions),
        placeholder: "请选择内存卡",
    }));
    const __VLS_121 = __VLS_120({
        value: (__VLS_ctx.pickupCardId),
        options: (__VLS_ctx.cardOptions),
        placeholder: "请选择内存卡",
    }, ...__VLS_functionalComponentArgsRest(__VLS_120));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "select-tip" },
    });
}
{
    const { footer: __VLS_thisSlot } = __VLS_118.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-footer" },
    });
    const __VLS_123 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_124 = __VLS_asFunctionalComponent(__VLS_123, new __VLS_123({
        ...{ 'onClick': {} },
    }));
    const __VLS_125 = __VLS_124({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_124));
    let __VLS_127;
    let __VLS_128;
    let __VLS_129;
    const __VLS_130 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showPickupModal = false;
        }
    };
    __VLS_126.slots.default;
    var __VLS_126;
    const __VLS_131 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_132 = __VLS_asFunctionalComponent(__VLS_131, new __VLS_131({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.actionLoading),
    }));
    const __VLS_133 = __VLS_132({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.actionLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_132));
    let __VLS_135;
    let __VLS_136;
    let __VLS_137;
    const __VLS_138 = {
        onClick: (__VLS_ctx.submitPickup)
    };
    __VLS_134.slots.default;
    var __VLS_134;
}
var __VLS_118;
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__content']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__value']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-card__label']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-title']} */ ;
/** @type {__VLS_StyleScopedClasses['toolbar-count']} */ ;
/** @type {__VLS_StyleScopedClasses['spin-area']} */ ;
/** @type {__VLS_StyleScopedClasses['request-list']} */ ;
/** @type {__VLS_StyleScopedClasses['request-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['work-order']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['user-id']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['comment']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['photo-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['return-photo']} */ ;
/** @type {__VLS_StyleScopedClasses['card-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-info']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-info']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-info']} */ ;
/** @type {__VLS_StyleScopedClasses['pickup-card-select']} */ ;
/** @type {__VLS_StyleScopedClasses['select-label']} */ ;
/** @type {__VLS_StyleScopedClasses['select-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-footer']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NTag: NTag,
            NButton: NButton,
            NInput: NInput,
            NSelect: NSelect,
            NSpin: NSpin,
            NModal: NModal,
            NImage: NImage,
            NPopconfirm: NPopconfirm,
            AppLayout: AppLayout,
            EmptyState: EmptyState,
            statusText: statusText,
            statusTagType: statusTagType,
            fmt: fmt,
            loading: loading,
            selectedFilter: selectedFilter,
            statItems: statItems,
            selectFilter: selectFilter,
            filteredRecords: filteredRecords,
            filterTitle: filterTitle,
            isCamera: isCamera,
            cardOptions: cardOptions,
            showApproveModal: showApproveModal,
            showRejectModal: showRejectModal,
            currentRecord: currentRecord,
            approveComment: approveComment,
            rejectComment: rejectComment,
            actionLoading: actionLoading,
            openApprove: openApprove,
            openReject: openReject,
            submitApprove: submitApprove,
            submitReject: submitReject,
            showPickupModal: showPickupModal,
            pickupRecord: pickupRecord,
            pickupCardId: pickupCardId,
            openPickup: openPickup,
            submitPickup: submitPickup,
            returnLoadingId: returnLoadingId,
            handleConfirmReturn: handleConfirmReturn,
            deleteLoadingId: deleteLoadingId,
            handleDelete: handleDelete,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
