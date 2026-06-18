import type { Card, Emotion, MatchedSummary } from '../src/types'

const STOP_WORDS = new Set([
  '的', '了', '和', '是', '就', '都', '而', '及', '与', '着',
  '或', '一个', '没有', '我们', '你们', '他们', '她们', '它们',
  '这个', '那个', '这些', '那些', '什么', '怎么', '为什么',
  '我', '你', '他', '她', '它', '在', '有', '不', '人', '说',
  '要', '去', '你', '会', '着', '没', '看', '好', '自己', '这',
  '那', '吧', '啊', '呢', '吗', '哦', '嗯', '哈', '呀', '哇',
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
  'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this',
  'that', 'these', 'those', 'of', 'to', 'in', 'for', 'on', 'with',
  'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
  'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 'just', 'also', 'now', 'up', 'down', 'about',
])

const EMOTION_KEYWORDS: Record<Emotion, string[]> = {
  happy: ['开心', '快乐', '高兴', '幸福', '愉快', '喜悦', '兴奋', '满足', '棒', '好', '喜欢', '爱', '笑', 'happy', 'joy', 'glad', 'love', 'great'],
  sad: ['难过', '伤心', '悲伤', '痛苦', '失落', '沮丧', '哭', '眼泪', '孤单', '寂寞', '绝望', 'sad', 'cry', 'tear', 'lonely', 'depress', 'grief'],
  anxious: ['焦虑', '紧张', '担心', '害怕', '不安', '忐忑', '烦躁', '压力', '恐', '慌', 'anxious', 'worry', 'stress', 'nervous', 'afraid', 'fear'],
  angry: ['生气', '愤怒', '恼火', '气愤', '烦躁', '讨厌', '恨', '不爽', '气', '怒', 'angry', 'mad', 'hate', 'rage', 'furious', 'irritate'],
  calm: ['平静', '放松', '安心', '宁静', '舒服', '自在', '淡定', '从容', '缓', '静', 'calm', 'peace', 'relax', 'serene', 'quiet', 'tranquil'],
  hopeful: ['期待', '希望', '憧憬', '向往', '期待', '加油', '相信', '未来', '梦', '想', 'hopeful', 'hope', 'wish', 'dream', 'future', 'expect'],
}

export function extractKeywords(text: string): Set<string> {
  const keywords = new Set<string>()
  const cleanText = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ')
  const segments: string[] = []
  
  const chineseMatches = cleanText.match(/[\u4e00-\u9fa5]{2,}/g) || []
  for (const match of chineseMatches) {
    for (let len = Math.min(4, match.length); len >= 2; len--) {
      for (let i = 0; i <= match.length - len; i++) {
        segments.push(match.substring(i, i + len))
      }
    }
  }
  
  const words = cleanText.split(/\s+/).filter(w => w.length >= 2)
  segments.push(...words)
  
  for (const seg of segments) {
    const word = seg.trim().toLowerCase()
    if (word && word.length >= 2 && !STOP_WORDS.has(word)) {
      keywords.add(word)
    }
  }
  
  return keywords
}

export function calculateSimilarity(
  keywords1: Set<string>,
  keywords2: Set<string>,
  emotion1: Emotion,
  emotion2: Emotion
): number {
  if (keywords1.size === 0 || keywords2.size === 0) {
    return emotion1 === emotion2 ? 0.3 : 0
  }
  
  let overlap = 0
  for (const kw of keywords1) {
    if (keywords2.has(kw)) {
      overlap++
    }
  }
  
  const jaccard = overlap / (keywords1.size + keywords2.size - overlap)
  
  const emotionBoost = emotion1 === emotion2 ? 0.25 : 0
  
  let keywordBoost = 0
  const emotion1Kws = EMOTION_KEYWORDS[emotion1] || []
  for (const kw of keywords2) {
    if (emotion1Kws.some(ek => kw.includes(ek) || ek.includes(kw))) {
      keywordBoost += 0.08
      break
    }
  }
  const emotion2Kws = EMOTION_KEYWORDS[emotion2] || []
  for (const kw of keywords1) {
    if (emotion2Kws.some(ek => kw.includes(ek) || ek.includes(kw))) {
      keywordBoost += 0.08
      break
    }
  }
  
  return Math.min(1, jaccard + emotionBoost + keywordBoost)
}

