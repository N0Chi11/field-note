/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { getRequests } from '@/api/borrow';
const router = useRouter();
const authStore = useAuthStore();
const toast = useToastStore();
const isAdmin = computed(() => !!authStore.isAdmin);
const requests = ref([]);
// 姓名首字（用于头像）
function getInitials(name) {
    return name ? name.charAt(0).toUpperCase() : '?';
}
// 借用统计
const stats = computed(() => {
    const list = requests.value;
    return {
        total: list.length,
        pending: list.filter((r) => r.status === 'pending').length,
        borrowing: list.filter((r) => r.status === 'borrowing').length,
        returned: list.filter((r) => r.status === 'returned').length,
        rejected: list.filter((r) => r.status === 'rejected').length
    };
});
// 加载借用记录（管理员看全部，普通用户后端仅返回本人的）
async function loadRequests() {
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
function goOverview() {
    router.push('/overview');
}
async function handleLogout() {
    await authStore.logout();
    router.replace('/login');
}
onMounted(loadRequests);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-role-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-actions']} */ ;
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
if (__VLS_ctx.authStore.user) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-avatar-large" },
    });
    (__VLS_ctx.getInitials(__VLS_ctx.authStore.user.name));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-name" },
    });
    (__VLS_ctx.authStore.user.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-id" },
    });
    (__VLS_ctx.authStore.user.student_id);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "profile-role-badge" },
        ...{ class: ({ user: !__VLS_ctx.isAdmin }) },
    });
    (__VLS_ctx.isAdmin ? '管理员' : '用户');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stats" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat-value" },
    });
    (__VLS_ctx.stats.total);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat-value" },
    });
    (__VLS_ctx.stats.pending);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat-value" },
    });
    (__VLS_ctx.stats.borrowing);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat-value" },
    });
    (__VLS_ctx.stats.returned);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat-value" },
    });
    (__VLS_ctx.stats.rejected);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-stat-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.goOverview) },
        type: "button",
        ...{ class: "btn btn-secondary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleLogout) },
        type: "button",
        ...{ class: "btn btn-danger" },
    });
}
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-card']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-header']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-avatar-large']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-info']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-name']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-id']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-role-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat-value']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-stat-label']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-danger']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AppLayout: AppLayout,
            authStore: authStore,
            isAdmin: isAdmin,
            getInitials: getInitials,
            stats: stats,
            goOverview: goOverview,
            handleLogout: handleLogout,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
