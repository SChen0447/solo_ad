export interface SentenceEmotion {
  sentence: string
  score: number
  positive: number
  negative: number
  surprise: number
  anger: number
}

const positiveWords: string[] = [
  'happy', 'love', 'joy', 'wonderful', 'excellent', 'amazing', 'great', 'fantastic',
  'beautiful', 'delightful', 'cheerful', 'brilliant', 'awesome', 'nice', 'pleasant',
  'glad', 'pleased', 'satisfied', 'grateful', 'hopeful', 'inspired', 'peaceful',
  'excited', 'thrilled', 'content', 'blessed', 'proud', 'confident', 'optimistic', 'calm'
]

const negativeWords: string[] = [
  'sad', 'anger', 'hate', 'terrible', 'awful', 'miserable', 'depressed', 'angry',
  'horrible', 'disgusting', 'painful', 'sorrow', 'grief', 'fear', 'anxious',
  'worried', 'stressed', 'frustrated', 'disappointed', 'lonely', 'empty', 'hopeless',
  'desperate', 'regret', 'ashamed', 'guilty', 'jealous', 'insecure', 'worthless', 'defeated'
]

const surpriseWords: string[] = [
  'surprise', 'wow', 'amazing', 'incredible', 'unbelievable', 'shock', 'astonish',
  'astound', 'stun', 'marvel', 'wonder', 'sudden', 'unexpected', 'omg', 'whoa'
]

const angerWords: string[] = [
  'anger', 'angry', 'furious', 'rage', 'outrage', 'wrath', 'resent', 'hate',
  'loathe', 'detest', 'irritate', 'annoy', 'frustrate', 'enrage', 'infuriate'
]

function countMatches(text: string, words: string[]): number {
  const lowerText = text.toLowerCase()
  let count = 0
  for (const word of words) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi')
    const matches = lowerText.match(regex)
    if (matches) {
      count += matches.length
    }
  }
  return count
}

export function analyzeEmotion(text: string): SentenceEmotion[] {
  const sentences = text
    .split(/[.!?。！？]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  return sentences.map(sentence => {
    const positive = countMatches(sentence, positiveWords)
    const negative = countMatches(sentence, negativeWords)
    const surprise = countMatches(sentence, surpriseWords)
    const anger = countMatches(sentence, angerWords)

    const total = positive + negative + 1
    let score = (positive - negative) / total
    score = Math.max(-1, Math.min(1, score))

    return {
      sentence,
      score,
      positive,
      negative,
      surprise,
      anger
    }
  })
}

export function aggregateEmotions(emotions: SentenceEmotion[]): {
  positive: number
  negative: number
  surprise: number
  anger: number
} {
  if (emotions.length === 0) {
    return { positive: 0, negative: 0, surprise: 0, anger: 0 }
  }

  let positive = 0
  let negative = 0
  let surprise = 0
  let anger = 0

  for (const e of emotions) {
    positive += e.positive
    negative += e.negative
    surprise += e.surprise
    anger += e.anger
  }

  const total = positive + negative + surprise + anger || 1
  return {
    positive: positive / total,
    negative: negative / total,
    surprise: surprise / total,
    anger: anger / total
  }
}
