/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const userTabs = [
    { path: '/equipment', icon: '📦', label: '设备' },
    { path: '/borrow', icon: '📝', label: '借用' },
    { path: '/overview', icon: '📊', label: '记录' },
    { path: '/profile', icon: '👤', label: '我的' },
];
const adminTabs = [
    { path: '/equipment', icon: '📦', label: '设备' },
    { path: '/borrow', icon: '📝', label: '借用' },
    { path: '/admin/approval', icon: '✅', label: '审批' },
    { path: '/profile', icon: '👤', label: '我的' },
];
const tabs = computed(() => (authStore.isAdmin ? adminTabs : userTabs));
// 待处理审批数量占位，后续从 store 获取
const pendingCount = computed(() => 0);
function isActive(path) {
    return route.path === path || route.path.startsWith(path + '/');
}
function navigate(path) {
    if (!isActive(path)) {
        router.push(path);
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['mobile-nav__item']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-nav']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "mobile-nav" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.tabs))) {
    const __VLS_0 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
        key: (item.path),
        to: (item.path),
        ...{ class: "mobile-nav__item" },
        ...{ class: ({ active: __VLS_ctx.isActive(item.path) }) },
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
        key: (item.path),
        to: (item.path),
        ...{ class: "mobile-nav__item" },
        ...{ class: ({ active: __VLS_ctx.isActive(item.path) }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        onClick: (...[$event]) => {
            __VLS_ctx.navigate(item.path);
        }
    };
    __VLS_3.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "mobile-nav__icon-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "mobile-nav__icon" },
    });
    (item.icon);
    if (item.path === '/admin/approval' && __VLS_ctx.pendingCount > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "mobile-nav__badge" },
        });
        (__VLS_ctx.pendingCount);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "mobile-nav__label" },
    });
    (item.label);
    var __VLS_3;
}
/** @type {__VLS_StyleScopedClasses['mobile-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-nav__item']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-nav__icon-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-nav__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-nav__badge']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-nav__label']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            tabs: tabs,
            pendingCount: pendingCount,
            isActive: isActive,
            navigate: navigate,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
