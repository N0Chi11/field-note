/// <reference types="../../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive, computed, onMounted } from 'vue';
import { NButton, NTag, NModal, NForm, NFormItem, NInput, NSelect, NUpload, NPopconfirm, NSpin, NDivider, NSpace } from 'naive-ui';
import AppLayout from '@/components/AppLayout.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import EquipmentTimeline from '@/components/EquipmentTimeline.vue';
import { getEquipment, createEquipment, updateEquipment, deleteEquipment, updateEquipmentStatus, uploadEquipmentImage } from '@/api/equipment';
import { getCards, createCard, updateCard, deleteCard, uploadCardImage } from '@/api/card';
import { useToastStore } from '@/stores/toast';
const toast = useToastStore();
/* ------------------------------------------------------------------ *
 * 时间轴弹窗状态
 * ------------------------------------------------------------------ */
const timelineVisible = ref(false);
const timelineEquipmentId = ref(null);
/** 查看设备借用时间轴 */
function viewTimeline(item) {
    timelineEquipmentId.value = item.id;
    timelineVisible.value = true;
}
/* ------------------------------------------------------------------ *
 * 下拉选项
 * ------------------------------------------------------------------ */
const categoryOptions = [
    { label: '相机', value: '相机' },
    { label: '镜头', value: '镜头' },
    { label: '灯光', value: '灯光' },
    { label: '录音设备', value: '录音设备' },
    { label: '三脚架', value: '三脚架' },
    { label: '其他', value: '其他' }
];
/** 设备状态可手动设置项（borrowed 不可手动设置） */
const equipmentStatusOptions = [
    { label: '可用', value: 'available' },
    { label: '维修中', value: 'repair' }
];
/* ------------------------------------------------------------------ *
 * 设备 / 卡列表
 * ------------------------------------------------------------------ */
const equipmentList = ref([]);
const cardList = ref([]);
const equipmentLoading = ref(false);
const cardLoading = ref(false);
/** 内存卡统计 */
const cardStats = computed(() => {
    const total = cardList.value.length;
    const available = cardList.value.filter((c) => c.status === 'available').length;
    const borrowed = cardList.value.filter((c) => c.status === 'borrowed').length;
    return { total, available, borrowed };
});
function equipmentStatusMeta(status) {
    switch (status) {
        case 'available':
            return { type: 'success', label: '可用' };
        case 'borrowed':
            return { type: 'error', label: '借用中' };
        case 'repair':
            return { type: 'default', label: '维修中' };
    }
}
function cardStatusMeta(status) {
    return status === 'available'
        ? { type: 'success', label: '可用' }
        : { type: 'error', label: '已配出' };
}
const equipModalShow = ref(false);
const equipSaving = ref(false);
const equipEditing = ref(null);
const equipFormRef = ref(null);
const equipFileList = ref([]);
const pendingImage = ref(null);
const equipForm = reactive({
    code: '',
    name: '',
    category: '相机',
    icon: '📦',
    status: 'available',
    notes: ''
});
const equipRules = {
    code: [
        { required: true, message: '请输入设备编号', trigger: ['blur', 'input'] }
    ],
    name: [
        { required: true, message: '请输入设备名称', trigger: ['blur', 'input'] }
    ],
    category: [
        { required: true, message: '请选择设备类别', trigger: ['change', 'blur'] }
    ],
    icon: [{ required: true, message: '请输入图标', trigger: ['blur', 'input'] }]
};
function resetEquipForm() {
    equipForm.code = '';
    equipForm.name = '';
    equipForm.category = '相机';
    equipForm.icon = '📦';
    equipForm.status = 'available';
    equipForm.notes = '';
    equipEditing.value = null;
    equipFileList.value = [];
    pendingImage.value = null;
}
function openEquipModal(item) {
    resetEquipForm();
    if (item) {
        equipEditing.value = item;
        equipForm.code = item.code;
        equipForm.name = item.name;
        equipForm.category = item.category;
        equipForm.icon = item.icon || '📦';
        equipForm.status =
            item.status === 'borrowed' ? 'available' : item.status;
        equipForm.notes = item.notes || '';
        // 若已有图片，展示在上传列表中
        if (item.image_url) {
            equipFileList.value = [
                {
                    id: 'existing-image',
                    name: 'current.jpg',
                    status: 'finished',
                    url: item.image_url
                }
            ];
        }
    }
    equipModalShow.value = true;
}
function handleEquipFileChange(data) {
    equipFileList.value = data.fileList;
    const last = data.fileList[data.fileList.length - 1];
    if (last && last.file) {
        pendingImage.value = last.file;
    }
    else {
        pendingImage.value = null;
    }
}
async function saveEquipment() {
    try {
        await equipFormRef.value?.validate();
    }
    catch {
        return;
    }
    equipSaving.value = true;
    try {
        const payload = {
            code: equipForm.code,
            name: equipForm.name,
            category: equipForm.category,
            icon: equipForm.icon || '📦',
            status: equipForm.status,
            notes: equipForm.notes || undefined
        };
        let saved;
        if (equipEditing.value) {
            // 编辑：code 只读，不提交（后端应忽略或保持原值）
            saved = await updateEquipment(equipEditing.value.id, payload);
            // 若选择了新图片，上传
            if (pendingImage.value) {
                try {
                    const res = await uploadEquipmentImage(saved.id, pendingImage.value);
                    saved.image_url = res.image_url;
                }
                catch (e) {
                    toast.warning('图片上传失败，设备信息已保存');
                }
            }
            toast.success('设备已更新');
        }
        else {
            saved = await createEquipment(payload);
            if (pendingImage.value) {
                try {
                    const res = await uploadEquipmentImage(saved.id, pendingImage.value);
                    saved.image_url = res.image_url;
                }
                catch (e) {
                    toast.warning('图片上传失败，设备已创建');
                }
            }
            toast.success('设备已添加');
        }
        equipModalShow.value = false;
        await loadEquipment();
    }
    catch (e) {
        toast.error(errMsg(e, '保存失败'));
    }
    finally {
        equipSaving.value = false;
    }
}
async function toggleEquipmentStatus(item) {
    // 仅在 available / repair 之间切换
    const next = item.status === 'available' ? 'repair' : 'available';
    try {
        await updateEquipmentStatus(item.id, next);
        toast.success(next === 'repair' ? '已设为维修中' : '已设为可用');
        await loadEquipment();
    }
    catch (e) {
        toast.error(errMsg(e, '状态更新失败'));
    }
}
async function removeEquipment(item) {
    try {
        await deleteEquipment(item.id);
        toast.success('设备已删除');
        await loadEquipment();
    }
    catch (e) {
        toast.error(errMsg(e, '删除失败'));
    }
}
const cardModalShow = ref(false);
const cardSaving = ref(false);
const cardEditing = ref(null);
const cardFormRef = ref(null);
const cardFileList = ref([]);
const pendingCardImage = ref(null);
const cardForm = reactive({
    code: '',
    name: '',
    notes: ''
});
const cardRules = {
    code: [
        { required: true, message: '请输入内存卡编号', trigger: ['blur', 'input'] }
    ],
    name: [
        { required: true, message: '请输入内存卡名称', trigger: ['blur', 'input'] }
    ]
};
function resetCardForm() {
    cardForm.code = '';
    cardForm.name = '';
    cardForm.notes = '';
    cardEditing.value = null;
    cardFileList.value = [];
    pendingCardImage.value = null;
}
function openCardModal(item) {
    resetCardForm();
    if (item) {
        cardEditing.value = item;
        cardForm.code = item.code;
        cardForm.name = item.name;
        cardForm.notes = item.notes || '';
        // 若已有图片，展示在上传列表中
        if (item.image_url) {
            cardFileList.value = [
                {
                    id: 'existing-card-image',
                    name: 'current.jpg',
                    status: 'finished',
                    url: item.image_url
                }
            ];
        }
    }
    cardModalShow.value = true;
}
function handleCardFileChange(data) {
    cardFileList.value = data.fileList;
    const last = data.fileList[data.fileList.length - 1];
    if (last && last.file) {
        pendingCardImage.value = last.file;
    }
    else {
        pendingCardImage.value = null;
    }
}
async function saveCard() {
    try {
        await cardFormRef.value?.validate();
    }
    catch {
        return;
    }
    cardSaving.value = true;
    try {
        const payload = {
            code: cardForm.code,
            name: cardForm.name,
            notes: cardForm.notes || undefined
        };
        let saved;
        if (cardEditing.value) {
            saved = await updateCard(cardEditing.value.id, payload);
            // 若选择了新图片，上传
            if (pendingCardImage.value) {
                try {
                    const res = await uploadCardImage(saved.id, pendingCardImage.value);
                    saved.image_url = res.image_url;
                }
                catch (e) {
                    toast.warning('图片上传失败，内存卡信息已保存');
                }
            }
            toast.success('内存卡已更新');
        }
        else {
            saved = await createCard(payload);
            if (pendingCardImage.value) {
                try {
                    const res = await uploadCardImage(saved.id, pendingCardImage.value);
                    saved.image_url = res.image_url;
                }
                catch (e) {
                    toast.warning('图片上传失败，内存卡已创建');
                }
            }
            toast.success('内存卡已添加');
        }
        cardModalShow.value = false;
        await loadCards();
    }
    catch (e) {
        toast.error(errMsg(e, '保存失败'));
    }
    finally {
        cardSaving.value = false;
    }
}
async function removeCard(item) {
    try {
        await deleteCard(item.id);
        toast.success('内存卡已删除');
        await loadCards();
    }
    catch (e) {
        toast.error(errMsg(e, '删除失败'));
    }
}
/* ------------------------------------------------------------------ *
 * 数据加载
 * ------------------------------------------------------------------ */