export function findTopMatches(
  inputText: string,
  emotion: Emotion,
  allCards: Card[],
  excludeId?: string,
  topN: number = 3
): { summaries: MatchedSummary[]; matchCount: number } {
  const inputKeywords = extractKeywords(inputText)
  
  const scored: { card: Card; score: number }[] = []
  
  for (const card of allCards) {
    if (excludeId && card.id === excludeId) continue
    
    const cardKeywords = extractKeywords(card.text)
    const score = calculateSimilarity(inputKeywords, cardKeywords, emotion, card.emotion)
    
    if (score > 0.05) {
      scored.push({ card, score })
    }
  }
  
  scored.sort((a, b) => b.score - a.score)
  
  const matchCount = scored.length
  
  const summaries: MatchedSummary[] = scored.slice(0, topN).map(({ card }) => ({
    id: card.id,
    text: card.text.length > 50 ? card.text.substring(0, 50) + '...' : card.text,
    emotion: card.emotion,
    timestamp: card.timestamp,
    likes: Math.floor(Math.random() * 20) + (card as any)._likes || 0,
  }))
  
  return { summaries, matchCount }
}

export function generateMockCards(): Card[] {
  const mockData: Array<{ text: string; emotion: Emotion }> = [
    { text: '今天阳光特别好，走在路上心情都变得轻盈起来了', emotion: 'happy' },
    { text: '感觉最近压力好大，晚上总是睡不着，脑子里全是未完成的事', emotion: 'anxious' },
    { text: '一个人在窗边听雨，泡了杯热茶，突然觉得世界很安静', emotion: 'calm' },
    { text: '被误解的感觉真的很难受，明明什么都没做错', emotion: 'sad' },
    { text: '下周要去见很久没见的朋友了，好期待那一天的到来', emotion: 'hopeful' },
    { text: '为什么总是有人喜欢在公共场合大声喧哗，真的太不尊重人了', emotion: 'angry' },
    { text: '今天完成了一个拖了很久的项目，终于可以松一口气了', emotion: 'happy' },
    { text: '深夜总是容易胡思乱想，想起很多已经离开的人和事', emotion: 'sad' },
    { text: '面试前紧张得手心冒汗，希望一切都能顺利吧', emotion: 'anxious' },
    { text: '今天尝试了冥想，二十分钟后感觉整个人都焕然一新', emotion: 'calm' },
    { text: '对未来的生活有很多期待，想学习新的技能，想去远方看看', emotion: 'hopeful' },
    { text: '电脑突然崩了，做了一下午的工作全没了，气到想砸键盘', emotion: 'angry' },
    { text: '收到了一束匿名的花，不知道是谁送的，但真的很开心', emotion: 'happy' },
    { text: '又一次在深夜emo，感觉自己好像什么都做不好', emotion: 'sad' },
    { text: '明天要做一个重要的演讲，反复练习但还是很紧张', emotion: 'anxious' },
    { text: '坐在公园的长椅上看着日落，时间仿佛都慢了下来', emotion: 'calm' },
    { text: '新买的书到了，迫不及待想翻开看看，期待能收获新的启发', emotion: 'hopeful' },
    { text: '排队被人插队了，说了还装作没听见，素质呢？', emotion: 'angry' },
    { text: '和老朋友聊了一整晚，回忆了好多学生时代的趣事', emotion: 'happy' },
    { text: '看了一部很感人的电影，散场后眼泪还止不住', emotion: 'sad' },
    { text: '最近总是担心父母的身体，他们年纪越来越大了', emotion: 'anxious' },
    { text: '给自己放了一天假，什么都不做，只是躺着发呆', emotion: 'calm' },
    { text: '相信一切都会越来越好的，努力不会被辜负', emotion: 'hopeful' },
    { text: '外卖又送错了，打电话过去态度还很差，无语', emotion: 'angry' },
  ]
  
  const now = Date.now()
  return mockData.map((d, i) => ({
    id: `mock-${i}`,
    text: d.text,
    emotion: d.emotion,
    timestamp: now - (mockData.length - i) * 1000 * 60 * 60 * (1 + Math.random() * 5),
    matchedSummaries: [],
    matchCount: Math.floor(Math.random() * 15) + 2,
    _likes: Math.floor(Math.random() * 15),
  } as Card & { _likes: number }))
}
