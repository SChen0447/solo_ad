export interface Paragraph {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  timestamp: number;
  branchId: string;
  parentId?: string;
}

export interface Branch {
  id: string;
  name: string;
  color: string;
  parentParagraphId?: string;
}

export interface Character {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  lastSubmit?: number;
}

export const SENSITIVE_WORDS = ['暴力', '色情', '赌博', '毒品', '诈骗', '恐怖'];

export function countWords(content: string): number {
  return content.trim().length;
}

export function checkCooldown(lastSubmit: number | undefined, cooldownSeconds: number): number {
  if (!lastSubmit) return 0;
  const elapsed = (Date.now() - lastSubmit) / 1000;
  const remaining = cooldownSeconds - elapsed;
  return remaining > 0 ? Math.ceil(remaining) : 0;
}

export function containsSensitiveWords(content: string): boolean {
  return SENSITIVE_WORDS.some(word => content.includes(word));
}

export function validateParagraph(
  content: string,
  maxWords: number,
  lastSubmit: number | undefined,
  cooldownSeconds: number
): { valid: boolean; error?: string } {
  if (!content.trim()) {
    return { valid: false, error: '内容不能为空' };
  }
  if (countWords(content) > maxWords) {
    return { valid: false, error: '字数超标' };
  }
  if (containsSensitiveWords(content)) {
    return { valid: false, error: '内容包含不适当词汇，请修改' };
  }
  if (checkCooldown(lastSubmit, cooldownSeconds) > 0) {
    return { valid: false, error: '请等待冷却时间结束' };
  }
  return { valid: true };
}

export function findMentionedCharacters(
  content: string,
  characters: Character[]
): Character[] {
  return characters.filter(c => {
    const pattern = new RegExp(`@${c.name}`, 'g');
    return pattern.test(content);
  });
}

export function getBranchesByParagraph(
  paragraphs: Record<string, Paragraph[]>,
  branches: Branch[],
  paragraphId: string
): Branch[] {
  const result: Branch[] = [];
  for (const [branchId, paras] of Object.entries(paragraphs)) {
    const hasParagraph = paras.some(p => p.id === paragraphId);
    if (hasParagraph) {
      const branch = branches.find(b => b.id === branchId);
      if (branch) result.push(branch);
    }
  }
  return result;
}

export function mergeBranchParagraphs(
  mainParagraphs: Paragraph[],
  branchParagraphs: Paragraph[],
  divergenceId?: string
): Paragraph[] {
  if (!divergenceId) return branchParagraphs;

  const divergenceIdx = mainParagraphs.findIndex(p => p.id === divergenceId);
  if (divergenceIdx === -1) return branchParagraphs;

  const beforeDivergence = mainParagraphs.slice(0, divergenceIdx);
  return [...beforeDivergence, ...branchParagraphs];
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
