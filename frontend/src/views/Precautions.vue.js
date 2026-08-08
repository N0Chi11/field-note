/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import AppLayout from '@/components/AppLayout.vue';
const borrowingRules = [
    {
        title: '实名借用',
        desc: '借用设备需使用本人学号登记，禁止代借、转借他人使用。'
    },
    {
        title: '提前申请',
        desc: '请至少提前 1 个工作日提交借用申请，待管理员审批通过后方可领取设备。'
    },
    {
        title: '按时归还',
        desc: '请在申请的归还时间之前归还设备；如需延期，请提前提交延期申请。'
    },
    {
        title: '妥善保管',
        desc: '借用期间请妥善保管设备，避免磕碰、进水、摔落等损坏，自行承担因人为原因造成的维修费用。'
    },
    {
        title: '原状归还',
        desc: '归还时设备应保持完好、配件齐全；管理员核验无误后方可完成归还确认。'
    },
    {
        title: '损坏报备',
        desc: '设备如在使用中出现故障或损坏，请第一时间联系管理员并如实说明情况。'
    }
];
const liabilityRules = [
    {
        title: '遗失赔偿',
        desc: '设备遗失的，需按设备原价或重置价格进行赔偿。'
    },
    {
        title: '损坏赔偿',
        desc: '人为损坏的，需承担相应维修费用；无法修复的按遗失处理。'
    },
    {
        title: '逾期处理',
        desc: '逾期未归还且未提交延期申请的，将暂停借用权限并通知所在部门。'
    }
];
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['rule-card']} */ ;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rule-list" },
});
for (const [rule, i] of __VLS_getVForSourceType((__VLS_ctx.borrowingRules))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (i),
        ...{ class: "rule-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rule-index" },
    });
    (i + 1);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rule-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "rule-title" },
    });
    (rule.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "rule-desc" },
    });
    (rule.desc);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rule-list" },
});
for (const [rule, i] of __VLS_getVForSourceType((__VLS_ctx.liabilityRules))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (i),
        ...{ class: "rule-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rule-index rule-index--warn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rule-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "rule-title" },
    });
    (rule.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "rule-desc" },
    });
    (rule.desc);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "notice" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "notice-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "notice-text" },
});
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['rule-list']} */ ;
/** @type {__VLS_StyleScopedClasses['rule-card']} */ ;
/** @type {__VLS_StyleScopedClasses['rule-index']} */ ;
/** @type {__VLS_StyleScopedClasses['rule-body']} */ ;
/** @type {__VLS_StyleScopedClasses['rule-title']} */ ;
/** @type {__VLS_StyleScopedClasses['rule-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['rule-list']} */ ;
/** @type {__VLS_StyleScopedClasses['rule-card']} */ ;
/** @type {__VLS_StyleScopedClasses['rule-index']} */ ;
/** @type {__VLS_StyleScopedClasses['rule-index--warn']} */ ;
/** @type {__VLS_StyleScopedClasses['rule-body']} */ ;
/** @type {__VLS_StyleScopedClasses['rule-title']} */ ;
/** @type {__VLS_StyleScopedClasses['rule-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['notice']} */ ;
/** @type {__VLS_StyleScopedClasses['notice-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['notice-text']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AppLayout: AppLayout,
            borrowingRules: borrowingRules,
            liabilityRules: liabilityRules,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
