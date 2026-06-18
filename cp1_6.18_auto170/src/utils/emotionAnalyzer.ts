import type { EmotionDimensions } from '../store/emotionStore'

const joyKeywords = [
  '快乐', '开心', '高兴', '幸福', '兴奋', '愉快', '喜悦', '满足',
  '美好', '棒', '好', '喜欢', '爱', '灿烂', '微笑', '欢乐',
  'happy', 'joy', 'glad', 'love', 'great', 'nice', 'wonderful', 'excellent'
]

const sadnessKeywords = [
  '悲伤', '难过', '伤心', '痛苦', '失落', '沮丧', '孤单', '寂寞',
  '哭', '眼泪', '忧伤', '哀愁', '绝望', '心碎',
  'sad', 'sadness', 'cry', 'lonely', 'upset', 'depressed', 'heartbroken'
]

const angerKeywords = [
  '愤怒', '生气', '恼火', '暴躁', '不满', '气愤', '烦躁', '讨厌',
  '恨', '怒火', '抓狂', '不爽', '气恼',
  'angry', 'anger', 'hate', 'mad', 'frustrated', 'annoyed', 'furious'
]

const calmKeywords = [
  '平静', '安宁', '放松', '舒适', '祥和', '宁静', '安稳', '平和',
  '淡定', '从容', '悠闲', '自在', '安心', '静谧',
  'calm', 'peaceful', 'relaxed', 'serene', 'quiet', 'tranquil', 'at ease'
]

const anxietyKeywords = [
  '焦虑', '紧张', '担心', '害怕', '恐惧', '不安', '担忧', '压力',
  '烦躁', '心慌', '焦虑', '忐忑', '忧心', '恐慌',
  'anxiety', 'anxious', 'worried', 'nervous', 'stress', 'scared', 'afraid', 'panic'
]

export function analyzeEmotions(text: string): EmotionDimensions {
  const lowerText = text.toLowerCase()
  
  const countKeywords = (keywords: string[]) => {
    let count = 0
    keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi')
      const matches = lowerText.match(regex)
      if (matches) count += matches.length
    })
    return count
  }

  const joyCount = countKeywords(joyKeywords)
  const sadnessCount = countKeywords(sadnessKeywords)
  const angerCount = countKeywords(angerKeywords)
  const calmCount = countKeywords(calmKeywords)
  const anxietyCount = countKeywords(anxietyKeywords)

  const totalCount = joyCount + sadnessCount + angerCount + calmCount + anxietyCount
  
  if (totalCount === 0) {
    return { joy: 0.4, sadness: 0.3, anger: 0.2, calm: 0.5, anxiety: 0.3 }
  }

  const normalize = (value: number) => Math.min(1, Math.max(0.1, value / totalCount * 2.5))

  return {
    joy: normalize(joyCount),
    sadness: normalize(sadnessCount),
    anger: normalize(angerCount),
    calm: normalize(calmCount),
    anxiety: normalize(anxietyCount)
  }
}
