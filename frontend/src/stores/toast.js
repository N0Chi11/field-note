import { defineStore } from 'pinia';
import { ref } from 'vue';
let seed = 0;
/**
 * 全局提示 Store
 *
 * 这里维护一个本地消息队列，组件可以通过 useToast() 拿到 messageApi 来桥接到 Naive UI 的 discrete API；
 * 若没有注入 messageApi，则降级为 console + 本地队列，方便在没有 NMessageProvider 的环境下也能工作。
 */
export const useToastStore = defineStore('toast', () => {
    /** 消息列表（本地队列，可用于自定义渲染） */
    const messages = ref([]);
    /**
     * 桥接 Naive UI 的 discrete message API。
     * 由 main.ts 或根组件调用 inject(useMessage()) 设置。
     */
    const messageApi = ref(null);
    /** 注入 Naive UI message API */
    function setMessageApi(api) {
        messageApi.value = api;
    }
    function push(type, message, duration = 3000) {
        const id = ++seed;
        if (messageApi.value) {
            // 优先用 Naive UI 的全局消息
            messageApi.value[type](message);
            return id;
        }
        // 降级：本地队列 + console
        messages.value.push({ id, type, message, duration });
        // eslint-disable-next-line no-console
        console[type === 'error' ? 'error' : 'log'](`[${type}] ${message}`);
        if (duration > 0) {
            setTimeout(() => remove(id), duration);
        }
        return id;
    }
    function remove(id) {
        const idx = messages.value.findIndex((m) => m.id === id);
        if (idx > -1)
            messages.value.splice(idx, 1);
    }
    function success(msg) {
        return push('success', msg);
    }
    function error(msg) {
        return push('error', msg);
    }
    function warning(msg) {
        return push('warning', msg);
    }
    function info(msg) {
        return push('info', msg);
    }
    return {
        messages,
        messageApi,
        setMessageApi,
        success,
        error,
        warning,
        info,
        remove
    };
});
