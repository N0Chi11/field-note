/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted } from 'vue';
import { NInput, NButton, NSelect, NSpin, NModal, NUpload, NPopconfirm } from 'naive-ui';
import AppLayout from '@/components/AppLayout.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { getRequests, deleteRequest, submitReturn } from '@/api/borrow';
import { approveRequest, rejectRequest, confirmPickup, confirmReturn } from '@/api/admin';
import { getCards } from '@/api/card';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
const toast = useToastStore();
const authStore = useAuthStore();
const isAdmin = computed(() => !!authStore.isAdmin);
const currentUserId = computed(() => authStore.user?.id || 0);
// 状态文本映射
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
// 状态徽章 class（与原 HTML 的 status-* 一致，下划线转连字符）
function statusClass(status) {
    return `status-${status.replace(/_/g, '-')}`;
}
// 归还紧迫度标签（仅 borrowing 状态显示）
function urgencyTag(r) {
    if (r.status !== 'borrowing')
        return null;
    const returnTs = new Date(r.return_time).getTime();
    if (isNaN(returnTs))
        return null;
    const diff = returnTs - Date.now();
    if (diff < 0)
        return { type: 'overdue', text: `已逾期 ${Math.ceil(-diff / 3600000)} 小时` };
    if (diff < 3600000 * 24)
        return { type: 'urgent', text: '今日到期' };
    if (diff < 3600000 * 48)
        return { type: 'soon', text: '明日到期' };
    return null;
}
// 日期格式化
function fmt(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime()))
        return dateStr;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
