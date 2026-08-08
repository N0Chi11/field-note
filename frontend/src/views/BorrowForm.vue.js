/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NForm, NFormItem, NSelect, NDatePicker, NInput, NButton, NAlert } from 'naive-ui';
import AppLayout from '@/components/AppLayout.vue';
import { getEquipment } from '@/api/equipment';
import { createRequest, checkConflict } from '@/api/borrow';
import { useToastStore } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';
const router = useRouter();
const toast = useToastStore();
const authStore = useAuthStore();
// 草稿持久化 key（与原 HTML 版一致）
const DRAFT_KEY = 'eb_borrow_draft';
const formRef = ref(null);
const submitting = ref(false);
const equipmentLoading = ref(false);
const form = reactive({
    equipmentId: null,
    borrowTime: null,
    returnTime: null,
    reason: ''
});
const conflict = ref(null);
let conflictTimer = null;
/** 工单号预览：提交后由后端生成，此处仅展示占位 */
const workOrderPreview = computed(() => '');
/** 借用人文本：当前用户姓名 + 学号 */
const borrowerText = computed(() => {
    const u = authStore.user;
    if (!u)
        return '';
    return `${u.name}（${u.student_id}）`;
});
/** 设备下拉选项（按类别分组，维修中设备 disabled） */
const equipmentOptions = ref([]);
const rules = {
    equipmentId: {
        required: true,
        type: 'number',
        message: '请选择借用设备',
        trigger: ['change', 'blur']
    },
    borrowTime: {
        required: true,
        type: 'number',
        message: '请选择借用时间',
        trigger: ['change', 'blur']
    },
    returnTime: [
        {
            required: true,
            type: 'number',
            message: '请选择归还时间',
            trigger: ['change', 'blur']
        },
        {
            validator: () => {
                if (form.returnTime &&
                    form.borrowTime &&
                    form.returnTime <= form.borrowTime) {
                    return new Error('归还时间必须晚于借用时间');
                }
                return true;
            },
            trigger: ['change', 'blur']
        }
    ],
    reason: {
        required: true,
        message: '请填写借用理由',
        trigger: ['input', 'blur']
    }
};
// 禁用过去日期（与原 HTML 的 min=nowLocalISO 一致）
function isDateDisabled(ts) {
    return ts < Date.now() - 86400000; // 允许选择今天（减去一天的毫秒数）
}
// 加载设备列表，按类别分组构造下拉选项（维修中设备禁用）
function loadEquipment() {
    equipmentLoading.value = true;
    getEquipment()
        .then((data) => {
        const list = Array.isArray(data) ? data : [];
        // 按 category 分组
        const groupMap = new Map();
        for (const e of list) {
            const cat = e.category || '其他';
            if (!groupMap.has(cat))
                groupMap.set(cat, []);
            groupMap.get(cat).push(e);
        }
        equipmentOptions.value = Array.from(groupMap.entries()).map(([category, items]) => ({
            type: 'group',
            label: category,
            key: category,
            children: items.map((e) => ({
                label: `${e.code} - ${e.name}${e.status === 'repair' ? '（维修中）' : ''}`,
                value: e.id,
                disabled: e.status === 'repair'
            }))
        }));
    })
        .catch((e) => {
        toast.error(errMsg(e, '加载设备列表失败'));
    })
        .finally(() => {
        equipmentLoading.value = false;
    });
}
// 字段变化：保存草稿 + 节流触发冲突检测
function onFieldChange() {
    saveDraft();
    scheduleConflictCheck();
}
function scheduleConflictCheck() {
    if (conflictTimer)
        clearTimeout(conflictTimer);
    conflictTimer = setTimeout(runConflictCheck, 400);
}
// 冲突检测：设备 + 两个时间齐全且合法时调用
async function runConflictCheck() {
    if (!form.equipmentId ||
        !form.borrowTime ||
        !form.returnTime ||
        form.returnTime <= form.borrowTime) {
        conflict.value = null;
        return;
    }
    try {
        const data = await checkConflict({
            equipment_id: form.equipmentId,
            borrow_time: new Date(form.borrowTime).toISOString(),
            return_time: new Date(form.returnTime).toISOString()
        });
        conflict.value = data;
    }
    catch {
        // 冲突检测失败不阻塞填写
        conflict.value = null;
    }
}
// 草稿持久化
function saveDraft() {
    try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
            equipmentId: form.equipmentId,
            borrowTime: form.borrowTime,
            returnTime: form.returnTime,
            reason: form.reason
        }));
    }
    catch {
        /* ignore */
    }
}
function loadDraft() {
    try {
        const saved = sessionStorage.getItem(DRAFT_KEY);
        if (!saved)
            return;
        const d = JSON.parse(saved);
        form.equipmentId = d.equipmentId ?? null;
        form.borrowTime = d.borrowTime ?? null;
        form.returnTime = d.returnTime ?? null;
        form.reason = d.reason ?? '';
        if (form.equipmentId && form.borrowTime && form.returnTime) {
            scheduleConflictCheck();
        }
    }
    catch {
        /* ignore */
    }
}
function resetDraft() {
    form.equipmentId = null;
    form.borrowTime = null;
    form.returnTime = null;
    form.reason = '';
    conflict.value = null;
    try {
        sessionStorage.removeItem(DRAFT_KEY);
    }
    catch {
        /* ignore */
    }
    toast.success('已清空草稿');
}
// 提交申请
async function handleSubmit() {
    try {
        await formRef.value?.validate();
    }
    catch {
        toast.warning('请完整填写表单');
        return;
    }
    if (conflict.value?.conflict_type === 'hard') {
        toast.error('存在强冲突，无法提交');
        return;
    }
    submitting.value = true;
    try {
        await createRequest({
            equipment_id: form.equipmentId,
            borrow_time: new Date(form.borrowTime).toISOString(),
            return_time: new Date(form.returnTime).toISOString(),
            reason: form.reason
        });
        try {
            sessionStorage.removeItem(DRAFT_KEY);
        }
        catch {
            /* ignore */
        }
        toast.success('申请已提交，请等待管理员审核');
        router.push('/overview');
    }
    catch (e) {
        toast.error(errMsg(e, '提交失败'));
    }
    finally {
        submitting.value = false;
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
onMounted(() => {
    loadEquipment();
    loadDraft();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
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
    ...{ class: "form-wrapper" },
});
const __VLS_4 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelPlacement: "top",
    requireMarkPlacement: "right-hanging",
}));
const __VLS_6 = __VLS_5({
    ref: "formRef",
    model: (__VLS_ctx.form),
    rules: (__VLS_ctx.rules),
    labelPlacement: "top",
    requireMarkPlacement: "right-hanging",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
/** @type {typeof __VLS_ctx.formRef} */ ;
var __VLS_8 = {};
__VLS_7.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-row" },
});
const __VLS_10 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent(__VLS_10, new __VLS_10({
    label: "工单号",
}));
const __VLS_12 = __VLS_11({
    label: "工单号",
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
__VLS_13.slots.default;
const __VLS_14 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent(__VLS_14, new __VLS_14({
    value: (__VLS_ctx.workOrderPreview),
    placeholder: "提交后系统自动生成",
    readonly: true,
}));
const __VLS_16 = __VLS_15({
    value: (__VLS_ctx.workOrderPreview),
    placeholder: "提交后系统自动生成",
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_15));
__VLS_17.slots.default;
{
    const { prefix: __VLS_thisSlot } = __VLS_17.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "field-icon" },
    });
}
var __VLS_17;
var __VLS_13;
const __VLS_18 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(__VLS_18, new __VLS_18({
    label: "借用人",
}));
const __VLS_20 = __VLS_19({
    label: "借用人",
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
__VLS_21.slots.default;
const __VLS_22 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
    value: (__VLS_ctx.borrowerText),
    placeholder: "—",
    readonly: true,
}));
const __VLS_24 = __VLS_23({
    value: (__VLS_ctx.borrowerText),
    placeholder: "—",
    readonly: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
__VLS_25.slots.default;
{
    const { prefix: __VLS_thisSlot } = __VLS_25.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "field-icon" },
    });
}
var __VLS_25;
var __VLS_21;
const __VLS_26 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent(__VLS_26, new __VLS_26({
    label: "借用设备",
    path: "equipmentId",
}));
const __VLS_28 = __VLS_27({
    label: "借用设备",
    path: "equipmentId",
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
__VLS_29.slots.default;
const __VLS_30 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.equipmentId),
    options: (__VLS_ctx.equipmentOptions),
    loading: (__VLS_ctx.equipmentLoading),
    placeholder: "请选择设备（按类别分组）",
    filterable: true,
}));
const __VLS_32 = __VLS_31({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.equipmentId),
    options: (__VLS_ctx.equipmentOptions),
    loading: (__VLS_ctx.equipmentLoading),
    placeholder: "请选择设备（按类别分组）",
    filterable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
let __VLS_34;
let __VLS_35;
let __VLS_36;
const __VLS_37 = {
    'onUpdate:value': (__VLS_ctx.onFieldChange)
};
var __VLS_33;
var __VLS_29;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-row" },
});
const __VLS_38 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
    label: "借用时间",
    path: "borrowTime",
}));
const __VLS_40 = __VLS_39({
    label: "借用时间",
    path: "borrowTime",
}, ...__VLS_functionalComponentArgsRest(__VLS_39));
__VLS_41.slots.default;
const __VLS_42 = {}.NDatePicker;
/** @type {[typeof __VLS_components.NDatePicker, typeof __VLS_components.nDatePicker, ]} */ ;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.borrowTime),
    type: "datetime",
    clearable: true,
    placeholder: "选择借用时间",
    isDateDisabled: (__VLS_ctx.isDateDisabled),
    ...{ style: {} },
}));
const __VLS_44 = __VLS_43({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.borrowTime),
    type: "datetime",
    clearable: true,
    placeholder: "选择借用时间",
    isDateDisabled: (__VLS_ctx.isDateDisabled),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
let __VLS_46;
let __VLS_47;
let __VLS_48;
const __VLS_49 = {
    'onUpdate:value': (__VLS_ctx.onFieldChange)
};
var __VLS_45;
var __VLS_41;
const __VLS_50 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
    label: "归还时间",
    path: "returnTime",
}));
const __VLS_52 = __VLS_51({
    label: "归还时间",
    path: "returnTime",
}, ...__VLS_functionalComponentArgsRest(__VLS_51));
__VLS_53.slots.default;
const __VLS_54 = {}.NDatePicker;
/** @type {[typeof __VLS_components.NDatePicker, typeof __VLS_components.nDatePicker, ]} */ ;
// @ts-ignore
const __VLS_55 = __VLS_asFunctionalComponent(__VLS_54, new __VLS_54({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.returnTime),
    type: "datetime",
    clearable: true,
    placeholder: "选择归还时间",
    isDateDisabled: (__VLS_ctx.isDateDisabled),
    ...{ style: {} },
}));
const __VLS_56 = __VLS_55({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.returnTime),
    type: "datetime",
    clearable: true,
    placeholder: "选择归还时间",
    isDateDisabled: (__VLS_ctx.isDateDisabled),
    ...{ style: {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_55));
let __VLS_58;
let __VLS_59;
let __VLS_60;
const __VLS_61 = {
    'onUpdate:value': (__VLS_ctx.onFieldChange)
};
var __VLS_57;
var __VLS_53;
const __VLS_62 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({
    label: "借用理由",
    path: "reason",
}));
const __VLS_64 = __VLS_63({
    label: "借用理由",
    path: "reason",
}, ...__VLS_functionalComponentArgsRest(__VLS_63));
__VLS_65.slots.default;
const __VLS_66 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.reason),
    type: "textarea",
    placeholder: "请简要说明借用理由（如：毕业设计视频拍摄）",
    autosize: ({ minRows: 3, maxRows: 6 }),
    maxlength: "200",
    showCount: true,
}));
const __VLS_68 = __VLS_67({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.form.reason),
    type: "textarea",
    placeholder: "请简要说明借用理由（如：毕业设计视频拍摄）",
    autosize: ({ minRows: 3, maxRows: 6 }),
    maxlength: "200",
    showCount: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_67));