async function loadEquipment() {
    equipmentLoading.value = true;
    try {
        const data = await getEquipment();
        equipmentList.value = Array.isArray(data) ? data : [];
    }
    catch (e) {
        toast.error(errMsg(e, '加载设备列表失败'));
        equipmentList.value = [];
    }
    finally {
        equipmentLoading.value = false;
    }
}
async function loadCards() {
    cardLoading.value = true;
    try {
        const data = await getCards();
        cardList.value = Array.isArray(data) ? data : [];
    }
    catch (e) {
        toast.error(errMsg(e, '加载内存卡列表失败'));
        cardList.value = [];
    }
    finally {
        cardLoading.value = false;
    }
}
/* ------------------------------------------------------------------ *
 * 工具：错误信息提取
 * ------------------------------------------------------------------ */
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
    loadCards();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['equip-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-item']} */ ;
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "page-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "page-desc" },
});
const __VLS_4 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_6 = __VLS_5({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onClick: (...[$event]) => {
        __VLS_ctx.openEquipModal();
    }
};
__VLS_7.slots.default;
var __VLS_7;
const __VLS_12 = {}.NSpin;
/** @type {[typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    show: (__VLS_ctx.equipmentLoading),
}));
const __VLS_14 = __VLS_13({
    show: (__VLS_ctx.equipmentLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
if (!__VLS_ctx.equipmentLoading && __VLS_ctx.equipmentList.length === 0) {
    /** @type {[typeof EmptyState, ]} */ ;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent(EmptyState, new EmptyState({
        icon: "📦",
        text: "暂无设备",
        subText: "点击右上角「添加设备」创建第一个设备",
    }));
    const __VLS_17 = __VLS_16({
        icon: "📦",
        text: "暂无设备",
        subText: "点击右上角「添加设备」创建第一个设备",
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-grid" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.equipmentList))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.id),
            ...{ class: "equip-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "equip-card__media" },
        });
        if (item.image_url) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (item.image_url),
                alt: (item.name),
                ...{ class: "equip-card__img" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "equip-card__icon" },
            });
            (item.icon || '📦');
        }
        const __VLS_19 = {}.NTag;
        /** @type {[typeof __VLS_components.NTag, typeof __VLS_components.nTag, typeof __VLS_components.NTag, typeof __VLS_components.nTag, ]} */ ;
        // @ts-ignore
        const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
            ...{ class: "equip-card__status" },
            type: (__VLS_ctx.equipmentStatusMeta(item.status).type),
            size: "small",
            round: true,
        }));
        const __VLS_21 = __VLS_20({
            ...{ class: "equip-card__status" },
            type: (__VLS_ctx.equipmentStatusMeta(item.status).type),
            size: "small",
            round: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_20));
        __VLS_22.slots.default;
        (__VLS_ctx.equipmentStatusMeta(item.status).label);
        var __VLS_22;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "equip-card__body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "equip-card__title" },
        });
        (item.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "equip-card__code" },
        });
        (item.code);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "equip-card__tags" },
        });
        const __VLS_23 = {}.NTag;
        /** @type {[typeof __VLS_components.NTag, typeof __VLS_components.nTag, typeof __VLS_components.NTag, typeof __VLS_components.nTag, ]} */ ;
        // @ts-ignore
        const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
            size: "small",
            bordered: (false),
            type: "warning",
        }));
        const __VLS_25 = __VLS_24({
            size: "small",
            bordered: (false),
            type: "warning",
        }, ...__VLS_functionalComponentArgsRest(__VLS_24));
        __VLS_26.slots.default;
        (item.category);
        var __VLS_26;
        if (item.notes) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "equip-card__notes" },
            });
            (item.notes);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "equip-card__actions" },
        });
        const __VLS_27 = {}.NButton;
        /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
        // @ts-ignore
        const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
            ...{ 'onClick': {} },
            size: "small",
            tertiary: true,
        }));
        const __VLS_29 = __VLS_28({
            ...{ 'onClick': {} },
            size: "small",
            tertiary: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_28));
        let __VLS_31;
        let __VLS_32;
        let __VLS_33;
        const __VLS_34 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.equipmentLoading && __VLS_ctx.equipmentList.length === 0))
                    return;
                __VLS_ctx.viewTimeline(item);
            }
        };
        __VLS_30.slots.default;
        var __VLS_30;
        const __VLS_35 = {}.NButton;
        /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
            ...{ 'onClick': {} },
            size: "small",
            tertiary: true,
        }));
        const __VLS_37 = __VLS_36({
            ...{ 'onClick': {} },
            size: "small",
            tertiary: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_36));
        let __VLS_39;
        let __VLS_40;
        let __VLS_41;
        const __VLS_42 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.equipmentLoading && __VLS_ctx.equipmentList.length === 0))
                    return;
                __VLS_ctx.openEquipModal(item);
            }
        };
        __VLS_38.slots.default;
        var __VLS_38;
        if (item.status === 'available') {
            const __VLS_43 = {}.NButton;
            /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
            // @ts-ignore
            const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
                ...{ 'onClick': {} },
                size: "small",
                tertiary: true,
                type: "warning",
            }));
            const __VLS_45 = __VLS_44({
                ...{ 'onClick': {} },
                size: "small",
                tertiary: true,
                type: "warning",
            }, ...__VLS_functionalComponentArgsRest(__VLS_44));
            let __VLS_47;
            let __VLS_48;
            let __VLS_49;
            const __VLS_50 = {
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.equipmentLoading && __VLS_ctx.equipmentList.length === 0))
                        return;
                    if (!(item.status === 'available'))
                        return;
                    __VLS_ctx.toggleEquipmentStatus(item);
                }
            };
            __VLS_46.slots.default;
            var __VLS_46;
        }
        else if (item.status === 'repair') {
            const __VLS_51 = {}.NButton;
            /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
            // @ts-ignore
            const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
                ...{ 'onClick': {} },
                size: "small",
                tertiary: true,
                type: "success",
            }));
            const __VLS_53 = __VLS_52({
                ...{ 'onClick': {} },
                size: "small",
                tertiary: true,
                type: "success",
            }, ...__VLS_functionalComponentArgsRest(__VLS_52));
            let __VLS_55;
            let __VLS_56;
            let __VLS_57;
            const __VLS_58 = {
                onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.equipmentLoading && __VLS_ctx.equipmentList.length === 0))
                        return;
                    if (!!(item.status === 'available'))
                        return;
                    if (!(item.status === 'repair'))
                        return;
                    __VLS_ctx.toggleEquipmentStatus(item);
                }
            };
            __VLS_54.slots.default;
            var __VLS_54;
        }
        const __VLS_59 = {}.NPopconfirm;
        /** @type {[typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
            ...{ 'onPositiveClick': {} },
        }));
        const __VLS_61 = __VLS_60({
            ...{ 'onPositiveClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_60));
        let __VLS_63;
        let __VLS_64;
        let __VLS_65;
        const __VLS_66 = {
            onPositiveClick: (...[$event]) => {
                if (!!(!__VLS_ctx.equipmentLoading && __VLS_ctx.equipmentList.length === 0))
                    return;
                __VLS_ctx.removeEquipment(item);
            }
        };
        __VLS_62.slots.default;
        {
            const { trigger: __VLS_thisSlot } = __VLS_62.slots;
            const __VLS_67 = {}.NButton;
            /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
            // @ts-ignore
            const __VLS_68 = __VLS_asFunctionalComponent(__VLS_67, new __VLS_67({
                size: "small",
                tertiary: true,
                type: "error",
            }));
            const __VLS_69 = __VLS_68({
                size: "small",
                tertiary: true,
                type: "error",
            }, ...__VLS_functionalComponentArgsRest(__VLS_68));
            __VLS_70.slots.default;
            var __VLS_70;
        }
        (item.name);
        var __VLS_62;
    }
}
var __VLS_15;
const __VLS_71 = {}.NDivider;
/** @type {[typeof __VLS_components.NDivider, typeof __VLS_components.nDivider, ]} */ ;
// @ts-ignore
const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({}));
const __VLS_73 = __VLS_72({}, ...__VLS_functionalComponentArgsRest(__VLS_72));
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-title-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "page-desc" },
});
const __VLS_75 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
// @ts-ignore
const __VLS_76 = __VLS_asFunctionalComponent(__VLS_75, new __VLS_75({
    ...{ 'onClick': {} },
    type: "primary",
}));
const __VLS_77 = __VLS_76({
    ...{ 'onClick': {} },
    type: "primary",
}, ...__VLS_functionalComponentArgsRest(__VLS_76));
let __VLS_79;
let __VLS_80;
let __VLS_81;
const __VLS_82 = {
    onClick: (...[$event]) => {
        __VLS_ctx.openCardModal();
    }
};
__VLS_78.slots.default;
var __VLS_78;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-stats" },
});
const __VLS_83 = {}.NTag;
/** @type {[typeof __VLS_components.NTag, typeof __VLS_components.nTag, typeof __VLS_components.NTag, typeof __VLS_components.nTag, ]} */ ;
// @ts-ignore
const __VLS_84 = __VLS_asFunctionalComponent(__VLS_83, new __VLS_83({
    type: "success",
    round: true,
    size: "medium",
}));
const __VLS_85 = __VLS_84({
    type: "success",
    round: true,
    size: "medium",
}, ...__VLS_functionalComponentArgsRest(__VLS_84));
__VLS_86.slots.default;
(__VLS_ctx.cardStats.available);
var __VLS_86;
const __VLS_87 = {}.NTag;
/** @type {[typeof __VLS_components.NTag, typeof __VLS_components.nTag, typeof __VLS_components.NTag, typeof __VLS_components.nTag, ]} */ ;
// @ts-ignore
const __VLS_88 = __VLS_asFunctionalComponent(__VLS_87, new __VLS_87({
    type: "error",
    round: true,
    size: "medium",
}));
const __VLS_89 = __VLS_88({
    type: "error",
    round: true,
    size: "medium",
}, ...__VLS_functionalComponentArgsRest(__VLS_88));
__VLS_90.slots.default;
(__VLS_ctx.cardStats.borrowed);
var __VLS_90;
const __VLS_91 = {}.NTag;
/** @type {[typeof __VLS_components.NTag, typeof __VLS_components.nTag, typeof __VLS_components.NTag, typeof __VLS_components.nTag, ]} */ ;
// @ts-ignore
const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
    type: "default",
    round: true,
    size: "medium",
}));
const __VLS_93 = __VLS_92({
    type: "default",
    round: true,
    size: "medium",
}, ...__VLS_functionalComponentArgsRest(__VLS_92));
__VLS_94.slots.default;
(__VLS_ctx.cardStats.total);
var __VLS_94;
const __VLS_95 = {}.NSpin;
/** @type {[typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, typeof __VLS_components.NSpin, typeof __VLS_components.nSpin, ]} */ ;
// @ts-ignore
const __VLS_96 = __VLS_asFunctionalComponent(__VLS_95, new __VLS_95({
    show: (__VLS_ctx.cardLoading),
}));
const __VLS_97 = __VLS_96({
    show: (__VLS_ctx.cardLoading),
}, ...__VLS_functionalComponentArgsRest(__VLS_96));
__VLS_98.slots.default;
if (!__VLS_ctx.cardLoading && __VLS_ctx.cardList.length === 0) {
    /** @type {[typeof EmptyState, ]} */ ;
    // @ts-ignore
    const __VLS_99 = __VLS_asFunctionalComponent(EmptyState, new EmptyState({
        icon: "💾",
        text: "暂无内存卡",
        subText: "点击右上角「添加内存卡」创建第一张卡",
    }));
    const __VLS_100 = __VLS_99({
        icon: "💾",
        text: "暂无内存卡",
        subText: "点击右上角「添加内存卡」创建第一张卡",
    }, ...__VLS_functionalComponentArgsRest(__VLS_99));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-grid" },
    });
    for (const [card] of __VLS_getVForSourceType((__VLS_ctx.cardList))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (card.id),
            ...{ class: "card-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-item__media" },
        });
        if (card.image_url) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (card.image_url),
                alt: (card.name),
                ...{ class: "card-item__img" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "card-item__icon" },
            });
        }
        const __VLS_102 = {}.NTag;
        /** @type {[typeof __VLS_components.NTag, typeof __VLS_components.nTag, typeof __VLS_components.NTag, typeof __VLS_components.nTag, ]} */ ;
        // @ts-ignore
        const __VLS_103 = __VLS_asFunctionalComponent(__VLS_102, new __VLS_102({
            ...{ class: "card-item__status" },
            type: (__VLS_ctx.cardStatusMeta(card.status).type),
            size: "small",
            round: true,
        }));
        const __VLS_104 = __VLS_103({
            ...{ class: "card-item__status" },
            type: (__VLS_ctx.cardStatusMeta(card.status).type),
            size: "small",
            round: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_103));
        __VLS_105.slots.default;
        (__VLS_ctx.cardStatusMeta(card.status).label);
        var __VLS_105;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-item__body" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-item__name" },
        });
        (card.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-item__code" },
        });
        (card.code);
        if (card.notes) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "card-item__notes" },
            });
            (card.notes);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "card-item__actions" },
        });
        const __VLS_106 = {}.NButton;
        /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
        // @ts-ignore
        const __VLS_107 = __VLS_asFunctionalComponent(__VLS_106, new __VLS_106({
            ...{ 'onClick': {} },
            size: "small",
            tertiary: true,
        }));
        const __VLS_108 = __VLS_107({
            ...{ 'onClick': {} },
            size: "small",
            tertiary: true,
        }, ...__VLS_functionalComponentArgsRest(__VLS_107));
        let __VLS_110;
        let __VLS_111;
        let __VLS_112;
        const __VLS_113 = {
            onClick: (...[$event]) => {
                if (!!(!__VLS_ctx.cardLoading && __VLS_ctx.cardList.length === 0))
                    return;
                __VLS_ctx.openCardModal(card);
            }
        };
        __VLS_109.slots.default;
        var __VLS_109;
        const __VLS_114 = {}.NPopconfirm;
        /** @type {[typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, typeof __VLS_components.NPopconfirm, typeof __VLS_components.nPopconfirm, ]} */ ;
        // @ts-ignore
        const __VLS_115 = __VLS_asFunctionalComponent(__VLS_114, new __VLS_114({
            ...{ 'onPositiveClick': {} },
        }));
        const __VLS_116 = __VLS_115({
            ...{ 'onPositiveClick': {} },
        }, ...__VLS_functionalComponentArgsRest(__VLS_115));
        let __VLS_118;
        let __VLS_119;
        let __VLS_120;
        const __VLS_121 = {
            onPositiveClick: (...[$event]) => {
                if (!!(!__VLS_ctx.cardLoading && __VLS_ctx.cardList.length === 0))
                    return;
                __VLS_ctx.removeCard(card);
            }
        };
        __VLS_117.slots.default;
        {
            const { trigger: __VLS_thisSlot } = __VLS_117.slots;
            const __VLS_122 = {}.NButton;
            /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
            // @ts-ignore
            const __VLS_123 = __VLS_asFunctionalComponent(__VLS_122, new __VLS_122({
                size: "small",
                tertiary: true,
                type: "error",
            }));
            const __VLS_124 = __VLS_123({
                size: "small",
                tertiary: true,
                type: "error",
            }, ...__VLS_functionalComponentArgsRest(__VLS_123));
            __VLS_125.slots.default;
            var __VLS_125;
        }
        (card.name);
        var __VLS_117;
    }
}
var __VLS_98;
const __VLS_126 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_127 = __VLS_asFunctionalComponent(__VLS_126, new __VLS_126({
    show: (__VLS_ctx.equipModalShow),
    preset: "card",
    title: (__VLS_ctx.equipEditing ? '编辑设备' : '添加设备'),
    ...{ style: {} },
    maskClosable: (false),
}));
const __VLS_128 = __VLS_127({
    show: (__VLS_ctx.equipModalShow),
    preset: "card",
    title: (__VLS_ctx.equipEditing ? '编辑设备' : '添加设备'),
    ...{ style: {} },
    maskClosable: (false),
}, ...__VLS_functionalComponentArgsRest(__VLS_127));
__VLS_129.slots.default;
const __VLS_130 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_131 = __VLS_asFunctionalComponent(__VLS_130, new __VLS_130({
    ref: "equipFormRef",
    model: (__VLS_ctx.equipForm),
    rules: (__VLS_ctx.equipRules),
    labelPlacement: "top",
}));
const __VLS_132 = __VLS_131({
    ref: "equipFormRef",
    model: (__VLS_ctx.equipForm),
    rules: (__VLS_ctx.equipRules),
    labelPlacement: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_131));
