import { marked } from 'marked';
import { Sentiment } from '../types';

const positiveKeywords = [
  '喜欢', '爱', '棒', '好', '精彩', '出色', '优秀', '完美', '感动', '温暖',
  '开心', '快乐', '幸福', '满足', '享受', '推荐', '值得', '经典', '深刻',
  '启发', '智慧', '美好', '希望', '力量', '治愈', 'nice', 'great', 'love',
  'amazing', 'wonderful', 'excellent', 'good', 'perfect', 'beautiful'
];

const negativeKeywords = [
  '讨厌', '恨', '差', '坏', '糟糕', '失望', '难过', '悲伤', '痛苦', '愤怒',
  '无聊', '浪费', '后悔', '不值', '差劲', '烂', '垃圾', '可怕', '绝望',
  '压抑', '沉重', '批判', '虚伪', 'bad', 'terrible', 'awful', 'hate',
  'disappointing', 'boring', 'worse', 'worst'
];

export const analyzeSentiment = (content: string): Sentiment => {
  const lowerContent = content.toLowerCase();
  let positiveScore = 0;
  let negativeScore = 0;

  positiveKeywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    const matches = lowerContent.match(regex);
    if (matches) {
      positiveScore += matches.length;
    }
  });

  negativeKeywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    const matches = lowerContent.match(regex);
    if (matches) {
      negativeScore += matches.length;
    }
  });

  if (positiveScore > negativeScore) {
    return 'positive';
  } else if (negativeScore > positiveScore) {
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
