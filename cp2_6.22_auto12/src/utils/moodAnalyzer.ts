import { MoodAnalysisResult } from '../types';

const positiveWords: { word: string; weight: number }[] = [
  { word: '开心', weight: 3 },
  { word: '快乐', weight: 3 },
  { word: '高兴', weight: 3 },
  { word: '幸福', weight: 4 },
  { word: '美好', weight: 3 },
  { word: '喜欢', weight: 2 },
  { word: '爱', weight: 3 },
  { word: '感恩', weight: 4 },
  { word: '感谢', weight: 3 },
  { word: '满意', weight: 2 },
  { word: '满足', weight: 3 },
  { word: '愉快', weight: 3 },
  { word: '惊喜', weight: 3 },
  { word: '期待', weight: 2 },
  { word: '希望', weight: 3 },
  { word: '阳光', weight: 2 },
  { word: '温暖', weight: 2 },
  { word: '成功', weight: 3 },
  { word: '很棒', weight: 3 },
  { word: '优秀', weight: 3 },
  { word: '有趣', weight: 2 },
  { word: '兴奋', weight: 3 },
  { word: '平静', weight: 1 },
  { word: '安心', weight: 2 },
  { word: '舒适', weight: 2 },
  { word: '轻松', weight: 2 },
  { word: '顺利', weight: 2 },
  { word: '完美', weight: 4 },
  { word: '棒', weight: 2 },
  { word: '好', weight: 1 },
];

const negativeWords: { word: string; weight: number }[] = [
  { word: '难过', weight: 3 },
  { word: '伤心', weight: 3 },
  { word: '悲伤', weight: 4 },
  { word: '痛苦', weight: 4 },
  { word: '焦虑', weight: 3 },
  { word: '紧张', weight: 2 },
  { word: '害怕', weight: 3 },
  { word: '恐惧', weight: 4 },
  { word: '生气', weight: 3 },
  { word: '愤怒', weight: 4 },
  { word: '烦恼', weight: 2 },
  { word: '烦躁', weight: 3 },
  { word: '失望', weight: 3 },
  { word: '绝望', weight: 5 },
  { word: '孤独', weight: 3 },
  { word: '寂寞', weight: 2 },
  { word: '疲惫', weight: 2 },
  { word: '累', weight: 1 },
  { word: '压力', weight: 2 },
  { word: '担心', weight: 2 },
  { word: '难过', weight: 3 },
  { word: '糟糕', weight: 3 },
  { word: '讨厌', weight: 3 },
  { word: '烦', weight: 1 },
  { word: '郁闷', weight: 2 },
  { word: '低落', weight: 3 },
  { word: '沮丧', weight: 3 },
  { word: '想哭', weight: 3 },
  { word: '痛苦', weight: 4 },
  { word: '难', weight: 1 },
];

const neutralKeywords: string[] = [
  '工作', '学习', '生活', '朋友', '家人', '美食', '旅行', '电影',
  '音乐', '读书', '运动', '睡觉', '吃饭', '上班', '下班', '周末',
  '今天', '明天', '昨天', '早上', '下午', '晚上', '今天', '天气',
  '咖啡', '奶茶', '宠物', '游戏', '追剧', '散步', '购物', '拍照',
];

const moodColors = [
  { level: 0, color: '#EF4444' },
  { level: 20, color: '#F97316' },
  { level: 40, color: '#EAB308' },
  { level: 60, color: '#84CC16' },
  { level: 80, color: '#22C55E' },
  { level: 90, color: '#06B6D4' },
  { level: 100, color: '#8B5CF6' },
];

function interpolateColor(color1: string, color2: string, ratio: number): string {
  const hex = (c: string) => parseInt(c, 16);
  const r1 = hex(color1.slice(1, 3));
  const g1 = hex(color1.slice(3, 5));
  const b1 = hex(color1.slice(5, 7));
  const r2 = hex(color2.slice(1, 3));
  const g2 = hex(color2.slice(3, 5));
  const b2 = hex(color2.slice(5, 7));
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getMoodColor(level: number): string {
  const clampedLevel = Math.max(0, Math.min(100, level));
  
  for (let i = 0; i < moodColors.length - 1; i++) {
    if (clampedLevel >= moodColors[i].level && clampedLevel <= moodColors[i + 1].level) {
      const range = moodColors[i + 1].level - moodColors[i].level;
      const ratio = (clampedLevel - moodColors[i].level) / range;
      return interpolateColor(moodColors[i].color, moodColors[i + 1].color, ratio);
    }
  }
  
  return clampedLevel < 50 ? moodColors[0].color : moodColors[moodColors.length - 1].color;
}

function extractKeywords(text: string): string[] {
  const found: { word: string; count: number }[] = [];
  const allKeywords = [
    ...positiveWords.map(w => ({ word: w.word, weight: w.weight })),
    ...negativeWords.map(w => ({ word: w.word, weight: w.weight })),
    ...neutralKeywords.map(w => ({ word: w, weight: 1 })),
  ];
  
  for (const kw of allKeywords) {
    let count = 0;
    let index = 0;
    while ((index = text.indexOf(kw.word, index)) !== -1) {
      count++;
      index += kw.word.length;
    }
    if (count > 0) {
      found.push({ word: kw.word, count: count * kw.weight });
    }
  }
  
  found.sort((a, b) => b.count - a.count);
  
  return found.slice(0, 8).map(f => f.word);
}

function calculateMoodLevel(text: string): number {
  let score = 50;
  
  for (const pw of positiveWords) {
    let count = 0;
    let index = 0;
    while ((index = text.indexOf(pw.word, index)) !== -1) {
      count++;
      index += pw.word.length;
    }
    score += count * pw.weight * 2;
  }
  
  for (const nw of negativeWords) {
    let count = 0;
    let index = 0;
    while ((index = text.indexOf(nw.word, index)) !== -1) {
      count++;
      index += nw.word.length;
    }
    score -= count * nw.weight * 2;
  }
  
  return Math.max(0, Math.min(100, score));
}

export function analyzeMood(text: string): MoodAnalysisResult {
  const startTime = performance.now();
  
  const moodLevel = calculateMoodLevel(text);
  const color = getMoodColor(moodLevel);
  const keywords = extractKeywords(text);
  
  const endTime = performance.now();
  console.debug(`Mood analysis completed in ${endTime - startTime}ms`);
  
  return {
    color,
    keywords,
    moodLevel,
  };
}
