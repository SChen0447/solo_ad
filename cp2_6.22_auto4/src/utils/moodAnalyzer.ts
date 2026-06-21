export interface Keyword {
  text: string;
  weight: number;
}

export interface MoodResult {
  color: string;
  keywords: Keyword[];
  moodName: string;
}

type MoodType = 'joyful' | 'happy' | 'peaceful' | 'neutral' | 'sad' | 'anxious' | 'angry';

const MOOD_PALETTE: Record<MoodType, string> = {
  joyful: '#FDE68A',
  happy: '#A7F3D0',
  peaceful: '#BFDBFE',
  neutral: '#E5E7EB',
  sad: '#DDD6FE',
  anxious: '#FECACA',
  angry: '#FCA5A5',
};

const MOOD_KEYWORDS: Record<MoodType, string[]> = {
  joyful: ['开心', '快乐', '喜悦', '兴奋', '激动', 'happy', 'joy', 'excited', '太棒了', '太好了', '高兴', '愉快'],
  happy: ['满意', '幸福', '美好', '温暖', '舒服', '满足', 'delighted', 'content', 'pleasant', '不错', '好的', '还行'],
  peaceful: ['平静', '安静', '放松', '安宁', '悠闲', '从容', 'peaceful', 'calm', 'relaxed', '宁静', '悠然', '舒缓'],
  neutral: ['一般', '普通', '平淡', '正常', '日常', 'usual', 'normal', 'ordinary', '平常', '日常', '差不多'],
  sad: ['难过', '伤心', '失落', '沮丧', '忧伤', '遗憾', 'sad', 'unhappy', 'depressed', 'down', '委屈', '孤独'],
  anxious: ['焦虑', '担心', '紧张', '不安', '压力', '忧虑', 'anxious', 'worried', 'stressed', 'nervous', '心烦', '着急'],
  angry: ['生气', '愤怒', '恼火', '烦躁', '讨厌', '不满', 'angry', 'furious', 'annoyed', 'mad', '气人', '不爽'],
};

const STOP_WORDS = new Set([
  '的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '这个', '那个', '他', '她', '它', '们', '还', '但', '但是',
  '而', '与', '及', '或', '如果', '因为', '所以', '之', '于', '以', '为', 'the',
  'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'and', 'or', 'but', 'if', 'because', 'as', 'of', 'at', 'by', 'for', 'with',
  'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
  'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'also', 'now'
]);

function tokenize(text: string): string[] {
  const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z\s]/g, ' ');
  const tokens: string[] = [];

  const chineseChars = cleaned.match(/[\u4e00-\u9fa5]+/g) || [];
  chineseChars.forEach(segment => {
    for (let len = 4; len >= 2; len--) {
      for (let i = 0; i + len <= segment.length; i++) {
        tokens.push(segment.slice(i, i + len));
      }
    }
    for (const char of segment) {
      tokens.push(char);
    }
  });

  const englishWords = cleaned.match(/[a-zA-Z]+/g) || [];
  englishWords.forEach(word => {
    const lower = word.toLowerCase();
    if (lower.length >= 2) {
      tokens.push(lower);
    }
  });

  return tokens.filter(t => !STOP_WORDS.has(t) && t.trim().length > 0);
}

export function analyzeMood(text: string): MoodResult {
  const startTime = performance.now();
  const lowerText = text.toLowerCase();
  const moodScores: Record<MoodType, number> = {
    joyful: 0, happy: 0, peaceful: 0, neutral: 1, sad: 0, anxious: 0, angry: 0,
  };

  for (const mood of Object.keys(MOOD_KEYWORDS) as MoodType[]) {
    for (const keyword of MOOD_KEYWORDS[mood]) {
      const matches = lowerText.match(new RegExp(keyword.toLowerCase(), 'g'));
      if (matches) {
        moodScores[mood] += matches.length * keyword.length;
      }
    }
  }

  let dominantMood: MoodType = 'neutral';
  let highestScore = -1;
  for (const mood of Object.keys(moodScores) as MoodType[]) {
    if (moodScores[mood] > highestScore) {
      highestScore = moodScores[mood];
      dominantMood = mood;
    }
  }

  const tokens = tokenize(text);
  const freqMap = new Map<string, number>();
  tokens.forEach(token => {
    freqMap.set(token, (freqMap.get(token) || 0) + 1);
  });

  const sorted = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const maxFreq = sorted.length > 0 ? sorted[0][1] : 1;
  const keywords: Keyword[] = sorted.map(([text, freq]) => ({
    text,
    weight: 0.4 + (freq / maxFreq) * 0.6,
  }));

  if (keywords.length < 5) {
    const moodWords = MOOD_KEYWORDS[dominantMood].slice(0, 5 - keywords.length);
    moodWords.forEach(w => {
      if (!keywords.find(k => k.text === w)) {
        keywords.push({ text: w, weight: 0.3 + Math.random() * 0.3 });
      }
    });
  }

  const elapsed = performance.now() - startTime;
  if (elapsed > 90) {
    console.warn(`[moodAnalyzer] analyzeMood took ${elapsed.toFixed(1)}ms`);
  }

  const moodNames: Record<MoodType, string> = {
    joyful: '欢快', happy: '开心', peaceful: '平静',
    neutral: '平淡', sad: '忧伤', anxious: '焦虑', angry: '烦躁'
  };

  return {
    color: MOOD_PALETTE[dominantMood],
    keywords,
    moodName: moodNames[dominantMood],
  };
}
