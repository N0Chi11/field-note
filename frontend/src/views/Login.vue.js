/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
const router = useRouter();
const authStore = useAuthStore();
const toast = useToastStore();
const loginTab = ref('user');
const loading = ref(false);
const userForm = reactive({ name: '', studentId: '' });
const adminForm = reactive({ name: '', password: '' });
function errMsg(e) {
    // 过滤掉内部跳转标记
    if (e?.message === 'REDIRECT_TO_LOGIN')
        return '登录失败，请重试';
    // 后端 HTTPException 格式：{detail: "..."}
    if (e?.response?.data?.detail)
        return e.response.data.detail;
    if (e?.data?.detail)
        return e.data.detail;
    // 包装后的 Error 对象
    if (e?.message && e.message !== 'Request failed with status code 401')
        return e.message;
    return '登录失败，请检查姓名和密码';
}
async function handleUserLogin() {
    if (!userForm.name.trim() || !userForm.studentId.trim()) {
        toast.warning('请填写姓名和学号');
        return;
    }
    loading.value = true;
    try {
        await authStore.loginUser(userForm.name.trim(), userForm.studentId.trim());
        toast.success('登录成功');
        await router.push('/equipment');
    }
    catch (e) {
        toast.error(errMsg(e));
    }
    finally {
        loading.value = false;
    }
}
async function handleAdminLogin() {
    if (!adminForm.name.trim() || !adminForm.password) {
        toast.warning('请填写管理员姓名和密码');
        return;
    }
    loading.value = true;
    try {
        await authStore.loginAdmin(adminForm.name.trim(), adminForm.password);
        toast.success('管理员登录成功');
        await router.push('/admin/approval');
    }
    catch (e) {
        toast.error(errMsg(e));
    }
    finally {
        loading.value = false;
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['login-page']} */ ;
/** @type {__VLS_StyleScopedClasses['login-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['login-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-logo" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: "/logo.png",
    alt: "logo",
    ...{ class: "login-logo-img" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-logo-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "login-logo-line1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "login-logo-line2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-logo-sub" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-tabs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.loginTab = 'user';
        } },
    ...{ class: ({ active: __VLS_ctx.loginTab === 'user' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.loginTab = 'admin';
        } },
    ...{ class: ({ active: __VLS_ctx.loginTab === 'admin' }) },
});
if (__VLS_ctx.loginTab === 'user') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleUserLogin) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.userForm.name),
        type: "text",
        placeholder: "请输入真实姓名",
        required: true,
        autocomplete: "off",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.userForm.studentId),
        type: "text",
        placeholder: "请输入您的学号",
        required: true,
        autocomplete: "off",
        pattern: "202[0-9]{7}",
        maxlength: "10",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: "submit",
        ...{ class: "btn btn-primary btn-block" },
        disabled: (__VLS_ctx.loading),
    });
    (__VLS_ctx.loading ? '登录中...' : '登录');
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleAdminLogin) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        value: (__VLS_ctx.adminForm.name),
        type: "text",
        placeholder: "请输入管理员姓名",
        required: true,
        autocomplete: "off",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "password",
        placeholder: "请输入管理员密码",
        required: true,
        autocomplete: "off",
    });
    (__VLS_ctx.adminForm.password);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        type: "submit",
        ...{ class: "btn btn-primary btn-block" },
        disabled: (__VLS_ctx.loading),
    });
    (__VLS_ctx.loading ? '登录中...' : '管理员登录');
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "login-hint" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "login-footer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: "/watermark.png",
    alt: "Designed by @N0Chi11",
    ...{ class: "login-watermark" },
});
/** @type {__VLS_StyleScopedClasses['login-page']} */ ;
/** @type {__VLS_StyleScopedClasses['login-card']} */ ;
/** @type {__VLS_StyleScopedClasses['login-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['login-logo-img']} */ ;
/** @type {__VLS_StyleScopedClasses['login-logo-text']} */ ;
/** @type {__VLS_StyleScopedClasses['login-logo-line1']} */ ;
/** @type {__VLS_StyleScopedClasses['login-logo-line2']} */ ;
/** @type {__VLS_StyleScopedClasses['login-logo-sub']} */ ;
/** @type {__VLS_StyleScopedClasses['login-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-block']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-block']} */ ;
/** @type {__VLS_StyleScopedClasses['login-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['login-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['login-watermark']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loginTab: loginTab,
            loading: loading,
            userForm: userForm,
            adminForm: adminForm,
            handleUserLogin: handleUserLogin,
            handleAdminLogin: handleAdminLogin,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
