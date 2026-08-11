import { readonly, ref } from 'vue'

const SOUND_KEY = 'equipment-editorial-sound-enabled'

function readPreference(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) === 'true'
  } catch {
    return false
  }
}

const enabled = ref(typeof window !== 'undefined' ? readPreference() : false)
let audioContext: AudioContext | null = null

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext || (window as typeof window & {
    webkitAudioContext?: typeof AudioContext
  }).webkitAudioContext
  if (!AudioContextClass) return null
  if (!audioContext) audioContext = new AudioContextClass()
  if (audioContext.state === 'suspended') void audioContext.resume()
  return audioContext
}

export const editorialSoundEnabled = readonly(enabled)

export function setEditorialSoundEnabled(value: boolean) {
  enabled.value = value
  try {
    window.localStorage.setItem(SOUND_KEY, String(value))
  } catch {
    // 隐私模式下仍允许在当前页面使用。
  }
  if (value) {
    context()
    playBookmarkSound()
  }
}

function noise(duration: number, frequency: number, volume: number) {
  if (!enabled.value) return
  const ctx = context()
  if (!ctx) return
  const frames = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
  const values = buffer.getChannelData(0)
  for (let index = 0; index < frames; index++) {
    const fade = 1 - index / frames
    values[index] = (Math.random() * 2 - 1) * fade
  }
  const source = ctx.createBufferSource()
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  source.buffer = buffer
  filter.type = 'bandpass'
  filter.frequency.value = frequency
  filter.Q.value = 0.7
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
  source.connect(filter).connect(gain).connect(ctx.destination)
  source.start()
}

function tone(
  frequency: number,
  endFrequency: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine'
) {
  if (!enabled.value) return
  const ctx = context()
  if (!ctx) return
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, ctx.currentTime + duration)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + duration)
}

/** 轻微纸张翻页声，用于路由切换。 */
export function playPageTurnSound() {
  noise(0.16, 1850, 0.035)
}

/** 低沉盖章声，用于申请、审批、归还与头像归档。 */
export function playStampSound() {
  tone(128, 72, 0.13, 0.09, 'triangle')
  window.setTimeout(() => noise(0.055, 620, 0.055), 38)
}

/** 轻巧纸签声，用于收藏与开关确认。 */
export function playBookmarkSound() {
  tone(720, 460, 0.09, 0.035, 'sine')
}