/** @type {typeof __VLS_ctx.equipFormRef} */ ;
var __VLS_134 = {};
__VLS_133.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-row" },
});
const __VLS_136 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_137 = __VLS_asFunctionalComponent(__VLS_136, new __VLS_136({
    label: "编号",
    path: "code",
}));
const __VLS_138 = __VLS_137({
    label: "编号",
    path: "code",
}, ...__VLS_functionalComponentArgsRest(__VLS_137));
__VLS_139.slots.default;
const __VLS_140 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_141 = __VLS_asFunctionalComponent(__VLS_140, new __VLS_140({
    value: (__VLS_ctx.equipForm.code),
    placeholder: "如 CAM-001",
    disabled: (!!__VLS_ctx.equipEditing),
    clearable: true,
}));
const __VLS_142 = __VLS_141({
    value: (__VLS_ctx.equipForm.code),
    placeholder: "如 CAM-001",
    disabled: (!!__VLS_ctx.equipEditing),
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_141));
var __VLS_139;
const __VLS_144 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_145 = __VLS_asFunctionalComponent(__VLS_144, new __VLS_144({
    label: "名称",
    path: "name",
}));
const __VLS_146 = __VLS_145({
    label: "名称",
    path: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_145));
__VLS_147.slots.default;
const __VLS_148 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_149 = __VLS_asFunctionalComponent(__VLS_148, new __VLS_148({
    value: (__VLS_ctx.equipForm.name),
    placeholder: "如 索尼 A7M4",
    clearable: true,
}));
const __VLS_150 = __VLS_149({
    value: (__VLS_ctx.equipForm.name),
    placeholder: "如 索尼 A7M4",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_149));