let __VLS_70;
let __VLS_71;
let __VLS_72;
const __VLS_73 = {
    'onUpdate:value': (__VLS_ctx.onFieldChange)
};
var __VLS_69;
var __VLS_65;
if (__VLS_ctx.conflict && __VLS_ctx.conflict.has_conflict) {
    const __VLS_74 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.nAlert, typeof __VLS_components.NAlert, typeof __VLS_components.nAlert, ]} */ ;
    // @ts-ignore
    const __VLS_75 = __VLS_asFunctionalComponent(__VLS_74, new __VLS_74({
        type: (__VLS_ctx.conflict.conflict_type === 'hard' ? 'error' : 'warning'),
        title: (__VLS_ctx.conflict.conflict_type === 'hard'
            ? '时间冲突（强冲突）'
            : '时间冲突（轻度冲突）'),
        ...{ class: "conflict-alert" },
    }));
    const __VLS_76 = __VLS_75({
        type: (__VLS_ctx.conflict.conflict_type === 'hard' ? 'error' : 'warning'),
        title: (__VLS_ctx.conflict.conflict_type === 'hard'
            ? '时间冲突（强冲突）'
            : '时间冲突（轻度冲突）'),
        ...{ class: "conflict-alert" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_75));
    __VLS_77.slots.default;
    (__VLS_ctx.conflict.conflict_type === 'hard'
        ? '已被占用'
        : '有待审核 / 待归还的申请');
    (__VLS_ctx.conflict.conflict_orders.join('、') || '无');
    if (__VLS_ctx.conflict.conflict_type === 'hard') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    var __VLS_77;
}
else if (__VLS_ctx.conflict &&
    !__VLS_ctx.conflict.has_conflict &&
    __VLS_ctx.form.equipmentId &&
    __VLS_ctx.form.borrowTime &&
    __VLS_ctx.form.returnTime) {
    const __VLS_78 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.nAlert, typeof __VLS_components.NAlert, typeof __VLS_components.nAlert, ]} */ ;
    // @ts-ignore
    const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
        type: "success",
        title: "无冲突",
        ...{ class: "conflict-alert" },
    }));
    const __VLS_80 = __VLS_79({
        type: "success",
        title: "无冲突",
        ...{ class: "conflict-alert" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_79));
    __VLS_81.slots.default;
    var __VLS_81;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-actions" },
});
const __VLS_82 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_83 = __VLS_asFunctionalComponent(__VLS_82, new __VLS_82({
    ...{ 'onClick': {} },
}));
const __VLS_84 = __VLS_83({
    ...{ 'onClick': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_83));
let __VLS_86;
let __VLS_87;
let __VLS_88;
const __VLS_89 = {
    onClick: (__VLS_ctx.resetDraft)
};
__VLS_85.slots.default;
var __VLS_85;
const __VLS_90 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_91 = __VLS_asFunctionalComponent(__VLS_90, new __VLS_90({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.submitting),
    disabled: (__VLS_ctx.conflict?.conflict_type === 'hard'),
}));
const __VLS_92 = __VLS_91({
    ...{ 'onClick': {} },
    type: "primary",
    loading: (__VLS_ctx.submitting),
    disabled: (__VLS_ctx.conflict?.conflict_type === 'hard'),
}, ...__VLS_functionalComponentArgsRest(__VLS_91));
let __VLS_94;
let __VLS_95;
let __VLS_96;
const __VLS_97 = {
    onClick: (__VLS_ctx.handleSubmit)
};
__VLS_93.slots.default;
var __VLS_93;
var __VLS_7;
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['form-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['field-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['field-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['conflict-alert']} */ ;
/** @type {__VLS_StyleScopedClasses['conflict-alert']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
// @ts-ignore
var __VLS_9 = __VLS_8;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NForm: NForm,
            NFormItem: NFormItem,
            NSelect: NSelect,
            NDatePicker: NDatePicker,
            NInput: NInput,
            NButton: NButton,
            NAlert: NAlert,
            AppLayout: AppLayout,
            formRef: formRef,
            submitting: submitting,
            equipmentLoading: equipmentLoading,
            form: form,
            conflict: conflict,
            workOrderPreview: workOrderPreview,
            borrowerText: borrowerText,
            equipmentOptions: equipmentOptions,
            rules: rules,
            isDateDisabled: isDateDisabled,
            onFieldChange: onFieldChange,
            resetDraft: resetDraft,
            handleSubmit: handleSubmit,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
