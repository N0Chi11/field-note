/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, onMounted } from 'vue';
import { NTag, NButton, NSpin, NImage, NPopconfirm } from 'naive-ui';
import AppLayout from '@/components/AppLayout.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import { getRequests, deleteRequest } from '@/api/borrow';
import { confirmReturn } from '@/api/admin';
import { useToastStore } from '@/stores/toast';
const toast = useToastStore();
const loading = ref(false);
const confirmingId = ref(null);
const deletingId = ref(null);
const records = ref([]);
/** 日期格式化：YYYY-MM-DD HH:mm */
function fmt(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime()))
        return dateStr;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
 * 兼容返回结构：
 * - 类型声明为 BorrowDetail[]，但后端可能返回分页结构 { items, total, page, size }
 * - 这里两种都能处理
 */
function normalize(data) {
    if (Array.isArray(data))
        return data;
    if (data && Array.isArray(data.items)) {
        return data.items;
    }
    return [];
}
/** 加载待归还确认的记录（status=return_pending） */
async function loadRecords() {
    loading.value = true;
    try {
        const all = [];
        let page = 1;
        const size = 100;
        // return_pending 通常不多，循环拉取兜底，最多 5 页
        for (let i = 0; i < 5; i++) {
            const res = (await getRequests({
                status: 'return_pending',
                page,
                size
            }));
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
        toast.error(errMsg(e, '加载归还记录失败'));
        records.value = [];
    }
    finally {
        loading.value = false;
    }
}
/** 确认归还完成 */
async function handleConfirm(r) {
    confirmingId.value = r.id;
    try {
        await confirmReturn(r.id);
        toast.success('归还确认完成');
        // 刷新列表
        await loadRecords();
    }
    catch (e) {
        toast.error(errMsg(e, '确认失败'));
    }
    finally {
        confirmingId.value = null;
    }
}
/** 删除归还记录 */
async function handleDelete(r) {
    deletingId.value = r.id;
    try {
        await deleteRequest(r.id);
        toast.success('已删除记录');
        // 刷新列表
        await loadRecords();
    }
    catch (e) {
        toast.error(errMsg(e, '删除失败'));
    }
    finally {
        deletingId.value = null;
    }
}
onMounted(loadRecords);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['return-photo']} */ ;
/** @type {__VLS_StyleScopedClasses['n-image-img']} */ ;
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
if (__VLS_ctx.records.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "return-list" },
    });
    for (const [r] of __VLS_getVForSourceType((__VLS_ctx.records))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (r.id),
            ...{ class: "return-card" },
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
            type: "warning",
            size: "small",
            round: true,
        }));
        const __VLS_10 = __VLS_9({
            type: "warning",
            size: "small",
            round: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        __VLS_11.slots.default;
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
                if (!(__VLS_ctx.records.length))
                    return;
                __VLS_ctx.handleConfirm(r);
            }
        };
        __VLS_19.slots.default;
        {
            const { trigger: __VLS_thisSlot } = __VLS_19.slots;
            const __VLS_24 = {}.NButton;
            /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
            // @ts-ignore
            const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
                type: "success",
                loading: (__VLS_ctx.confirmingId === r.id),
            }));
            const __VLS_26 = __VLS_25({
                type: "success",
                loading: (__VLS_ctx.confirmingId === r.id),
            }, ...__VLS_functionalComponentArgsRest(__VLS_25));
            __VLS_27.slots.default;
            var __VLS_27;
        }
        var __VLS_19;
        const __VLS_28 = {}.NPopconfirm;
        /** @type {[typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            ...{ 'onPositiveClick': {} },
        }));
        const __VLS_30 = __VLS_29({
            ...{ 'onPositiveClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        let __VLS_32;
        let __VLS_33;
        let __VLS_34;
        const __VLS_35 = {
            onPositiveClick: (...[$event]) => {
                if (!(__VLS_ctx.records.length))
                    return;
                __VLS_ctx.handleDelete(r);
            }
        };
        __VLS_31.slots.default;
        {
            const { trigger: __VLS_thisSlot } = __VLS_31.slots;
            const __VLS_36 = {}.NButton;
            /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
            // @ts-ignore
            const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
                type: "error",
                loading: (__VLS_ctx.deletingId === r.id),
            }));
            const __VLS_38 = __VLS_37({
                type: "error",
                loading: (__VLS_ctx.deletingId === r.id),
            }, ...__VLS_functionalComponentArgsRest(__VLS_37));
            __VLS_39.slots.default;
            var __VLS_39;
        }
        var __VLS_31;
    }
}
else if (!__VLS_ctx.loading) {
    /** @type {[typeof EmptyState, ]} */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(EmptyState, new EmptyState({
        icon: "📦",
        text: "暂无待归还确认的记录",
    }));
    const __VLS_41 = __VLS_40({
        icon: "📦",
        text: "暂无待归还确认的记录",
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
}
var __VLS_7;
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['spin-area']} */ ;
/** @type {__VLS_StyleScopedClasses['return-list']} */ ;
/** @type {__VLS_StyleScopedClasses['return-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-head']} */ ;
/** @type {__VLS_StyleScopedClasses['work-order']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
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
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['value']} */ ;
/** @type {__VLS_StyleScopedClasses['field']} */ ;
/** @type {__VLS_StyleScopedClasses['full']} */ ;
/** @type {__VLS_StyleScopedClasses['label']} */ ;
/** @type {__VLS_StyleScopedClasses['photo-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['return-photo']} */ ;
/** @type {__VLS_StyleScopedClasses['card-actions']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NTag: NTag,
            NButton: NButton,
            NSpin: NSpin,
            NImage: NImage,
            NPopconfirm: NPopconfirm,
            AppLayout: AppLayout,
            EmptyState: EmptyState,
            loading: loading,
            confirmingId: confirmingId,
            deletingId: deletingId,
            records: records,
            fmt: fmt,
            handleConfirm: handleConfirm,
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