var __VLS_147;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-row" },
});
const __VLS_152 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_153 = __VLS_asFunctionalComponent(__VLS_152, new __VLS_152({
    label: "类别",
    path: "category",
}));
const __VLS_154 = __VLS_153({
    label: "类别",
    path: "category",
}, ...__VLS_functionalComponentArgsRest(__VLS_153));
__VLS_155.slots.default;
const __VLS_156 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_157 = __VLS_asFunctionalComponent(__VLS_156, new __VLS_156({
    value: (__VLS_ctx.equipForm.category),
    options: (__VLS_ctx.categoryOptions),
    placeholder: "选择类别",
}));
const __VLS_158 = __VLS_157({
    value: (__VLS_ctx.equipForm.category),
    options: (__VLS_ctx.categoryOptions),
    placeholder: "选择类别",
}, ...__VLS_functionalComponentArgsRest(__VLS_157));
var __VLS_155;
const __VLS_160 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_161 = __VLS_asFunctionalComponent(__VLS_160, new __VLS_160({
    label: "图标",
    path: "icon",
}));
const __VLS_162 = __VLS_161({
    label: "图标",
    path: "icon",
}, ...__VLS_functionalComponentArgsRest(__VLS_161));
__VLS_163.slots.default;
const __VLS_164 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_165 = __VLS_asFunctionalComponent(__VLS_164, new __VLS_164({
    value: (__VLS_ctx.equipForm.icon),
    placeholder: "emoji，如 📷",
    maxlength: "4",
}));
const __VLS_166 = __VLS_165({
    value: (__VLS_ctx.equipForm.icon),
    placeholder: "emoji，如 📷",
    maxlength: "4",
}, ...__VLS_functionalComponentArgsRest(__VLS_165));
var __VLS_163;
const __VLS_168 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_169 = __VLS_asFunctionalComponent(__VLS_168, new __VLS_168({
    label: "状态",
    path: "status",
}));
const __VLS_170 = __VLS_169({
    label: "状态",
    path: "status",
}, ...__VLS_functionalComponentArgsRest(__VLS_169));
__VLS_171.slots.default;
const __VLS_172 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, typeof __VLS_components.nSelect, ]} */ ;
// @ts-ignore
const __VLS_173 = __VLS_asFunctionalComponent(__VLS_172, new __VLS_172({
    value: (__VLS_ctx.equipForm.status),
    options: (__VLS_ctx.equipmentStatusOptions),
    placeholder: "选择状态",
}));
const __VLS_174 = __VLS_173({
    value: (__VLS_ctx.equipForm.status),
    options: (__VLS_ctx.equipmentStatusOptions),
    placeholder: "选择状态",
}, ...__VLS_functionalComponentArgsRest(__VLS_173));
var __VLS_171;
const __VLS_176 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_177 = __VLS_asFunctionalComponent(__VLS_176, new __VLS_176({
    label: "备注",
    path: "notes",
}));
const __VLS_178 = __VLS_177({
    label: "备注",
    path: "notes",
}, ...__VLS_functionalComponentArgsRest(__VLS_177));
__VLS_179.slots.default;
const __VLS_180 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_181 = __VLS_asFunctionalComponent(__VLS_180, new __VLS_180({
    value: (__VLS_ctx.equipForm.notes),
    type: "textarea",
    placeholder: "可选，设备相关说明",
    autosize: ({ minRows: 2, maxRows: 4 }),
    maxlength: "200",
    showCount: true,
}));
const __VLS_182 = __VLS_181({
    value: (__VLS_ctx.equipForm.notes),
    type: "textarea",
    placeholder: "可选，设备相关说明",
    autosize: ({ minRows: 2, maxRows: 4 }),
    maxlength: "200",
    showCount: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_181));
