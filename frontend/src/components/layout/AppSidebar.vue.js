/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { getStats } from '@/api/admin';
const __VLS_props = defineProps();
const emit = defineEmits();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
/** 应用版本号（每次发版更新此处即可） */
const APP_VERSION = 'v2.1.3';
const user = computed(() => authStore.user);
/** 设备管理组 */
const equipmentNav = [
    { path: '/equipment', icon: '📦', label: '器材设备清单' },
    { path: '/borrow', icon: '📝', label: '借用申请' },
    { path: '/overview', icon: '📊', label: '借用一览' },
    { path: '/precautions', icon: '⚠️', label: '注意事项' }
];
/** 管理员组（仅管理员可见） */
const adminNav = [
    { path: '/admin/equipment', icon: '⚙️', label: '设备维护' },
    { path: '/admin/approval', icon: '✅', label: '借用审批', badge: 'pending' },
    { path: '/admin/return', icon: '📦', label: '归还确认', badge: 'return_pending' },
    { path: '/admin/logs', icon: '📋', label: '操作日志' }
];
/** 账户组 */
const accountNav = [
    { path: '/profile', icon: '👤', label: '个人中心' }
];
/* ---------------- 待处理数量 badge ---------------- */
const stats = ref(null);
let timer;
/** 拉取管理员统计（待审批 / 待归还确认数量） */
async function loadStats() {
    if (!authStore.isAdmin)
        return;
    try {
        stats.value = await getStats();
    }
    catch {
        // 静默失败，badge 不影响主流程
    }
}
/** 计算某导航项的待办数量 */
function badgeCount(item) {
    if (!stats.value || !item.badge)
        return 0;
    return item.badge === 'pending' ? stats.value.pending : stats.value.return_pending;
}
/** 当前路由是否激活 */
function isActive(path) {
    return route.path === path || route.path.startsWith(path + '/');
}
/** 导航点击：移动端自动关闭抽屉 */
function handleNavClick() {
    emit('close');
}
async function handleLogout() {
    try {
        await authStore.logout();
    }
    catch {
        // 即使登出接口失败也跳转登录页
    }
    finally {
        router.push('/login');
    }
}
/** 姓名首字（大写）作为头像 */
const initials = computed(() => {
    const name = user.value?.name || '';
    return name ? name.charAt(0).toUpperCase() : 'U';
});
/** 角色中文标签 */
const roleLabel = computed(() => (authStore.isAdmin ? '管理员' : '学生'));
onMounted(() => {
    // 延迟 3 秒加载待办统计，避免登录时并发过多请求
    setTimeout(() => loadStats(), 3000);
    // 每 120s 刷新一次待办数量（降低频率）
    timer = window.setInterval(loadStats, 120000);
});
onUnmounted(() => {
    if (timer)
        window.clearInterval(timer);
});
// 用户信息加载完成 / 角色变化时拉取统计
watch(() => authStore.isAdmin, (isAdmin) => {
    if (isAdmin)
        loadStats();
}, { immediate: true });
// 路由切换时刷新待办数量（保持 badge 实时）
watch(() => route.path, () => loadStats());
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__user-role']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__logout']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__nav']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__nav']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__nav']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item__icon']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "sidebar" },
    ...{ class: ({ 'is-open': __VLS_ctx.mobileOpen }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar__header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: "/logo.png",
    alt: "logo",
    ...{ class: "sidebar__header-logo" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar__header-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "sidebar__header-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "sidebar__header-subtitle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "sidebar__nav" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar__group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "sidebar__group-label" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.equipmentNav))) {
    const __VLS_0 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
        key: (item.path),
        to: (item.path),
        ...{ class: "nav-item" },
        ...{ class: ({ active: __VLS_ctx.isActive(item.path) }) },
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
        key: (item.path),
        to: (item.path),
        ...{ class: "nav-item" },
        ...{ class: ({ active: __VLS_ctx.isActive(item.path) }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        onClick: (__VLS_ctx.handleNavClick)
    };
    __VLS_3.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "nav-item__icon" },
    });
    (item.icon);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "nav-item__text" },
    });
    (item.label);
    var __VLS_3;
}
if (__VLS_ctx.authStore.isAdmin) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sidebar__group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "sidebar__group-label" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.adminNav))) {
        const __VLS_8 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
        // @ts-ignore
        const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
            ...{ 'onClick': {} },
            key: (item.path),
            to: (item.path),
            ...{ class: "nav-item" },
            ...{ class: ({ active: __VLS_ctx.isActive(item.path) }) },
        }));
        const __VLS_10 = __VLS_9({
            ...{ 'onClick': {} },
            key: (item.path),
            to: (item.path),
            ...{ class: "nav-item" },
            ...{ class: ({ active: __VLS_ctx.isActive(item.path) }) },
        }, ...__VLS_functionalComponentArgsRest(__VLS_9));
        let __VLS_12;
        let __VLS_13;
        let __VLS_14;
        const __VLS_15 = {
            onClick: (__VLS_ctx.handleNavClick)
        };
        __VLS_11.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "nav-item__icon" },
        });
        (item.icon);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "nav-item__text" },
        });
        (item.label);
        if (__VLS_ctx.badgeCount(item) > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "nav-item__badge" },
            });
            (__VLS_ctx.badgeCount(item));
        }
        var __VLS_11;
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar__group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "sidebar__group-label" },
});
for (const [item] of __VLS_getVForSourceType((__VLS_ctx.accountNav))) {
    const __VLS_16 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, typeof __VLS_components.RouterLink, typeof __VLS_components.routerLink, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onClick': {} },
        key: (item.path),
        to: (item.path),
        ...{ class: "nav-item" },
        ...{ class: ({ active: __VLS_ctx.isActive(item.path) }) },
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onClick': {} },
        key: (item.path),
        to: (item.path),
        ...{ class: "nav-item" },
        ...{ class: ({ active: __VLS_ctx.isActive(item.path) }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onClick: (__VLS_ctx.handleNavClick)
    };
    __VLS_19.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "nav-item__icon" },
    });
    (item.icon);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "nav-item__text" },
    });
    (item.label);
    var __VLS_19;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar__footer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar__user" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar__user-avatar" },
});
(__VLS_ctx.initials);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar__user-info" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar__user-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "sidebar__user-name" },
});
(__VLS_ctx.user?.name);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "sidebar__user-role" },
    ...{ class: ({ 'is-admin': __VLS_ctx.authStore.isAdmin }) },
});
(__VLS_ctx.roleLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "sidebar__user-id" },
});
(__VLS_ctx.user?.student_id);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleLogout();
            __VLS_ctx.handleNavClick();
        } },
    ...{ class: "sidebar__logout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "sidebar__logout-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-version" },
});
(__VLS_ctx.APP_VERSION);
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__header']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__header-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__header-text']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__header-title']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__header-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__nav']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__group']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__group-label']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item__text']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__group']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__group-label']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item__text']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item__badge']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__group']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__group-label']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item__text']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__footer']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__user']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__user-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__user-info']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__user-row']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__user-name']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__user-role']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__user-id']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__logout']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar__logout-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-version']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            authStore: authStore,
            APP_VERSION: APP_VERSION,
            user: user,
            equipmentNav: equipmentNav,
            adminNav: adminNav,
            accountNav: accountNav,
            badgeCount: badgeCount,
            isActive: isActive,
            handleNavClick: handleNavClick,
            handleLogout: handleLogout,
            initials: initials,
            roleLabel: roleLabel,
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
