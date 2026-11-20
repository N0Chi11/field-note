import { ref } from 'vue'
import { defineStore } from 'pinia'

// In-memory only. Refreshing or restoring an existing session never opens the draw.
export const useCameraDrawStore = defineStore('cameraDraw', () => {
  const visible = ref(false)

  function open() {
    visible.value = true
  }

  function close() {
    visible.value = false
  }

  return { visible, open, close }
})