const loading = ref(false);
const requests = ref([]);
const keyword = ref('');
const activeTab = ref('all');
// 本地过滤：标签 + 关键字
const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase();
    return requests.value.filter((r) => {
        // 标签过滤
        if (activeTab.value === 'pending' && r.status !== 'pending')
            return false;
        if (activeTab.value === 'active' &&
            !['approved', 'borrowing', 'return_pending'].includes(r.status))
            return false;
        if (activeTab.value === 'returned' && r.status !== 'returned')
            return false;
        if (activeTab.value === 'rejected' && r.status !== 'rejected')
            return false;
        // 关键字过滤
        if (kw) {
            const hit = r.work_order_no.toLowerCase().includes(kw) ||
                r.equipment_name.toLowerCase().includes(kw) ||
                r.user_name.toLowerCase().includes(kw) ||
                (r.user_student_id || '').toLowerCase().includes(kw) ||
                r.reason.toLowerCase().includes(kw);
            if (!hit)
                return false;
        }
        return true;
    });
});
// 是否有操作按钮（管理员始终可删除）
function hasActions(r) {
    if (isAdmin.value)
        return true;
    return r.status === 'borrowing' || r.status === 'pending';
}
// 首次加载：分页拉取全部记录（本地过滤）
// 注：getRequests 的类型声明为 BorrowDetail[]，实际返回分页结构 { items, total, page, size }
async function loadRequests() {
    loading.value = true;
    try {
        const all = [];
        let page = 1;
        const size = 100;
        // 安全上限，避免异常时死循环
        for (let i = 0; i < 50; i++) {
            const params = {
                page,
                size
            };
            const res = (await getRequests(params));
            all.push(...res.items);
            if (res.items.length === 0 || all.length >= res.total)
                break;
            page++;
        }
        requests.value = all;
    }
    catch (e) {
        toast.error(errMsg(e, '加载借用记录失败'));
        requests.value = [];
    }
    finally {
        loading.value = false;
    }
}
// 导出 CSV（仅管理员）
function exportCSV() {
    const rows = [
        [
            '工单号',
            '借用人',
            '学号',
            '设备',
            '配套内存卡',
            '借用时间',
            '归还时间',
            '借用理由',
            '状态',
            '审批人',
            '审批备注',
            '创建时间'
        ]
    ];
    requests.value.forEach((r) => {
        rows.push([
            r.work_order_no,
            r.user_name,
            r.user_student_id,
            r.equipment_name,
            r.card_name || '',
            r.borrow_time,
            r.return_time,
            r.reason,
            statusText(r.status),
            r.approver_name || '',
            r.admin_comment || '',
            r.created_at
        ]);
    });
    const csv = '\uFEFF' +
        rows
            .map((row) => row
            .map((cell) => {
            const s = String(cell || '');
            return s.includes(',') || s.includes('"') || s.includes('\n')
                ? '"' + s.replace(/"/g, '""') + '"'
                : s;
        })
            .join(','))
            .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `借用记录_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV已导出');
}
// ===== 归还照片预览 =====
const showPhotoModal = ref(false);
const previewPhoto = ref('');
function viewPhoto(url) {
    previewPhoto.value = url;
    showPhotoModal.value = true;
}
// ===== 普通用户：上传归还照片 =====
const showUploadModal = ref(false);
const currentUpload = ref(null);
function openUpload(r) {
    currentUpload.value = r;
    showUploadModal.value = true;
}
function customUpload(options) {
    const { file, onFinish, onError } = options;
    const id = currentUpload.value?.id;
    if (!id || !file.file) {
        onError();
        return;
    }
    submitReturn(id, file.file)
        .then(() => {
        onFinish();
        toast.success('归还已提交，待管理员确认');
        showUploadModal.value = false;
        loadRequests();
    })
        .catch((e) => {
        toast.error(errMsg(e, '上传失败'));
        onError();
    });
}
// ===== 普通用户：取消申请 =====
async function cancelRequest(r) {
    try {
        await deleteRequest(r.id);
        toast.success('已取消申请');
        loadRequests();
    }
    catch (e) {
        toast.error(errMsg(e, '取消失败'));
    }
}
// ===== 管理员：删除记录 =====
async function adminDelete(r) {
    try {
        await deleteRequest(r.id);
        toast.success('已删除记录');
        loadRequests();
    }
    catch (e) {
        toast.error(errMsg(e, '删除失败'));
    }
}
// ===== 管理员：审批 / 拒绝 =====
const showActionModal = ref(false);
const actionType = ref('approve');
const actionComment = ref('');
const actionLoading = ref(false);
const currentAction = ref(null);
function openAction(r, type) {
    currentAction.value = r;
    actionType.value = type;
    actionComment.value = '';
    showActionModal.value = true;
}
async function submitAction() {
    if (!currentAction.value)
        return;
    if (actionType.value === 'reject' && !actionComment.value.trim()) {
        toast.warning('请填写拒绝理由');
        return;
    }
    actionLoading.value = true;
    try {
        if (actionType.value === 'approve') {
            await approveRequest(currentAction.value.id, actionComment.value.trim() || undefined);
            toast.success('已审批通过');
        }
        else {
            await rejectRequest(currentAction.value.id, actionComment.value.trim());
            toast.success('已拒绝申请');
        }
        showActionModal.value = false;
        loadRequests();
    }
    catch (e) {
        toast.error(errMsg(e, '操作失败'));
    }
    finally {
        actionLoading.value = false;
    }
}
// ===== 管理员：确认领取（配卡弹窗）=====
const showPickupModal = ref(false);
const pickupRecord = ref(null);
const availableCards = ref([]);
const selectedCardId = ref(0);
const pickupLoading = ref(false);
// 卡 ID 从 1 开始，用 0 作为「不配卡」哨兵值
const NO_CARD = 0;
const cardOptions = computed(() => [
    { label: '不配卡', value: NO_CARD },
    ...availableCards.value.map((c) => ({
        label: `${c.code} - ${c.name}`,
        value: c.id
    }))
]);
// 相机判断（通过设备类别）
function isCamera(record) {
    return (record.equipment_category === '相机' ||
        /相机|camera/i.test(record.equipment_category));
}
async function openPickupModal(record) {
    pickupRecord.value = record;
    selectedCardId.value = NO_CARD;
    availableCards.value = [];
    // 如果是相机设备，加载可用内存卡列表
    if (isCamera(record)) {
        try {
            const data = await getCards();
            const cards = Array.isArray(data) ? data : [];
            availableCards.value = cards.filter((c) => c.status === 'available');
        }
        catch (e) {
            toast.error(errMsg(e, '加载内存卡列表失败'));
            availableCards.value = [];
        }
    }
    showPickupModal.value = true;
}
async function confirmPickupWithCard() {
    if (!pickupRecord.value)
        return;
    pickupLoading.value = true;
    try {
        await confirmPickup(pickupRecord.value.id, selectedCardId.value === NO_CARD ? undefined : selectedCardId.value);
        toast.success('已确认领取');
        showPickupModal.value = false;
        loadRequests();
    }
    catch (e) {
        toast.error(errMsg(e, '确认领取失败'));
    }
    finally {
        pickupLoading.value = false;
    }
}
// ===== 管理员：确认归还 =====
async function confirmReturnHandler(r) {
    try {
        await confirmReturn(r.id);
        toast.success('归还确认完成');
        loadRequests();
    }
    catch (e) {
        toast.error(errMsg(e, '操作失败'));
    }
}
// 统一错误信息提取
function errMsg(e, fallback = '操作失败') {
    const d = e?.data?.detail;
    if (typeof d === 'string' && d)
        return d;
    if (d && typeof d === 'object' && d.message)
        return d.message;
    return e?.message || fallback;
}
onMounted(loadRequests);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['urgency-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['urgency-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['urgency-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['status-pending']} */ ;
/** @type {__VLS_StyleScopedClasses['status-approved']} */ ;
/** @type {__VLS_StyleScopedClasses['status-borrowing']} */ ;
/** @type {__VLS_StyleScopedClasses['status-return-pending']} */ ;
/** @type {__VLS_StyleScopedClasses['status-returned']} */ ;
/** @type {__VLS_StyleScopedClasses['status-rejected']} */ ;
/** @type {__VLS_StyleScopedClasses['status-cancelled']} */ ;
/** @type {__VLS_StyleScopedClasses['request-card']} */ ;
/** @type {__VLS_StyleScopedClasses['request-body']} */ ;
/** @type {__VLS_StyleScopedClasses['request-body']} */ ;
/** @type {__VLS_StyleScopedClasses['request-body']} */ ;
/** @type {__VLS_StyleScopedClasses['return-photo-display']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['request-body']} */ ;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.isAdmin ? '查看所有借用申请及审核状态' : '查看您的借用申请及审核状态');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "filter-tabs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'all';
        } },
    type: "button",
    ...{ class: "filter-tab" },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'all' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'pending';
        } },
    type: "button",
    ...{ class: "filter-tab" },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'pending' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'active';
        } },
    type: "button",
    ...{ class: "filter-tab" },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'active' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'returned';
        } },
    type: "button",
    ...{ class: "filter-tab" },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'returned' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.activeTab = 'rejected';
        } },
    type: "button",
    ...{ class: "filter-tab" },
    ...{ class: ({ active: __VLS_ctx.activeTab === 'rejected' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "overview-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    value: (__VLS_ctx.keyword),
    type: "text",
    ...{ class: "search-input" },
    placeholder: "搜索工单号、借用人、设备名...",
});
if (__VLS_ctx.isAdmin) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.exportCSV) },
        type: "button",
        ...{ class: "btn btn-secondary btn-sm" },
        title: "导出全部借用记录",
    });
}
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
if (__VLS_ctx.filtered.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "request-list" },
    });
    for (const [r, i] of __VLS_getVForSourceType((__VLS_ctx.filtered))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (r.id),
            ...{ class: "request-card" },
            ...{ style: ({ animationDelay: i * 0.03 + 's' }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "request-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "work-order" },
        });
        (r.work_order_no);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "status-badge" },
            ...{ class: (__VLS_ctx.statusClass(r.status)) },
        });
        (__VLS_ctx.statusText(r.status));
        if (__VLS_ctx.urgencyTag(r)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "urgency-tag" },
                ...{ class: (__VLS_ctx.urgencyTag(r).type) },
            });
            (__VLS_ctx.urgencyTag(r).text);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "request-body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "value" },
        });
        (r.equipment_name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "value" },
        });
        (r.user_name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "value" },
        });
        (__VLS_ctx.fmt(r.borrow_time));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "value" },
        });
        (__VLS_ctx.fmt(r.return_time));
        if (r.approver_name) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "value" },
            });
            (r.approver_name);
        }
        if (r.card_name) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "value" },
            });
            (r.card_name);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "full" },
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
                ...{ class: "full" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "value" },
            });
            (r.admin_comment);
        }
        if (r.return_photo_url) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "full" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.filtered.length))
                            return;
                        if (!(r.return_photo_url))
                            return;
                        __VLS_ctx.viewPhoto(r.return_photo_url);
                    } },
                src: (r.return_photo_url),
                ...{ class: "return-photo-display" },
                alt: "归还照片",
            });
        }
        if (__VLS_ctx.hasActions(r)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "request-actions" },
            });
            if (r.status === 'borrowing' && r.user_id === __VLS_ctx.currentUserId) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!(__VLS_ctx.filtered.length))
                                return;
                            if (!(__VLS_ctx.hasActions(r)))
                                return;
                            if (!(r.status === 'borrowing' && r.user_id === __VLS_ctx.currentUserId))
                                return;
                            __VLS_ctx.openUpload(r);
                        } },
                    type: "button",
                    ...{ class: "btn btn-secondary btn-sm" },
                });
            }
            if (!__VLS_ctx.isAdmin) {
                if (r.status === 'pending') {
                    const __VLS_8 = {}.NPopconfirm;
                    /** @type {[typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, ]} */ ;
                    // @ts-ignore
                    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
                        ...{ 'onPositiveClick': {} },
                    }));
                    const __VLS_10 = __VLS_9({
                        ...{ 'onPositiveClick': {} },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
                    let __VLS_12;
                    let __VLS_13;
                    let __VLS_14;
                    const __VLS_15 = {
                        onPositiveClick: (...[$event]) => {
                            if (!(__VLS_ctx.filtered.length))
                                return;
                            if (!(__VLS_ctx.hasActions(r)))
                                return;
                            if (!(!__VLS_ctx.isAdmin))
                                return;
                            if (!(r.status === 'pending'))
                                return;
                            __VLS_ctx.cancelRequest(r);
                        }
                    };
                    __VLS_11.slots.default;
                    {
                        const { trigger: __VLS_thisSlot } = __VLS_11.slots;
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                            type: "button",
                            ...{ class: "btn btn-secondary btn-sm" },
                        });
                    }
                    var __VLS_11;
                }
            }
            else {
                if (r.status === 'pending') {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.filtered.length))
                                    return;
                                if (!(__VLS_ctx.hasActions(r)))
                                    return;
                                if (!!(!__VLS_ctx.isAdmin))
                                    return;
                                if (!(r.status === 'pending'))
                                    return;
                                __VLS_ctx.openAction(r, 'approve');
                            } },
                        type: "button",
                        ...{ class: "btn btn-success btn-sm" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.filtered.length))
                                    return;
                                if (!(__VLS_ctx.hasActions(r)))
                                    return;
                                if (!!(!__VLS_ctx.isAdmin))
                                    return;
                                if (!(r.status === 'pending'))
                                    return;
                                __VLS_ctx.openAction(r, 'reject');
                            } },
                        type: "button",
                        ...{ class: "btn btn-danger btn-sm" },
                    });
                }
                if (r.status === 'approved') {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.filtered.length))
                                    return;
                                if (!(__VLS_ctx.hasActions(r)))
                                    return;
                                if (!!(!__VLS_ctx.isAdmin))
                                    return;
                                if (!(r.status === 'approved'))
                                    return;
                                __VLS_ctx.openPickupModal(r);
                            } },
                        type: "button",
                        ...{ class: "btn btn-primary btn-sm" },
                    });
                }
                if (r.status === 'return_pending') {
                    const __VLS_16 = {}.NPopconfirm;
                    /** @type {[typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, ]} */ ;
                    // @ts-ignore
                    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
                        ...{ 'onPositiveClick': {} },
                    }));
                    const __VLS_18 = __VLS_17({
                        ...{ 'onPositiveClick': {} },
                    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
                    let __VLS_20;
                    let __VLS_21;
                    let __VLS_22;
                    const __VLS_23 = {
                        onPositiveClick: (...[$event]) => {
                            if (!(__VLS_ctx.filtered.length))
                                return;
                            if (!(__VLS_ctx.hasActions(r)))
                                return;
                            if (!!(!__VLS_ctx.isAdmin))
                                return;
                            if (!(r.status === 'return_pending'))
                                return;
                            __VLS_ctx.confirmReturnHandler(r);
                        }
                    };
                    __VLS_19.slots.default;
                    {
                        const { trigger: __VLS_thisSlot } = __VLS_19.slots;
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                            type: "button",
                            ...{ class: "btn btn-success btn-sm" },
                        });
                    }
                    var __VLS_19;
                }
                const __VLS_24 = {}.NPopconfirm;
                /** @type {[typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, ]} */ ;
                // @ts-ignore
                const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
                    ...{ 'onPositiveClick': {} },
                }));
                const __VLS_26 = __VLS_25({
                    ...{ 'onPositiveClick': {} },
                }, ...__VLS_functionalComponentArgsRest(__VLS_25));
                let __VLS_28;
                let __VLS_29;
                let __VLS_30;
                const __VLS_31 = {
                    onPositiveClick: (...[$event]) => {
                        if (!(__VLS_ctx.filtered.length))
                            return;
                        if (!(__VLS_ctx.hasActions(r)))
                            return;
                        if (!!(!__VLS_ctx.isAdmin))
                            return;
                        __VLS_ctx.adminDelete(r);
                    }
                };
                __VLS_27.slots.default;
                {
                    const { trigger: __VLS_thisSlot } = __VLS_27.slots;
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                        type: "button",
                        ...{ class: "btn btn-danger btn-sm" },
                    });
                }
                var __VLS_27;
            }
        }
    }
}
else {
    /** @type {[typeof EmptyState, ]} */ ;
    // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent(EmptyState, new EmptyState({
        icon: "📋",
        text: "暂无借用记录",
    }));
    const __VLS_33 = __VLS_32({
        icon: "📋",
        text: "暂无借用记录",
    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
}
var __VLS_7;
const __VLS_35 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
    show: (__VLS_ctx.showUploadModal),
    preset: "card",
    title: "上传归还照片",
    ...{ style: {} },
}));
const __VLS_37 = __VLS_36({
    show: (__VLS_ctx.showUploadModal),
    preset: "card",
    title: "上传归还照片",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_36));
__VLS_38.slots.default;
if (__VLS_ctx.currentUpload) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.currentUpload.work_order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.currentUpload.equipment_name);
}
const __VLS_39 = {}.NUpload;
/** @type {[typeof __VLS_components.NUpload, typeof __VLS_components.nUpload, typeof __VLS_components.NUpload, typeof __VLS_components.nUpload, ]} */ ;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
    customRequest: (__VLS_ctx.customUpload),
    accept: "image/*",
    max: (1),
    listType: "image-card",
}));
const __VLS_41 = __VLS_40({
    customRequest: (__VLS_ctx.customUpload),
    accept: "image/*",
    max: (1),
    listType: "image-card",
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
__VLS_42.slots.default;
var __VLS_42;
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "upload-tip" },
});
var __VLS_38;
const __VLS_43 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
    show: (__VLS_ctx.showActionModal),
    preset: "card",
    title: (__VLS_ctx.actionType === 'approve' ? '审批通过' : '拒绝申请'),
    ...{ style: {} },
}));
const __VLS_45 = __VLS_44({
    show: (__VLS_ctx.showActionModal),
    preset: "card",
    title: (__VLS_ctx.actionType === 'approve' ? '审批通过' : '拒绝申请'),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_44));
__VLS_46.slots.default;
if (__VLS_ctx.currentAction) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.currentAction.work_order_no);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.currentAction.equipment_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.currentAction.user_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.fmt(__VLS_ctx.currentAction.borrow_time));
    (__VLS_ctx.fmt(__VLS_ctx.currentAction.return_time));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.currentAction.reason);
}
const __VLS_47 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
    value: (__VLS_ctx.actionComment),
    type: "textarea",
    placeholder: (__VLS_ctx.actionType === 'approve'
        ? '审批备注（选填）'
        : '请填写拒绝理由（必填）'),
    autosize: ({ minRows: 3, maxRows: 5 }),
    ...{ style: {} },
}));
const __VLS_49 = __VLS_48({
    value: (__VLS_ctx.actionComment),
    type: "textarea",
    placeholder: (__VLS_ctx.actionType === 'approve'
        ? '审批备注（选填）'
        : '请填写拒绝理由（必填）'),
    autosize: ({ minRows: 3, maxRows: 5 }),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_48));
{
    const { footer: __VLS_thisSlot } = __VLS_46.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-footer" },
    });
    const __VLS_51 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
        ...{ 'onClick': {} },
    }));
    const __VLS_53 = __VLS_52({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
    let __VLS_55;
    let __VLS_56;
    let __VLS_57;
    const __VLS_58 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showActionModal = false;
        }
    };
    __VLS_54.slots.default;
    var __VLS_54;
    const __VLS_59 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
        ...{ 'onClick': {} },
        type: (__VLS_ctx.actionType === 'approve' ? 'success' : 'error'),
        loading: (__VLS_ctx.actionLoading),
        disabled: (__VLS_ctx.actionType === 'reject' && !__VLS_ctx.actionComment.trim()),
    }));
    const __VLS_61 = __VLS_60({
        ...{ 'onClick': {} },
        type: (__VLS_ctx.actionType === 'approve' ? 'success' : 'error'),
        loading: (__VLS_ctx.actionLoading),
        disabled: (__VLS_ctx.actionType === 'reject' && !__VLS_ctx.actionComment.trim()),
    }, ...__VLS_functionalComponentArgsRest(__VLS_60));
    let __VLS_63;
    let __VLS_64;
    let __VLS_65;
    const __VLS_66 = {
        onClick: (__VLS_ctx.submitAction)
    };
    __VLS_62.slots.default;
    (__VLS_ctx.actionType === 'approve' ? '确认通过' : '确认拒绝');
    var __VLS_62;
}
var __VLS_46;
const __VLS_67 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
    show: (__VLS_ctx.showPhotoModal),
    preset: "card",
    title: "归还照片",
    ...{ style: {} },
}));
const __VLS_69 = __VLS_68({
    show: (__VLS_ctx.showPhotoModal),
    preset: "card",
    title: "归还照片",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_68));
__VLS_70.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: (__VLS_ctx.previewPhoto),
    ...{ class: "photo-preview" },
    alt: "归还照片",
});
var __VLS_70;
const __VLS_71 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
    show: (__VLS_ctx.showPickupModal),
    preset: "card",
    title: "确认领取",
    ...{ style: {} },
}));
const __VLS_73 = __VLS_72({
    show: (__VLS_ctx.showPickupModal),
    preset: "card",
    title: "确认领取",
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_72));
__VLS_74.slots.default;
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
    const __VLS_75 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
    // @ts-ignore
    const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
        value: (__VLS_ctx.selectedCardId),
        options: (__VLS_ctx.cardOptions),
        placeholder: "请选择内存卡",
    }));
    const __VLS_77 = __VLS_76({
        value: (__VLS_ctx.selectedCardId),
        options: (__VLS_ctx.cardOptions),
        placeholder: "请选择内存卡",
    }, ...__VLS_functionalComponentArgsRest(__VLS_76));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "select-tip" },
    });
}
{
    const { footer: __VLS_thisSlot } = __VLS_74.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-footer" },
    });
    const __VLS_79 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_80 = __VLS_asFunctionalComponent(__VLS_79, new __VLS_79({
        ...{ 'onClick': {} },
    }));
    const __VLS_81 = __VLS_80({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_80));
    let __VLS_83;
    let __VLS_84;
    let __VLS_85;
    const __VLS_86 = {
        onClick: (...[$event]) => {
            __VLS_ctx.showPickupModal = false;
        }
    };
    __VLS_82.slots.default;
    var __VLS_82;
    const __VLS_87 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.pickupLoading),
    }));
    const __VLS_89 = __VLS_88({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.pickupLoading),
    }, ...__VLS_functionalComponentArgsRest(__VLS_88));
    let __VLS_91;
    let __VLS_92;
    let __VLS_93;
    const __VLS_94 = {
        onClick: (__VLS_ctx.confirmPickupWithCard)
    };
    __VLS_90.slots.default;
    var __VLS_90;
}
var __VLS_74;
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tab']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['request-list']} */ ;
/** @type {__VLS_StyleScopedClasses['request-card']} */ ;
/** @type {__VLS_StyleScopedClasses['request-header']} */ ;
/** @type {__VLS_StyleScopedClasses['work-order']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['urgency-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['request-body']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['return-photo-display']} */ ;
/** @type {__VLS_StyleScopedClasses['request-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-success']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-info']} */ ;
/** @type {__VLS_StyleScopedClasses['upload-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-info']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['photo-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-info']} */ ;
/** @type {__VLS_StyleScopedClasses['pickup-card-select']} */ ;
/** @type {__VLS_StyleScopedClasses['select-label']} */ ;
/** @type {__VLS_StyleScopedClasses['select-tip']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-footer']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NInput: NInput,
            NButton: NButton,
            NSelect: NSelect,
            NSpin: NSpin,
            NModal: NModal,
            NUpload: NUpload,
            NPopconfirm: NPopconfirm,
            AppLayout: AppLayout,
            EmptyState: EmptyState,
            isAdmin: isAdmin,
            currentUserId: currentUserId,
            statusText: statusText,
            statusClass: statusClass,
            urgencyTag: urgencyTag,
            fmt: fmt,
            loading: loading,
            keyword: keyword,
            activeTab: activeTab,
            filtered: filtered,
            hasActions: hasActions,
            exportCSV: exportCSV,
            showPhotoModal: showPhotoModal,
            previewPhoto: previewPhoto,
            viewPhoto: viewPhoto,
            showUploadModal: showUploadModal,
            currentUpload: currentUpload,
            openUpload: openUpload,
            customUpload: customUpload,
            cancelRequest: cancelRequest,
            adminDelete: adminDelete,
            showActionModal: showActionModal,
            actionType: actionType,
            actionComment: actionComment,
            actionLoading: actionLoading,
            currentAction: currentAction,
            openAction: openAction,
            submitAction: submitAction,
            showPickupModal: showPickupModal,
            pickupRecord: pickupRecord,
            selectedCardId: selectedCardId,
            pickupLoading: pickupLoading,
            cardOptions: cardOptions,
            isCamera: isCamera,
            openPickupModal: openPickupModal,
            confirmPickupWithCard: confirmPickupWithCard,
            confirmReturnHandler: confirmReturnHandler,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
