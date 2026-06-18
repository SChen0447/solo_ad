export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface SentimentResult {
  sentiment: Sentiment;
  confidence: number;
  matchedKeywords: string[];
}

const POSITIVE_WORDS = [
  '开心', '快乐', '幸福', '美好', '温暖', '治愈', '希望', '成功', '胜利', '爱',
  '喜欢', '感谢', '感动', '惊喜', '期待', '梦想', '阳光', '笑容', '甜蜜', '温柔',
  '勇敢', '坚强', '自由', '和平', '和谐', '精彩', '完美', '优秀', '努力', '成长',
  'happy', 'joy', 'love', 'hope', 'success', 'win', 'beautiful', 'wonderful', 'great',
  'amazing', 'excellent', 'fantastic', 'brilliant', 'cheerful', 'smile', 'sunshine',
  '笑', '好', '赞', '棒', '美', '甜', '暖', '萌', '燃', '飒',
  '哈哈哈', '嘻嘻', '嘿嘿', '哈哈',
];

const NEGATIVE_WORDS = [
  '难过', '悲伤', '痛苦', '失落', '绝望', '恐惧', '害怕', '愤怒', '生气', '讨厌',
  '失败', '哭泣', '眼泪', '孤独', '寂寞', '焦虑', '压力', '疲惫', '失望', '遗憾',
  '黑暗', '死亡', '危险', '邪恶', '残忍', '欺骗', '背叛', '离开', '结束', '破碎',
  'sad', 'pain', 'fear', 'anger', 'hate', 'fail', 'cry', 'lonely', 'lost', 'dark',
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'negative', 'stress', 'tired',
  '哭', '痛', '怕', '恨', '死', '血', '伤', '惨', '难', '愁',
  '呜呜', '啊啊', '唉', '哎',
];

const INTENSIFIERS = [
  '非常', '特别', '十分', '极其', '超级', '太', '真的', '简直', '绝对',
  'very', 'super', 'extremely', 'absolutely', 'so', 'really',
];

const NEGATIONS = [
  '不', '没', '没有', '无', '非', '不是', '并未', '并不', '不会',
  'not', "don't", "doesn't", "didn't", "won't", "isn't", "aren't",
];

