/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import AppSidebar from '@/components/layout/AppSidebar.vue';
import { ref } from 'vue';
const sidebarOpen = ref(false);
/** 应用版本号（每次发版更新此处即可） */
const APP_VERSION = 'v2.1.3';
function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
}
function closeSidebar() {
    sidebarOpen.value = false;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['footer-watermark']} */ ;
/** @type {__VLS_StyleScopedClasses['app-main']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-menu-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-overlay']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "app-layout" },
});
/** @type {[typeof AppSidebar, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(AppSidebar, new AppSidebar({
    ...{ 'onClose': {} },
    mobileOpen: (__VLS_ctx.sidebarOpen),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onClose': {} },
    mobileOpen: (__VLS_ctx.sidebarOpen),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    onClose: (__VLS_ctx.closeSidebar)
};
var __VLS_2;
if (__VLS_ctx.sidebarOpen) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.closeSidebar) },
        ...{ class: "mobile-overlay" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "mobile-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.toggleSidebar) },
    ...{ class: "mobile-menu-btn" },
    'aria-label': "菜单",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "mobile-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: "/logo.png",
    alt: "logo",
    ...{ class: "mobile-title-logo" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "mobile-version" },
});
(__VLS_ctx.APP_VERSION);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "mobile-placeholder" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "app-main" },
});
var __VLS_7 = {};
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "app-footer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: "/watermark.png",
    alt: "Designed by @N0Chi11",
    ...{ class: "footer-watermark" },
});
/** @type {__VLS_StyleScopedClasses['app-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-menu-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-title']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-title-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-version']} */ ;
/** @type {__VLS_StyleScopedClasses['mobile-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['app-main']} */ ;
/** @type {__VLS_StyleScopedClasses['app-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-watermark']} */ ;
// @ts-ignore
var __VLS_8 = __VLS_7;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AppSidebar: AppSidebar,
            sidebarOpen: sidebarOpen,
            APP_VERSION: APP_VERSION,
            toggleSidebar: toggleSidebar,
            closeSidebar: closeSidebar,
        };
    },
});
const __VLS_component = (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
export default {};
; /* PartiallyEnd: #4569/main.vue */
