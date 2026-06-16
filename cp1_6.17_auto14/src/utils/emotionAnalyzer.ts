import axios from 'axios'

export interface EmotionInput {
  keywords: string[]
  description: string
}

export interface EmotionVector {
  label: string
  intensity: number
}

export interface AnalyzeResult {
  polarity: 'positive' | 'negative' | 'neutral'
  polarityScore: number
  emotions: EmotionVector[]
  dominantEmotion: string
}

export interface Note {
  pitch: number
  duration: number
  startTime: number
  track: 'melody' | 'chord' | 'bass'
  velocity?: number
}

export interface SheetMusic {
  id: string
  bpm: number
  bars: number
  timeSignature: [number, number]
  notes: Note[]
  chordProgression: string[]
  emotions: EmotionVector[]
  duration: number
}

export interface HistoryItem {
  id: string
  keywords: string[]
  description: string
  createdAt: number
  bpm: number
  duration: number
  analyzeResult: AnalyzeResult
  sheetMusic: SheetMusic
}

const VALID_EMOTIONS = [
  '兴奋', '快乐', '愉悦', '欢欣', '激动', '热情',
  '焦虑', '紧张', '不安', '担忧', '恐惧', '害怕',
  '疲惫', '困倦', '慵懒', '放松', '平静', '安宁',
  '怀旧', '思念', '感伤', '忧郁', '悲伤', '难过',
  '浪漫', '温馨', '甜蜜', '梦幻', '神秘', '庄严'
]

function normalizeKeyword(kw: string): string {
  const trimmed = kw.trim()
  if (!trimmed) return ''
  const match = VALID_EMOTIONS.find(
    (e) => e === trimmed || e.includes(trimmed) || trimmed.includes(e)
  )
  return match || trimmed
}

export function validateEmotionInput(input: EmotionInput): { valid: boolean; error?: string } {
  if (!input.keywords || input.keywords.length === 0) {
    return { valid: false, error: '请至少输入一个情绪关键词' }
  }
  if (input.keywords.length > 3) {
    return { valid: false, error: '最多只能输入3个情绪关键词' }
  }
  const cleanedKeywords = input.keywords
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
  if (cleanedKeywords.length === 0) {
    return { valid: false, error: '情绪关键词不能为空' }
  }
  for (const kw of cleanedKeywords) {
    if (kw.length > 10) {
      return { valid: false, error: `关键词"${kw}"过长（最多10个字符）` }
    }
  }
  const descLen = (input.description || '').trim().length
  if (descLen < 50) {
    return { valid: false, error: `描述文本过短（当前${descLen}字，至少需要50字）` }
  }
  if (descLen > 200) {
    return { valid: false, error: `描述文本过长（当前${descLen}字，最多200字）` }
  }
  return { valid: true }
}

export function formatInputForApi(input: EmotionInput) {
  const normalizedKeywords = input.keywords
    .map((k) => normalizeKeyword(k))
    .filter((k) => k.length > 0)
    .slice(0, 3)

  return {
    keywords: normalizedKeywords,
    description: input.description.trim(),
  }
}

export async function analyzeEmotion(input: EmotionInput): Promise<AnalyzeResult> {
  const validation = validateEmotionInput(input)
  if (!validation.valid) {
    throw new Error(validation.error)
  }
  const payload = formatInputForApi(input)
  try {
    const response = await axios.post('/api/analyze', payload, {
      timeout: 3000,
    })
    return response.data as AnalyzeResult
  } catch (error) {
    if (axios.isAxiosError(error) && !error.response) {
      throw new Error('无法连接到后端服务器，请确保后端已启动')
    }
    throw error
  }
}

export async function generateMusic(
  analyzeResult: AnalyzeResult
): Promise<SheetMusic> {
  try {
    const response = await axios.post(
      '/api/generate',
      { emotions: analyzeResult.emotions, dominant_emotion: analyzeResult.dominantEmotion },
      { timeout: 3000 }
    )
    const data = response.data
    return {
      ...data,
      emotions: analyzeResult.emotions,
    } as SheetMusic
  } catch (error) {
    if (axios.isAxiosError(error) && !error.response) {
      throw new Error('无法连接到后端服务器，请确保后端已启动')
    }
    throw error
  }
}

export function createHistoryItem(
  input: EmotionInput,
  analyzeResult: AnalyzeResult,
  sheetMusic: SheetMusic
): HistoryItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    keywords: input.keywords.map((k) => k.trim()).filter((k) => k),
    description: input.description.trim(),
    createdAt: Date.now(),
    bpm: sheetMusic.bpm,
    duration: sheetMusic.duration,
    analyzeResult,
    sheetMusic,
  }
}