var __VLS_179;
const __VLS_184 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_185 = __VLS_asFunctionalComponent(__VLS_184, new __VLS_184({
    label: "设备图片",
}));
const __VLS_186 = __VLS_185({
    label: "设备图片",
}, ...__VLS_functionalComponentArgsRest(__VLS_185));
__VLS_187.slots.default;
const __VLS_188 = {}.NUpload;
/** @type {[typeof __VLS_components.NUpload, typeof __VLS_components.nUpload, typeof __VLS_components.NUpload, typeof __VLS_components.nUpload, ]} */ ;
// @ts-ignore
const __VLS_189 = __VLS_asFunctionalComponent(__VLS_188, new __VLS_188({
    ...{ 'onChange': {} },
    fileList: (__VLS_ctx.equipFileList),
    listType: "image-card",
    max: (1),
    defaultUpload: (false),
    accept: "image/*",
}));
const __VLS_190 = __VLS_189({
    ...{ 'onChange': {} },
    fileList: (__VLS_ctx.equipFileList),
    listType: "image-card",
    max: (1),
    defaultUpload: (false),
    accept: "image/*",
}, ...__VLS_functionalComponentArgsRest(__VLS_189));
let __VLS_192;
let __VLS_193;
let __VLS_194;
const __VLS_195 = {
    onChange: (__VLS_ctx.handleEquipFileChange)
};
__VLS_191.slots.default;
var __VLS_191;
var __VLS_187;
var __VLS_133;
{
    const { footer: __VLS_thisSlot } = __VLS_129.slots;
    const __VLS_196 = {}.NSpace;
    /** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
    // @ts-ignore
    const __VLS_197 = __VLS_asFunctionalComponent(__VLS_196, new __VLS_196({
        justify: "end",
    }));
    const __VLS_198 = __VLS_197({
        justify: "end",
    }, ...__VLS_functionalComponentArgsRest(__VLS_197));
    __VLS_199.slots.default;
    const __VLS_200 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_201 = __VLS_asFunctionalComponent(__VLS_200, new __VLS_200({
        ...{ 'onClick': {} },
    }));
    const __VLS_202 = __VLS_201({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_201));
    let __VLS_204;
    let __VLS_205;
    let __VLS_206;
    const __VLS_207 = {
        onClick: (...[$event]) => {
            __VLS_ctx.equipModalShow = false;
        }
    };
    __VLS_203.slots.default;
    var __VLS_203;
    const __VLS_208 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_209 = __VLS_asFunctionalComponent(__VLS_208, new __VLS_208({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.equipSaving),
    }));
    const __VLS_210 = __VLS_209({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.equipSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_209));
    let __VLS_212;
    let __VLS_213;
    let __VLS_214;
    const __VLS_215 = {
        onClick: (__VLS_ctx.saveEquipment)
    };
    __VLS_211.slots.default;
    var __VLS_211;
    var __VLS_199;
}
var __VLS_129;
const __VLS_216 = {}.NModal;
/** @type {[typeof __VLS_components.NModal, typeof __VLS_components.nModal, typeof __VLS_components.NModal, typeof __VLS_components.nModal, ]} */ ;
// @ts-ignore
const __VLS_217 = __VLS_asFunctionalComponent(__VLS_216, new __VLS_216({
    show: (__VLS_ctx.cardModalShow),
    preset: "card",
    title: (__VLS_ctx.cardEditing ? '编辑内存卡' : '添加内存卡'),
    ...{ style: {} },
    maskClosable: (false),
}));
const __VLS_218 = __VLS_217({
    show: (__VLS_ctx.cardModalShow),
    preset: "card",
    title: (__VLS_ctx.cardEditing ? '编辑内存卡' : '添加内存卡'),
    ...{ style: {} },
    maskClosable: (false),
}, ...__VLS_functionalComponentArgsRest(__VLS_217));
__VLS_219.slots.default;
const __VLS_220 = {}.NForm;
/** @type {[typeof __VLS_components.NForm, typeof __VLS_components.nForm, typeof __VLS_components.NForm, typeof __VLS_components.nForm, ]} */ ;
// @ts-ignore
const __VLS_221 = __VLS_asFunctionalComponent(__VLS_220, new __VLS_220({
    ref: "cardFormRef",
    model: (__VLS_ctx.cardForm),
    rules: (__VLS_ctx.cardRules),
    labelPlacement: "top",
}));
const __VLS_222 = __VLS_221({
    ref: "cardFormRef",
    model: (__VLS_ctx.cardForm),
    rules: (__VLS_ctx.cardRules),
    labelPlacement: "top",
}, ...__VLS_functionalComponentArgsRest(__VLS_221));
/** @type {typeof __VLS_ctx.cardFormRef} */ ;
var __VLS_224 = {};
__VLS_223.slots.default;
const __VLS_226 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_227 = __VLS_asFunctionalComponent(__VLS_226, new __VLS_226({
    label: "编号",
    path: "code",
}));
const __VLS_228 = __VLS_227({
    label: "编号",
    path: "code",
}, ...__VLS_functionalComponentArgsRest(__VLS_227));
__VLS_229.slots.default;
const __VLS_230 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_231 = __VLS_asFunctionalComponent(__VLS_230, new __VLS_230({
    value: (__VLS_ctx.cardForm.code),
    placeholder: "如 SD-001",
    disabled: (!!__VLS_ctx.cardEditing),
    clearable: true,
}));
const __VLS_232 = __VLS_231({
    value: (__VLS_ctx.cardForm.code),
    placeholder: "如 SD-001",
    disabled: (!!__VLS_ctx.cardEditing),
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_231));
var __VLS_229;
const __VLS_234 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_235 = __VLS_asFunctionalComponent(__VLS_234, new __VLS_234({
    label: "名称",
    path: "name",
}));
const __VLS_236 = __VLS_235({
    label: "名称",
    path: "name",
}, ...__VLS_functionalComponentArgsRest(__VLS_235));
__VLS_237.slots.default;
const __VLS_238 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_239 = __VLS_asFunctionalComponent(__VLS_238, new __VLS_238({
    value: (__VLS_ctx.cardForm.name),
    placeholder: "如 SanDisk 128GB",
    clearable: true,
}));
const __VLS_240 = __VLS_239({
    value: (__VLS_ctx.cardForm.name),
    placeholder: "如 SanDisk 128GB",
    clearable: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_239));
var __VLS_237;
const __VLS_242 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_243 = __VLS_asFunctionalComponent(__VLS_242, new __VLS_242({
    label: "备注",
    path: "notes",
}));
const __VLS_244 = __VLS_243({
    label: "备注",
    path: "notes",
}, ...__VLS_functionalComponentArgsRest(__VLS_243));
__VLS_245.slots.default;
const __VLS_246 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, typeof __VLS_components.nInput, ]} */ ;
// @ts-ignore
const __VLS_247 = __VLS_asFunctionalComponent(__VLS_246, new __VLS_246({
    value: (__VLS_ctx.cardForm.notes),
    type: "textarea",
    placeholder: "可选",
    autosize: ({ minRows: 2, maxRows: 4 }),
    maxlength: "200",
    showCount: true,
}));
const __VLS_248 = __VLS_247({
    value: (__VLS_ctx.cardForm.notes),
    type: "textarea",
    placeholder: "可选",
    autosize: ({ minRows: 2, maxRows: 4 }),
    maxlength: "200",
    showCount: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_247));
