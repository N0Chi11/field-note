import { readonly, ref } from 'vue'

const SOUND_KEY = 'equipment-editorial-sound-enabled'
const SOUND_VOLUME_KEY = 'equipment-editorial-sound-volume'

function readPreference(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) === 'true'
  } catch {
    return false
  }
}

const enabled = ref(typeof window !== 'undefined' ? readPreference() : false)
const volume = ref(0.32)
try {
  const savedVolume = Number(window.localStorage.getItem(SOUND_VOLUME_KEY))
  if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) {
    volume.value = savedVolume
  }
} catch {
  // 使用柔和的默认音量。
}
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
export const editorialSoundVolume = readonly(volume)

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

export function setEditorialSoundVolume(value: number) {
  volume.value = Math.min(1, Math.max(0.08, value))
  try {
    window.localStorage.setItem(SOUND_VOLUME_KEY, String(volume.value))
  } catch {
    // 隐私模式下仍可调节当前页面音量。
  }
}

function paperNoise(
  duration: number,
  lowFrequency: number,
  highFrequency: number,
  baseVolume: number
) {
  if (!enabled.value) return
  const ctx = context()
  if (!ctx) return
  const frames = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
  const values = buffer.getChannelData(0)
  let brown = 0
  for (let index = 0; index < frames; index++) {
    const white = Math.random() * 2 - 1
    brown = (brown + 0.025 * white) / 1.025
    const position = index / frames
    const envelope = Math.pow(Math.sin(Math.PI * position), 0.7)
    values[index] = brown * 3.2 * envelope
  }
  const source = ctx.createBufferSource()
  const highPass = ctx.createBiquadFilter()
  const lowPass = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  source.buffer = buffer
  highPass.type = 'highpass'
  highPass.frequency.value = lowFrequency
  highPass.Q.value = 0.45
  lowPass.type = 'lowpass'
  lowPass.frequency.value = highFrequency
  lowPass.Q.value = 0.55
  gain.gain.value = baseVolume * volume.value
  source.connect(highPass).connect(lowPass).connect(gain).connect(ctx.destination)
  source.start()
}

function tone(
  frequency: number,
  endFrequency: number,
  duration: number,
  baseVolume: number
) {
  if (!enabled.value) return
  const ctx = context()
  if (!ctx) return
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(endFrequency, ctx.currentTime + duration)
  gain.gain.setValueAtTime(baseVolume * volume.value, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + duration)
}

/** 轻微纸张翻页声，用于路由切换。 */
export function playPageTurnSound() {
  paperNoise(0.14, 420, 3600, 0.026)
  window.setTimeout(() => paperNoise(0.09, 720, 4200, 0.015), 46)
}

/** 低沉盖章声，用于申请、审批、归还与头像归档。 */
export function playStampSound() {
  tone(86, 48, 0.095, 0.055)
  paperNoise(0.055, 70, 920, 0.038)
}

/** 轻巧纸签声，用于收藏与开关确认。 */
export function playBookmarkSound() {
  paperNoise(0.052, 900, 4400, 0.019)
}