function countMatches(text: string, words: string[]): { count: number; matched: string[] } {
  let count = 0;
  const matched: string[] = [];
  const lowerText = text.toLowerCase();

  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (lowerText.includes(lowerWord)) {
      const occurrences = (lowerText.match(new RegExp(lowerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      count += occurrences;
      if (!matched.includes(word) && occurrences > 0) {
        matched.push(word);
      }
    }
  }

  return { count, matched };
}

function hasIntensifierNear(text: string, keyword: string): boolean {
  const lowerText = text.toLowerCase();
  const idx = lowerText.indexOf(keyword.toLowerCase());
  if (idx === -1) return false;

  const windowStart = Math.max(0, idx - 6);
  const windowText = lowerText.slice(windowStart, idx);

  return INTENSIFIERS.some(int => windowText.includes(int.toLowerCase()));
}

function hasNegationNear(text: string, keyword: string): boolean {
  const lowerText = text.toLowerCase();
  const idx = lowerText.indexOf(keyword.toLowerCase());
  if (idx === -1) return false;

  const windowStart = Math.max(0, idx - 4);
  const windowText = lowerText.slice(windowStart, idx);

  return NEGATIONS.some(neg => windowText.includes(neg.toLowerCase()));
}

export function analyzeSentiment(text: string): SentimentResult {
  if (!text || text.trim().length === 0) {
    return { sentiment: 'neutral', confidence: 0.5, matchedKeywords: [] };
  }

  const positive = countMatches(text, POSITIVE_WORDS);
  const negative = countMatches(text, NEGATIVE_WORDS);

  let positiveScore = positive.count;
  let negativeScore = negative.count;

  for (const kw of positive.matched) {
    if (hasIntensifierNear(text, kw)) {
      positiveScore += 1.5;
    }
    if (hasNegationNear(text, kw)) {
      positiveScore -= 1;
      negativeScore += 0.5;
    }
  }

  for (const kw of negative.matched) {
    if (hasIntensifierNear(text, kw)) {
      negativeScore += 1.5;
    }
    if (hasNegationNear(text, kw)) {
      negativeScore -= 1;
      positiveScore += 0.5;
    }
  }

  const exclamationCount = (text.match(/[!！]/g) || []).length;
  const questionCount = (text.match(/[?？]/g) || []).length;
  const emojiBonus = (text.match(/[😊😄🥰😍😎🤩🥳😇🤗]/g) || []).length * 0.8;
  const emojiPenalty = (text.match(/[😢😭😠😡🤬😨😰😱😞]/g) || []).length * 0.8;

  positiveScore += emojiBonus;
  negativeScore += emojiPenalty;

  if (exclamationCount > 0 && positiveScore > negativeScore) {
    positiveScore += exclamationCount * 0.3;
  }
  if (exclamationCount > 0 && negativeScore > positiveScore) {
    negativeScore += exclamationCount * 0.3;
  }

  const total = positiveScore + negativeScore + 0.01;
  const confidence = Math.min(1, Math.max(0, Math.abs(positiveScore - negativeScore) / (total + 0.5)));

  let sentiment: Sentiment = 'neutral';
  if (positiveScore > negativeScore + 0.3) {
    sentiment = 'positive';
  } else if (negativeScore > positiveScore + 0.3) {
    sentiment = 'negative';
  }

  return {
    sentiment,
    confidence: Math.round(confidence * 100) / 100,
    matchedKeywords: [...positive.matched, ...negative.matched].slice(0, 10),
  };
}

export interface MusicSuggestion {
  id: string;
  name: string;
  style: string;
  description: string;
  bpm: number;
  instruments: string[];
}

const MUSIC_BY_SENTIMENT: Record<Sentiment, MusicSuggestion[]> = {
  positive: [
    {
      id: 'piano-light',
      name: '轻快钢琴',
      style: 'piano',
      description: '明亮的钢琴旋律，适合温暖、快乐的场景',
      bpm: 100,
      instruments: ['piano', 'piano'],
    },
    {
      id: 'electronic-beat',
      name: '电子鼓点',
      style: 'electronic',
      description: '活力满满的电子节拍，适合动感、酷炫的画面',
      bpm: 128,
      instruments: ['synth', 'drum'],
    },
    {
      id: 'acoustic-guitar',
      name: '吉他弹唱',
      style: 'guitar',
      description: '清新的木吉他伴奏，适合生活记录类内容',
      bpm: 90,
      instruments: ['guitar', 'bass'],
    },
  ],
  negative: [
    {
      id: 'string-pad-sad',
      name: '忧郁弦乐',
      style: 'strings',
      description: '低沉的弦乐铺底，营造悲伤、沉思的氛围',
      bpm: 70,
      instruments: ['cello', 'viola'],
    },
    {
      id: 'suspense-ambient',
      name: '悬疑氛围',
      style: 'ambient',
      description: '不协和音程与低频音效，制造紧张、悬念感',
      bpm: 80,
      instruments: ['synth', 'drum'],
    },
    {
      id: 'piano-slow',
      name: '慢板钢琴',
      style: 'piano',
      description: '缓慢柔和的钢琴音符，适合回忆、抒情段落',
      bpm: 60,
      instruments: ['piano', 'piano'],
    },
  ],
  neutral: [
    {
      id: 'string-pad',
      name: '弦乐铺底',
      style: 'strings',
      description: '温和的弦乐氛围，适合叙事、纪录片风格',
      bpm: 85,
      instruments: ['violin', 'cello'],
    },
    {
      id: 'ambient-minimal',
      name: '极简氛围',
      style: 'ambient',
      description: '干净的环境音效，不抢戏但增加质感',
      bpm: 75,
      instruments: ['synth', 'synth'],
    },
    {
      id: 'lofi-beat',
      name: 'Lo-Fi节拍',
      style: 'lofi',
      description: '轻松慵懒的低保真鼓点，适合解说、Vlog',
      bpm: 85,
      instruments: ['drum', 'bass'],
    },
  ],
};

export function getMusicSuggestions(sentiment: Sentiment): MusicSuggestion[] {
  return MUSIC_BY_SENTIMENT[sentiment].map(s => ({ ...s, id: `${s.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }));
}
