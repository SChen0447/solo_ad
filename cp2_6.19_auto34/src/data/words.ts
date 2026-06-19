import { v4 as uuidv4 } from 'uuid';
import type { WordData } from '../types';
import { WORD_CONFIG } from './wordConfig';
import type { WordConfigItem } from './wordConfig';

/**
 * 词语库数据模块
 *
 * 数据流向：
 *   wordConfig.ts (词语配置) → 本模块 (加工为带 id 的 WordData)
 *   ↓
 *   App.tsx (通过 getRandomWords 获取随机词语)
 *   ↓
 *   GameBoard.tsx (通过 wordData prop 传递单个词语及其部件)
 *
 * 词语扩展机制：
 *   1. 默认从 wordConfig.ts 导入词语配置
 *   2. 支持通过 setWordLibrary() 函数在运行时动态替换词库
 *      （可用于从外部JSON文件或API加载词语）
 *   3. 支持通过 addWords() 函数追加新词语
 *
 * WordData 结构：
 *   - id: 唯一标识
 *   - word: 完整词语（如 "森林"）
 *   - parts: 按汉字拆分的部件数组（如 ["森", "林"]）
 *            学生需将乱序部件拖入槽位，按正确顺序拼成 word
 *   - hint: 提示内容（拼音 + 释义），学生卡住时可查看
 */

let wordLibrary: WordData[] = [];

function buildWordData(config: WordConfigItem[]): WordData[] {
  return config.map((item) => ({
    id: uuidv4(),
    word: item.word,
    parts: item.parts,
    hint: item.hint
  }));
}

function ensureLibrary(): WordData[] {
  if (wordLibrary.length === 0) {
    wordLibrary = buildWordData(WORD_CONFIG);
  }
  return wordLibrary;
}

export function setWordLibrary(configs: WordConfigItem[]): void {
  wordLibrary = buildWordData(configs);
}

export function addWords(configs: WordConfigItem[]): void {
  const newWords = buildWordData(configs);
  wordLibrary = [...ensureLibrary(), ...newWords];
}

export function getWordLibrary(): WordData[] {
  return [...ensureLibrary()];
}

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
  const library = ensureLibrary();
  const shuffled = shuffleArray(library);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
