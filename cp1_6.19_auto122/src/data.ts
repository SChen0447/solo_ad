import { v4 as uuidv4 } from 'uuid';
import { Illustration, IllustrationStyle } from './types';

const STYLES: IllustrationStyle[] = [
  'ukiyo-e',
  'american-retro',
  'cyberpunk',
  'ink-wash',
  'pixel-art'
];

const TITLES: Record<IllustrationStyle, string[]> = {
  'ukiyo-e': ['神奈川冲浪', '富士山景', '艺伎画像', '樱花树下', '江户街景'],
  'american-retro': ['复古汽车', ' diner 餐厅', '老广告牌', '爵士之夜', '美式海报'],
  'cyberpunk': ['霓虹都市', '机械少女', '未来东京', '赛博空间', '雨夜街道'],
  'ink-wash': ['山水意境', '竹林清韵', '墨梅图', '烟波钓叟', '空山新雨'],
  'pixel-art': ['像素城堡', '8-bit 英雄', '复古游戏', '像素森林', '像素城市']
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function getDailySeed(): number {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function generateColorBlock(random: () => number, style: IllustrationStyle): string {
  const palettes: Record<IllustrationStyle, string[]> = {
    'ukiyo-e': ['#d43333', '#f5e6d3', '#2c3e50', '#e67e22', '#c0392b'],
    'american-retro': ['#2a6099', '#f39c12', '#e74c3c', '#f1c40f', '#34495e'],
    'cyberpunk': ['#9b59b6', '#00ffff', '#ff00ff', '#1a1a2e', '#e74c3c'],
    'ink-wash': ['#2c3e50', '#5d6d7e', '#95a5a6', '#ecf0f1', '#bdc3c7'],
    'pixel-art': ['#2ecc71', '#3498db', '#e74c3c', '#f1c40f', '#9b59b6']
  };
  const palette = palettes[style];
  const color1 = palette[Math.floor(random() * palette.length)];
  const color2 = palette[Math.floor(random() * palette.length)];
  const angle = Math.floor(random() * 360);
  return `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`;
}

function shuffleArray<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateDailyIllustrations(count: number = 15): Illustration[] {
  const seed = getDailySeed();
  const random = seededRandom(seed);
  const illustrations: Illustration[] = [];

  const cardsPerStyle = Math.floor(count / STYLES.length);
  const extraCards = count % STYLES.length;

  STYLES.forEach((style, styleIndex) => {
    const numCards = cardsPerStyle + (styleIndex < extraCards ? 1 : 0);
    const titles = TITLES[style];
    for (let i = 0; i < numCards; i++) {
      illustrations.push({
        id: uuidv4(),
        title: titles[i % titles.length],
        style,
        imageUrl: generateColorBlock(random, style)
      });
    }
  });

  return shuffleArray(illustrations, random);
}

export function getDistractorStyles(correctStyle: IllustrationStyle, count: number = 1): IllustrationStyle[] {
  const similar: Record<IllustrationStyle, IllustrationStyle[]> = {
    'ukiyo-e': ['ink-wash', 'american-retro'],
    'american-retro': ['ukiyo-e', 'pixel-art'],
    'cyberpunk': ['pixel-art', 'american-retro'],
    'ink-wash': ['ukiyo-e', 'pixel-art'],
    'pixel-art': ['cyberpunk', 'ink-wash']
  };
  return similar[correctStyle].slice(0, count);
}

export { getDailySeed };
