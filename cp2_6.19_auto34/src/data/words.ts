import { v4 as uuidv4 } from 'uuid';
import type { WordData } from '../types';

export const WORD_LIBRARY: WordData[] = [
  { id: uuidv4(), word: '森林', parts: ['木', '木', '木', '林'] },
  { id: uuidv4(), word: '蝴蝶', parts: ['虫', '胡', '虫', '枼'] },
  { id: uuidv4(), word: '勇气', parts: ['甬', '力', '气'] },
  { id: uuidv4(), word: '海洋', parts: ['氵', '每', '氵', '羊'] },
  { id: uuidv4(), word: '朋友', parts: ['月', '月', '又', '又'] },
  { id: uuidv4(), word: '知识', parts: ['矢', '口', '言', '只'] },
  { id: uuidv4(), word: '快乐', parts: ['忄', '夬', '楽'] },
  { id: uuidv4(), word: '梦想', parts: ['林', '夕', '相', '心'] },
  { id: uuidv4(), word: '希望', parts: ['巾', '希', '王', '亡', '月'] },
  { id: uuidv4(), word: '阳光', parts: ['阝', '日', '日', '立', '曰'] },
  { id: uuidv4(), word: '彩虹', parts: ['虫', '工', '纟', '工', '白'] },
  { id: uuidv4(), word: '花园', parts: ['艹', '化', '囗', '元'] },
  { id: uuidv4(), word: '星星', parts: ['日', '生', '日', '生'] },
  { id: uuidv4(), word: '月亮', parts: ['月', '月', '亮'] },
  { id: uuidv4(), word: '春风', parts: ['春', '风'] },
  { id: uuidv4(), word: '秋雨', parts: ['禾', '火', '雨', '彐', '冂'] },
  { id: uuidv4(), word: '青山', parts: ['青', '山'] },
  { id: uuidv4(), word: '绿水', parts: ['纟', '录', '水', '彐', '冂'] },
  { id: uuidv4(), word: '老师', parts: ['耂', '匕', '师'] },
  { id: uuidv4(), word: '学生', parts: ['子', '小', '生'] }
];

export const ROUND_SIZE = 5;
export const POINTS_PER_WORD = 10;

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getRandomWords(count: number): WordData[] {
  const shuffled = shuffleArray(WORD_LIBRARY);
  return shuffled.slice(0, count);
}