var __VLS_245;
const __VLS_250 = {}.NFormItem;
/** @type {[typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, typeof __VLS_components.NFormItem, typeof __VLS_components.nFormItem, ]} */ ;
// @ts-ignore
const __VLS_251 = __VLS_asFunctionalComponent(__VLS_250, new __VLS_250({
    label: "内存卡图片",
}));
const __VLS_252 = __VLS_251({
    label: "内存卡图片",
}, ...__VLS_functionalComponentArgsRest(__VLS_251));
__VLS_253.slots.default;
const __VLS_254 = {}.NUpload;
/** @type {[typeof __VLS_components.NUpload, typeof __VLS_components.nUpload, typeof __VLS_components.NUpload, typeof __VLS_components.nUpload, ]} */ ;
// @ts-ignore
const __VLS_255 = __VLS_asFunctionalComponent(__VLS_254, new __VLS_254({
    ...{ 'onChange': {} },
    fileList: (__VLS_ctx.cardFileList),
    listType: "image-card",
    max: (1),
    defaultUpload: (false),
    accept: "image/*",
}));
const __VLS_256 = __VLS_255({
    ...{ 'onChange': {} },
    fileList: (__VLS_ctx.cardFileList),
    listType: "image-card",
    max: (1),
    defaultUpload: (false),
    accept: "image/*",
}, ...__VLS_functionalComponentArgsRest(__VLS_255));
let __VLS_258;
let __VLS_259;
let __VLS_260;
const __VLS_261 = {
    onChange: (__VLS_ctx.handleCardFileChange)
};
__VLS_257.slots.default;
var __VLS_257;
var __VLS_253;
var __VLS_223;
{
    const { footer: __VLS_thisSlot } = __VLS_219.slots;
    const __VLS_262 = {}.NSpace;
    /** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, typeof __VLS_components.NSpace, typeof __VLS_components.nSpace, ]} */ ;
    // @ts-ignore
    const __VLS_263 = __VLS_asFunctionalComponent(__VLS_262, new __VLS_262({
        justify: "end",
    }));
    const __VLS_264 = __VLS_263({
        justify: "end",
    }, ...__VLS_functionalComponentArgsRest(__VLS_263));
    __VLS_265.slots.default;
    const __VLS_266 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_267 = __VLS_asFunctionalComponent(__VLS_266, new __VLS_266({
        ...{ 'onClick': {} },
    }));
    const __VLS_268 = __VLS_267({
        ...{ 'onClick': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_267));
    let __VLS_270;
    let __VLS_271;
    let __VLS_272;
    const __VLS_273 = {
        onClick: (...[$event]) => {
            __VLS_ctx.cardModalShow = false;
        }
    };
    __VLS_269.slots.default;
    var __VLS_269;
    const __VLS_274 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.nButton, typeof __VLS_components.NButton, typeof __VLS_components.nButton, ]} */ ;
    // @ts-ignore
    const __VLS_275 = __VLS_asFunctionalComponent(__VLS_274, new __VLS_274({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.cardSaving),
    }));
    const __VLS_276 = __VLS_275({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.cardSaving),
    }, ...__VLS_functionalComponentArgsRest(__VLS_275));
    let __VLS_278;
    let __VLS_279;
    let __VLS_280;
    const __VLS_281 = {
        onClick: (__VLS_ctx.saveCard)
    };
    __VLS_277.slots.default;
    var __VLS_277;
    var __VLS_265;
}
var __VLS_219;
/** @type {[typeof EquipmentTimeline, ]} */ ;
// @ts-ignore
const __VLS_282 = __VLS_asFunctionalComponent(EquipmentTimeline, new EquipmentTimeline({
    visible: (__VLS_ctx.timelineVisible),
    equipmentId: (__VLS_ctx.timelineEquipmentId),
}));
const __VLS_283 = __VLS_282({
    visible: (__VLS_ctx.timelineVisible),
    equipmentId: (__VLS_ctx.timelineEquipmentId),
}, ...__VLS_functionalComponentArgsRest(__VLS_282));
var __VLS_2;
/** @type {__VLS_StyleScopedClasses['page']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['card-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['equip-card']} */ ;
/** @type {__VLS_StyleScopedClasses['equip-card__media']} */ ;
/** @type {__VLS_StyleScopedClasses['equip-card__img']} */ ;
/** @type {__VLS_StyleScopedClasses['equip-card__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['equip-card__status']} */ ;
/** @type {__VLS_StyleScopedClasses['equip-card__body']} */ ;
/** @type {__VLS_StyleScopedClasses['equip-card__title']} */ ;
/** @type {__VLS_StyleScopedClasses['equip-card__code']} */ ;
/** @type {__VLS_StyleScopedClasses['equip-card__tags']} */ ;
/** @type {__VLS_StyleScopedClasses['equip-card__notes']} */ ;
/** @type {__VLS_StyleScopedClasses['equip-card__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['card-stats']} */ ;
/** @type {__VLS_StyleScopedClasses['card-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card-item']} */ ;
/** @type {__VLS_StyleScopedClasses['card-item__media']} */ ;
/** @type {__VLS_StyleScopedClasses['card-item__img']} */ ;
/** @type {__VLS_StyleScopedClasses['card-item__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['card-item__status']} */ ;
/** @type {__VLS_StyleScopedClasses['card-item__body']} */ ;
/** @type {__VLS_StyleScopedClasses['card-item__name']} */ ;
/** @type {__VLS_StyleScopedClasses['card-item__code']} */ ;
/** @type {__VLS_StyleScopedClasses['card-item__notes']} */ ;
/** @type {__VLS_StyleScopedClasses['card-item__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-row']} */ ;
// @ts-ignore
var __VLS_135 = __VLS_134, __VLS_225 = __VLS_224;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NTag: NTag,
            NModal: NModal,
            NForm: NForm,
            NFormItem: NFormItem,
            NInput: NInput,
            NSelect: NSelect,
            NUpload: NUpload,
            NPopconfirm: NPopconfirm,
            NSpin: NSpin,
            NDivider: NDivider,
            NSpace: NSpace,
            AppLayout: AppLayout,
            EmptyState: EmptyState,
            EquipmentTimeline: EquipmentTimeline,
            timelineVisible: timelineVisible,
            timelineEquipmentId: timelineEquipmentId,
            viewTimeline: viewTimeline,
            categoryOptions: categoryOptions,
            equipmentStatusOptions: equipmentStatusOptions,
            equipmentList: equipmentList,
            cardList: cardList,
            equipmentLoading: equipmentLoading,
            cardLoading: cardLoading,
            cardStats: cardStats,
            equipmentStatusMeta: equipmentStatusMeta,
            cardStatusMeta: cardStatusMeta,
            equipModalShow: equipModalShow,
            equipSaving: equipSaving,
            equipEditing: equipEditing,
            equipFormRef: equipFormRef,
            equipFileList: equipFileList,
            equipForm: equipForm,
            equipRules: equipRules,
            openEquipModal: openEquipModal,
            handleEquipFileChange: handleEquipFileChange,
            saveEquipment: saveEquipment,
            toggleEquipmentStatus: toggleEquipmentStatus,
            removeEquipment: removeEquipment,
            cardModalShow: cardModalShow,
            cardSaving: cardSaving,
            cardEditing: cardEditing,
            cardFormRef: cardFormRef,
            cardFileList: cardFileList,
            cardForm: cardForm,
            cardRules: cardRules,
            openCardModal: openCardModal,
            handleCardFileChange: handleCardFileChange,
            saveCard: saveCard,
            removeCard: removeCard,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
