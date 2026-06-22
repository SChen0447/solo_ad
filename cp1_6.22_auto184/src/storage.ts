import type { Note } from './types';

const STORAGE_KEY = 'language_flashcard_notes';
const REVIEWED_KEY = 'language_flashcard_reviewed';
const STREAK_KEY = 'language_flashcard_streak';

export function loadNotes(): Note[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (_) { /* ignore */ }
  return getInitialNotes();
}

export function saveNotes(notes: Note[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function getReviewedToday(): Set<string> {
  try {
    const today = new Date().toDateString();
    const data = localStorage.getItem(REVIEWED_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.date === today) return new Set(parsed.ids);
    }
  } catch (_) { /* ignore */ }
  return new Set();
}

export function saveReviewedToday(ids: Set<string>): void {
  localStorage.setItem(REVIEWED_KEY, JSON.stringify({
    date: new Date().toDateString(),
    ids: Array.from(ids)
  }));
}

export function getStreak(): number {
  try {
    const data = localStorage.getItem(STREAK_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (parsed.lastDate === today || parsed.lastDate === yesterday) {
        return parsed.lastDate === today ? parsed.count : Math.max(0, parsed.count);
      }
    }
  } catch (_) { /* ignore */ }
  return 0;
}

export function updateStreak(): number {
  let streak = getStreak();
  try {
    const data = localStorage.getItem(STREAK_KEY);
    const today = new Date().toDateString();
    if (data) {
      const parsed = JSON.parse(data);
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (parsed.lastDate === today) {
        // already counted today
      } else if (parsed.lastDate === yesterday) {
        streak = parsed.count + 1;
      } else {
        streak = 1;
      }
    } else {
      streak = 1;
    }
    localStorage.setItem(STREAK_KEY, JSON.stringify({ lastDate: today, count: streak }));
  } catch (_) { /* ignore */ }
  return streak;
}

function getInitialNotes(): Note[] {
  const now = Date.now();
  const day = 86400000;
  return [
    {
      id: '1',
      word: 'ubiquitous',
      meaning: '无处不在的，普遍存在的',
      example1: 'Smartphones have become ubiquitous in modern society.',
      example2: 'Coffee shops are ubiquitous in this city.',
      language: 'en',
      createdAt: now - 6 * day,
      nextReviewAt: now - 86400000,
      intervalDays: 1,
      reviewCount: 0
    },
    {
      id: '2',
      word: 'こんにちは',
      meaning: '你好（白天问候）',
      example1: 'こんにちは、元気ですか？',
      example2: '先生、こんにちは！',
      language: 'ja',
      createdAt: now - 5 * day,
      nextReviewAt: now - 3600000,
      intervalDays: 1,
      reviewCount: 0
    },
    {
      id: '3',
      word: 'ephemeral',
      meaning: '短暂的，瞬息的',
      example1: 'Cherry blossoms are famous for their ephemeral beauty.',
      example2: 'Fame in the modern world is often ephemeral.',
      language: 'en',
      createdAt: now - 4 * day,
      nextReviewAt: now,
      intervalDays: 3,
      reviewCount: 1
    },
    {
      id: '4',
      word: 'buenos días',
      meaning: '早上好',
      example1: '¡Buenos días! ¿Cómo estás hoy?',
      example2: 'Buenos días a todos.',
      language: 'es',
      createdAt: now - 3 * day,
      nextReviewAt: now + day,
      intervalDays: 1,
      reviewCount: 0
    },
    {
      id: '5',
      word: 'serendipity',
      meaning: '意外发现美好事物的能力；机缘巧合',
      example1: 'Finding this café was pure serendipity.',
      example2: 'Many scientific discoveries are a result of serendipity.',
      language: 'en',
      createdAt: now - 2 * day,
      nextReviewAt: now,
      intervalDays: 1,
      reviewCount: 0
    },
    {
      id: '6',
      word: 'ありがとう',
      meaning: '谢谢',
      example1: 'ありがとうございます！',
      example2: '手伝ってくれてありがとう。',
      language: 'ja',
      createdAt: now - 1 * day,
      nextReviewAt: now,
      intervalDays: 1,
      reviewCount: 0
    }
  ];
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
