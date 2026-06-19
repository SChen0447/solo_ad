import { v4 as uuidv4 } from 'uuid';
import type { WordData } from '../types';

/**
 * 词语库数据文件
 *
 * 数据流向：
 *   本文件 → App.tsx (通过 getRandomWords 获取随机词语)
 *   App.tsx → GameBoard.tsx (通过 wordData prop 传递单个词语及其部件)
 *
 * WordData 结构：
 *   - id: 唯一标识
 *   - word: 完整词语（如 "森林"）
 *   - parts: 按汉字拆分的部件数组（如 ["森", "林"]）
 *            学生需将乱序部件拖入槽位，按正确顺序拼成 word
 */

export const WORD_LIBRARY: WordData[] = [
  { id: uuidv4(), word: '森林', parts: ['森', '林'] },
  { id: uuidv4(), word: '蝴蝶', parts: ['蝴', '蝶'] },
  { id: uuidv4(), word: '勇气', parts: ['勇', '气'] },
  { id: uuidv4(), word: '海洋', parts: ['海', '洋'] },
  { id: uuidv4(), word: '朋友', parts: ['朋', '友'] },
  { id: uuidv4(), word: '知识', parts: ['知', '识'] },
  { id: uuidv4(), word: '快乐', parts: ['快', '乐'] },
  { id: uuidv4(), word: '梦想', parts: ['梦', '想'] },
  { id: uuidv4(), word: '希望', parts: ['希', '望'] },
  { id: uuidv4(), word: '阳光', parts: ['阳', '光'] },
  { id: uuidv4(), word: '彩虹', parts: ['彩', '虹'] },
  { id: uuidv4(), word: '花园', parts: ['花', '园'] },
  { id: uuidv4(), word: '星星', parts: ['星', '星'] },
  { id: uuidv4(), word: '月亮', parts: ['月', '亮'] },
  { id: uuidv4(), word: '春风', parts: ['春', '风'] },
  { id: uuidv4(), word: '秋雨', parts: ['秋', '雨'] },
  { id: uuidv4(), word: '青山', parts: ['青', '山'] },
  { id: uuidv4(), word: '绿水', parts: ['绿', '水'] },
  { id: uuidv4(), word: '老师', parts: ['老', '师'] },
  { id: uuidv4(), word: '学生', parts: ['学', '生'] }
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
