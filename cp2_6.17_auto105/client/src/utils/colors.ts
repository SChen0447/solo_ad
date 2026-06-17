import { TAG_COLORS } from '../types';

const tagColorCache = new Map<string, string>();

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

export const getStableTagColor = (tagName: string): string => {
  if (tagColorCache.has(tagName)) {
    return tagColorCache.get(tagName)!;
  }
  const hash = hashString(tagName);
  const color = TAG_COLORS[hash % TAG_COLORS.length];
  tagColorCache.set(tagName, color);
  return color;
};

export const clearTagColorCache = (): void => {
  tagColorCache.clear();
};

export const updateTagColorCache = (oldName: string, newName: string): void => {
  if (tagColorCache.has(oldName)) {
    const color = tagColorCache.get(oldName)!;
    tagColorCache.delete(oldName);
    tagColorCache.set(newName, color);
  }
};
