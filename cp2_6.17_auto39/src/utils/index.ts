import { marked } from 'marked';
import { Sentiment } from '../types';

// 否定词列表 - 用于检测关键词前是否有否定修饰
// 匹配逻辑：检测关键词前是否有否定词（允许中间有1个字符的间隔）
const negationWords = ['不', '没', '无', '非', '否', '别', 'not', 'no', 'never', 'none'];

// 正面情感关键词 - 表达积极、赞赏、喜爱等正面情感
// 匹配注意：如关键词前出现否定词（如"不感动"），则不计入正面得分
const positiveKeywords = [
  '喜欢', '爱', '棒', '好', '精彩', '出色', '优秀', '完美', '感动', '温暖',
  '开心', '快乐', '幸福', '满足', '享受', '推荐', '值得', '经典', '深刻',
  '启发', '智慧', '美好', '希望', '力量', '治愈', '共鸣', '震撼', '震撼人心',
  '打动', '触动', '感人', '动人', '受益', '受益匪浅', '收获', '惊喜', '惊艳',
  '赞叹', '赞赏', '欣赏', '欣慰', '安心', '宁静', '平静', '振奋', '激励',
  '鼓舞', '充实', '丰富', '精彩绝伦', '引人入胜', '扣人心弦', '爱不释手',
  'nice', 'great', 'love', 'amazing', 'wonderful', 'excellent', 'good',
  'perfect', 'beautiful', 'brilliant', 'fantastic', 'awesome', 'inspiring',
  'touching', 'moving', 'heartwarming', 'insightful'
];

// 中性情感关键词 - 表达客观描述、记录、引用等中性行为
// 匹配注意：中性词不受否定词影响，直接计入中性得分
const neutralKeywords = [
  '记录', '概述', '引用', '摘录', '摘抄', '摘要', '总结', '归纳', '整理',
  '笔记', '标注', '标记', '划线', '内容', '描述', '说明', '介绍', '提到',
  '写道', '说道', '认为', '观点', '看法', '想法', '理解', '阅读', '读到',
  '章节', '段落', '句子', '字词', '概念', '定义', '理论', '方法',
  'note', 'summary', 'quote', 'reference', 'record', 'chapter', 'section'
];

// 负面情感关键词 - 表达消极、不满、批评等负面情感
// 匹配注意：如关键词前出现否定词（如"不糟糕"），则不计入负面得分
const negativeKeywords = [
  '讨厌', '恨', '差', '坏', '糟糕', '失望', '难过', '悲伤', '痛苦', '愤怒',
  '无聊', '浪费', '后悔', '不值', '差劲', '烂', '垃圾', '可怕', '绝望',
  '压抑', '沉重', '批判', '虚伪', '困惑', '混乱', '迷茫', '费解', '难懂',
  '枯燥', '乏味', '平庸', '俗套', '陈旧', '老套', '牵强', '生硬', '突兀',
  '拖沓', '啰嗦', '冗长', '晦涩', '艰深', '矛盾', '漏洞', '破绽', '缺陷',
  '不足', '欠缺', '遗憾', '可惜', '不满', '不悦', '沮丧', '失落', '迷茫',
  'bad', 'terrible', 'awful', 'hate', 'disappointing', 'boring', 'worse',
  'worst', 'confusing', 'chaotic', 'tedious', 'dull', 'frustrating',
  'disappointed', 'confused', 'messy', 'weak', 'poor'
];

// 检测关键词前是否有否定词
const hasNegationBefore = (content: string, matchIndex: number): boolean => {
  const checkStart = Math.max(0, matchIndex - 3);
  const beforeText = content.substring(checkStart, matchIndex);
  
  for (const negation of negationWords) {
    if (beforeText.includes(negation)) {
      return true;
    }
  }
  return false;
};

// 计算关键词匹配次数（排除否定词前置的情况）
const countKeywordMatches = (
  content: string,
  keywords: string[],
  checkNegation: boolean = true
): number => {
  let count = 0;
  
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      if (checkNegation && hasNegationBefore(content, match.index)) {
        continue;
      }
      count++;
    }
  });
  
  return count;
};

export const analyzeSentiment = (content: string): Sentiment => {
  const lowerContent = content.toLowerCase();
  
  // 正面情感得分：检测正面关键词，排除否定词前置的情况（如"不感动"）
  const positiveScore = countKeywordMatches(lowerContent, positiveKeywords, true);
  
  // 负面情感得分：检测负面关键词，排除否定词前置的情况（如"不糟糕"）
  const negativeScore = countKeywordMatches(lowerContent, negativeKeywords, true);
  
  // 中性情感得分：检测中性关键词，不考虑否定词
  const neutralScore = countKeywordMatches(lowerContent, neutralKeywords, false);

  const maxScore = Math.max(positiveScore, negativeScore, neutralScore);
  if (maxScore === 0) {
    return 'neutral';
  }
  if (positiveScore === maxScore && positiveScore >= negativeScore) {
    return 'positive';
  } else if (negativeScore === maxScore && negativeScore > positiveScore) {
    return 'negative';
  }
  return 'neutral';
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

export const getShortDate = (date: Date): string => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};

export const getDayName = (date: Date): string => {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[date.getDay()];
};

export const parseMarkdown = (content: string): string => {
  return marked.parse(content) as string;
};

export const getPlaceholderColor = (title: string): string => {
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#fa709a', '#fee140', '#a8edea', '#fed6e3'
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % colors.length);
  return colors[index];
};

export const getGradientColor = (index: number, total: number): string => {
  const startColor = { r: 100, g: 255, b: 218 };
  const endColor = { r: 0, g: 150, b: 136 };
  
  const ratio = total > 1 ? index / (total - 1) : 0;
  const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
  const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
  const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);
  
  return `rgb(${r}, ${g}, ${b})`;
};
