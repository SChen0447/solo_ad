export interface EmotionAnalysisResult {
  baseColor: 'warm' | 'cool';
  warmHex: string;
  coolHex: string;
  keywordGroups: KeywordGroup[];
}

export interface KeywordGroup {
  keyword: string;
  motionType: MotionType;
  particleRatio: number;
}

export type MotionType =
  | 'upward_slow'
  | 'wave_horizontal'
  | 'spiral'
  | 'float_hover'
  | 'drift_forward'
  | 'ripple'
  | 'default';

const warmKeywords: ReadonlyArray<string> = [
  '喜', '悦', '欢', '笑', '明', '阳', '暖', '春', '夏', '花',
  '红', '橙', '火', '热', '光', '朝', '霞', '夕', '阳', '灿',
  '烂', '豪', '雄', '壮', '烈', '热', '爱', '甜', '美', '乐'
];

const coolKeywords: ReadonlyArray<string> = [
  '忧', '愁', '哀', '伤', '悲', '冷', '寒', '冬', '秋', '夜',
  '月', '霜', '雪', '雨', '风', '蓝', '紫', '青', '墨', '寂',
  '静', '深', '幽', '远', '孤', '独', '凉', '凄', '思', '念'
];

const semanticMotionMap: Readonly<Record<string, MotionType>> = {
  '山': 'upward_slow',
  '峰': 'upward_slow',
  '云': 'float_hover',
  '雾': 'float_hover',
  '烟': 'float_hover',
  '水': 'wave_horizontal',
  '河': 'wave_horizontal',
  '江': 'wave_horizontal',
  '海': 'wave_horizontal',
  '湖': 'wave_horizontal',
  '波': 'wave_horizontal',
  '浪': 'wave_horizontal',
  '风': 'drift_forward',
  '雨': 'ripple',
  '雪': 'ripple',
  '花': 'spiral',
  '月': 'float_hover',
  '星': 'spiral',
  '天': 'upward_slow',
  '日': 'spiral',
  '光': 'spiral',
  '火': 'spiral',
  '林': 'upward_slow',
  '树': 'upward_slow',
  '木': 'upward_slow',
  '叶': 'ripple',
  '鸟': 'drift_forward',
  '飞': 'drift_forward',
  '舞': 'spiral',
  '梦': 'float_hover',
  '心': 'float_hover',
  '情': 'float_hover',
  '春': 'spiral',
  '夏': 'spiral',
  '秋': 'ripple',
  '冬': 'float_hover',
  '朝': 'spiral',
  '暮': 'float_hover',
  '夜': 'float_hover'
};

export function analyzeEmotion(text: string): EmotionAnalysisResult {
  const cleanText = text.replace(/\s/g, '');

  let warmCount = 0;
  let coolCount = 0;

  for (const char of cleanText) {
    if (warmKeywords.includes(char)) warmCount++;
    if (coolKeywords.includes(char)) coolCount++;
  }

  const baseColor: 'warm' | 'cool' = warmCount >= coolCount ? 'warm' : 'cool';

  const foundKeywords = new Map<string, number>();

  for (const [keyword, motion] of Object.entries(semanticMotionMap)) {
    let count = 0;
    let idx = cleanText.indexOf(keyword);
    while (idx !== -1) {
      count++;
      idx = cleanText.indexOf(keyword, idx + 1);
    }
    if (count > 0) {
      foundKeywords.set(keyword, count);
    }
  }

  const keywordGroups: KeywordGroup[] = [];
  const totalCount = Array.from(foundKeywords.values()).reduce((sum, n) => sum + n, 0);

  if (totalCount > 0) {
    const entries = Array.from(foundKeywords.entries()).sort((a, b) => b[1] - a[1]);
    const topEntries = entries.slice(0, 4);
    const adjustedTotal = topEntries.reduce((sum, [, n]) => sum + n, 0);

    for (const [keyword, count] of topEntries) {
      keywordGroups.push({
        keyword,
        motionType: semanticMotionMap[keyword] ?? 'default',
        particleRatio: count / adjustedTotal
      });
    }
  } else {
    keywordGroups.push({
      keyword: cleanText.slice(0, 4) || '文字',
      motionType: 'default',
      particleRatio: 1
    });
  }

  return {
    baseColor,
    warmHex: '#ff6b35',
    coolHex: '#667eea',
    keywordGroups
  };
}
