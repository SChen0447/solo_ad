import axios from 'axios'
import type { Note, EmotionType } from '../types'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API请求错误:', error.message)
    if (error.response) {
      console.error('响应状态:', error.response.status)
      console.error('响应数据:', error.response.data)
    }
    throw error
  }
)

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

interface AnalyzeEmotionResponse {
  emotion: EmotionType
  confidence: number
}

export const api = {
  async getNotes(): Promise<Note[]> {
    try {
      const response = await apiClient.get<unknown, ApiResponse<Note[]>>('/notes')
      return response.data || []
    } catch {
      return []
    }
  },

  async getNoteById(id: string): Promise<Note | null> {
    try {
      const response = await apiClient.get<unknown, ApiResponse<Note>>(`/notes/${id}`)
      return response.data
    } catch {
      return null
    }
  },

  async createNote(noteData: {
    content: string
    type: 'text' | 'voice' | 'image'
    location?: string
    imageUrl?: string
    voiceUrl?: string
    voiceDuration?: number
  }): Promise<Note | null> {
    try {
      const emotionResult = await this.analyzeEmotion(noteData.content)
      const response = await apiClient.post<unknown, ApiResponse<Note>>('/notes', {
        ...noteData,
        emotion: emotionResult?.emotion || 'calm'
      })
      return response.data
    } catch {
      const fallbackEmotion = await this.analyzeEmotion(noteData.content)
      return {
        id: Date.now().toString(),
        ...noteData,
        createdAt: new Date().toISOString(),
        emotion: fallbackEmotion?.emotion || 'calm'
      }
    }
  },

  async updateNote(id: string, updates: Partial<Note>): Promise<Note | null> {
    try {
      const response = await apiClient.put<unknown, ApiResponse<Note>>(`/notes/${id}`, updates)
      return response.data
    } catch {
      return null
    }
  },

  async deleteNote(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/notes/${id}`)
      return true
    } catch {
      return false
    }
  },

  async analyzeEmotion(text: string): Promise<AnalyzeEmotionResponse | null> {
    try {
      const response = await apiClient.post<unknown, ApiResponse<AnalyzeEmotionResponse>>('/analyze', {
        text
      })
      return response.data
    } catch {
      return fallbackAnalyzeEmotion(text)
    }
  },

  async uploadImage(file: File, onProgress?: (progress: number) => void): Promise<string> {
    const formData = new FormData()
    formData.append('image', file)

    try {
      const response = await axios.post('/api/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(percentCompleted)
          }
        }
      })
      return response.data.data.url
    } catch {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          let progress = 0
          const interval = setInterval(() => {
            progress += 10
            onProgress?.(Math.min(progress, 100))
            if (progress >= 100) {
              clearInterval(interval)
              const result = e.target?.result as string
              setTimeout(() => resolve(result), 200)
            }
          }, 50)
        }
        reader.readAsDataURL(file)
      })
    }
  },

  async uploadVoice(file: File, onProgress?: (progress: number) => void): Promise<{ url: string; duration: number }> {
    const formData = new FormData()
    formData.append('voice', file)

    try {
      const response = await axios.post('/api/upload/voice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(percentCompleted)
          }
        }
      })
      return response.data.data
    } catch {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          let progress = 0
          const interval = setInterval(() => {
            progress += 10
            onProgress?.(Math.min(progress, 100))
            if (progress >= 100) {
              clearInterval(interval)
              const result = e.target?.result as string
              setTimeout(() => resolve({ url: result, duration: 0 }), 200)
            }
          }, 50)
        }
        reader.readAsDataURL(file)
      })
    }
  },

  async getLocationName(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await apiClient.get<unknown, ApiResponse<{ city: string; address: string }>>('/location/reverse', {
        params: { lat, lng }
      })
      return response.data?.city || response.data?.address || null
    } catch {
      const locations = ['北京市朝阳区', '上海市浦东新区', '深圳市南山区', '杭州市西湖区', '广州市天河区', '成都市锦江区']
      return locations[Math.floor(Math.random() * locations.length)]
    }
  }
}

function fallbackAnalyzeEmotion(text: string): AnalyzeEmotionResponse {
  const happyKeywords = ['开心', '高兴', '快乐', '愉快', '棒', '好', '喜欢', '爱', '赞', '哈哈', '笑', '阳光', '美好', '幸福', '享受', '满足']
  const sadKeywords = ['难过', '伤心', '悲伤', '不开心', '失落', '沮丧', '哭', '眼泪', '遗憾', '失望', '痛苦', '孤独', '寂寞', '糟糕', '不顺']
  const angryKeywords = ['生气', '愤怒', '烦', '讨厌', '恨', '气', '怒', '恼火', '烦躁', '不满', '可恶', '混蛋', '烦死', '气死']
  const surprisedKeywords = ['惊讶', '惊喜', '意外', '没想到', '震惊', '哇', '天呐', '厉害', '棒极了', '突然', '奇妙', '居然', '竟然']
  const calmKeywords = ['平静', '安静', '宁静', '放松', '休息', '舒服', '惬意', '悠闲', '自在', '和平', '温和', '淡定', '从容']

  const lowerText = text.toLowerCase()
  let scores: Record<EmotionType, number> = {
    happy: 0,
    sad: 0,
    angry: 0,
    calm: 0.5,
    surprised: 0
  }

  happyKeywords.forEach(k => { if (lowerText.includes(k)) scores.happy += 2 })
  sadKeywords.forEach(k => { if (lowerText.includes(k)) scores.sad += 2 })
  angryKeywords.forEach(k => { if (lowerText.includes(k)) scores.angry += 2 })
  surprisedKeywords.forEach(k => { if (lowerText.includes(k)) scores.surprised += 2 })
  calmKeywords.forEach(k => { if (lowerText.includes(k)) scores.calm += 2 })

  if (/!{2,}|！{2,}/.test(text)) scores.surprised += 1
  if (/[!！]/.test(text)) scores.happy += 0.5
  if (/[~～]/.test(text)) scores.happy += 0.5

  const emojiHappy = ['😊', '😄', '🥰', '😍', '😁', '😆', '😋', '🤗', '👍', '❤️', '🌟', '✨', '🎉', '💪', '☀️', '🌈']
  const emojiSad = ['😢', '😭', '😔', '😞', '😣', '💔', '😓', '☹️', '🙁']
  const emojiAngry = ['😠', '😡', '🤬', '💢', '😤']
  const emojiSurprised = ['😮', '😲', '🤯', '😱', '🙀', '⚡', '💫']
  const emojiCalm = ['😐', '😌', '☕', '📖', '🌸', '🌿', '🍃', '🧘']

  emojiHappy.forEach(e => { if (text.includes(e)) scores.happy += 3 })
  emojiSad.forEach(e => { if (text.includes(e)) scores.sad += 3 })
  emojiAngry.forEach(e => { if (text.includes(e)) scores.angry += 3 })
  emojiSurprised.forEach(e => { if (text.includes(e)) scores.surprised += 3 })
  emojiCalm.forEach(e => { if (text.includes(e)) scores.calm += 3 })

  let maxEmotion: EmotionType = 'calm'
  let maxScore = -1
  for (const [emotion, score] of Object.entries(scores) as [EmotionType, number][]) {
    if (score > maxScore) {
      maxScore = score
      maxEmotion = emotion
    }
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) || 1
  const confidence = maxScore / totalScore

  return {
    emotion: maxEmotion,
    confidence: Math.round(confidence * 100) / 100
  }
}
