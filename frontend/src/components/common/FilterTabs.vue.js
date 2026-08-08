/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
const __VLS_props = defineProps();
const emit = defineEmits();
function selectTab(key) {
    emit('update:modelValue', key);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['filter-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tabs__item']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tabs__item']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "filter-tabs" },
});
for (const [tab] of __VLS_getVForSourceType((__VLS_ctx.tabs))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectTab(tab.key);
            } },
        key: (tab.key),
        ...{ class: "filter-tabs__item" },
        ...{ class: ({ active: __VLS_ctx.modelValue === tab.key }) },
    });
    if (tab.icon) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "filter-tabs__icon" },
        });
        (tab.icon);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "filter-tabs__label" },
    });
    (tab.label);
}
/** @type {__VLS_StyleScopedClasses['filter-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tabs__item']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tabs__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tabs__label']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            selectTab: selectTab,
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
