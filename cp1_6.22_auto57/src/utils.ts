import { v4 as uuidv4 } from 'uuid'

const USER_ID_KEY = 'music_taste_user_id'
const USER_NAME_KEY = 'music_taste_user_name'

export function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY)
  if (!userId) {
    userId = uuidv4()
    localStorage.setItem(USER_ID_KEY, userId)
  }
  return userId
}

export function getUserName(): string {
  return localStorage.getItem(USER_NAME_KEY) || ''
}

export function setUserName(name: string): void {
  localStorage.setItem(USER_NAME_KEY, name)
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  } else if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

export function coldToHotGradient(weight: number): string {
  const cold = { r: 49, g: 130, b: 206 }
  const hot = { r: 221, g: 107, b: 32 }
  
  const r = Math.round(cold.r + (hot.r - cold.r) * weight)
  const g = Math.round(cold.g + (hot.g - cold.g) * weight)
  const b = Math.round(cold.b + (hot.b - cold.b) * weight)
  
  return `rgb(${r}, ${g}, ${b})`
}

class AudioManager {
  private audioContext: AudioContext | null = null
  private currentOscillator: OscillatorNode | null = null
  private currentGain: GainNode | null = null
  private playingId: string | null = null

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.audioContext
  }

  play(songId: string): void {
    if (this.playingId === songId) {
      this.stop()
      return
    }

    this.stop()

    const ctx = this.getContext()
    const now = ctx.currentTime
    
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    const baseFreq = 200 + (Math.abs(songId.charCodeAt(0)) * 5) % 400
    
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(baseFreq, now)
    oscillator.frequency.setValueAtTime(baseFreq * 1.25, now + 0.25)
    oscillator.frequency.setValueAtTime(baseFreq * 1.5, now + 0.5)
    oscillator.frequency.setValueAtTime(baseFreq * 1.25, now + 0.75)
    oscillator.frequency.setValueAtTime(baseFreq, now + 1)
    oscillator.frequency.setValueAtTime(baseFreq * 1.33, now + 1.25)
    oscillator.frequency.setValueAtTime(baseFreq * 1.66, now + 1.5)
    oscillator.frequency.setValueAtTime(baseFreq * 1.33, now + 1.75)
    oscillator.frequency.setValueAtTime(baseFreq, now + 2)

    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.15, now + 0.1)
    gainNode.gain.setValueAtTime(0.15, now + 28)
    gainNode.gain.linearRampToValueAtTime(0, now + 30)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    oscillator.start(now)
    oscillator.stop(now + 30)

    this.currentOscillator = oscillator
    this.currentGain = gainNode
    this.playingId = songId

    oscillator.onended = () => {
      if (this.playingId === songId) {
        this.playingId = null
        this.currentOscillator = null
        this.currentGain = null
      }
    }
  }

  stop(): void {
    if (this.currentOscillator) {
      try {
        this.currentOscillator.stop()
      } catch (e) {}
      this.currentOscillator = null
    }
    if (this.currentGain) {
      this.currentGain = null
    }
    this.playingId = null
  }

  isPlaying(songId: string): boolean {
    return this.playingId === songId
  }
}

export const audioManager = new AudioManager()
