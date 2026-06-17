export interface DraftData {
  content: string;
  savedAt: number;
  roomCode: string;
  userId: string;
}

const DRAFT_STORAGE_PREFIX = 'collab_story_draft_';

export function getDraftKey(roomCode: string, userId: string): string {
  return `${DRAFT_STORAGE_PREFIX}${roomCode}_${userId}`;
}

export function saveDraft(roomCode: string, userId: string, content: string): void {
  try {
    const draft: DraftData = {
      content,
      savedAt: Date.now(),
      roomCode,
      userId
    };
    const key = getDraftKey(roomCode, userId);
    localStorage.setItem(key, JSON.stringify(draft));
  } catch (e) {
    console.error('Failed to save draft:', e);
  }
}

export function getDraft(roomCode: string, userId: string): DraftData | null {
  try {
    const key = getDraftKey(roomCode, userId);
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as DraftData;
  } catch (e) {
    console.error('Failed to get draft:', e);
    return null;
  }
}

export function removeDraft(roomCode: string, userId: string): void {
  try {
    const key = getDraftKey(roomCode, userId);
    localStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to remove draft:', e);
  }
}

export function hasDraft(roomCode: string, userId: string): boolean {
  return getDraft(roomCode, userId) !== null;
}

export function formatDraftTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
