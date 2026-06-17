import type { GradeResult } from './api';

export interface WrongAnswerRecord {
  id: string;
  question: string;
  options: string[];
  userAnswer: number | null;
  correctAnswer: number;
  explanation: string;
  tags: string[];
  timestamp: number;
  mastered: boolean;
}

const STORAGE_KEY = 'tech_quiz_wrong_answers';

export function getAllWrongAnswers(): WrongAnswerRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WrongAnswerRecord[];
    return parsed.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return [];
  }
}

export function saveWrongAnswers(records: WrongAnswerRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('保存错题失败:', e);
  }
}

export function addWrongAnswers(results: GradeResult[]): void {
  const existing = getAllWrongAnswers();
  const existingIds = new Set(existing.map((r) => r.id));

  results.forEach((r) => {
    if (!r.isCorrect && !existingIds.has(r.id)) {
      existing.push({
        id: r.id,
        question: r.question,
        options: r.options,
        userAnswer: r.userAnswer,
        correctAnswer: r.correctAnswer,
        explanation: r.explanation,
        tags: r.tags,
        timestamp: Date.now(),
        mastered: false,
      });
    }
  });

  saveWrongAnswers(existing);
}

export function markAsMastered(id: string): void {
  const records = getAllWrongAnswers();
  const target = records.find((r) => r.id === id);
  if (target) {
    target.mastered = true;
    saveWrongAnswers(records);
  }
}

export function removeWrongAnswer(id: string): void {
  const records = getAllWrongAnswers().filter((r) => r.id !== id);
  saveWrongAnswers(records);
}

export function getAllTags(): string[] {
  const records = getAllWrongAnswers();
  const tagSet = new Set<string>();
  records.forEach((r) => r.tags.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

export function filterWrongAnswers(tag: string | null, showMastered: boolean): WrongAnswerRecord[] {
  let records = getAllWrongAnswers();
  if (!showMastered) {
    records = records.filter((r) => !r.mastered);
  }
  if (tag) {
    records = records.filter((r) => r.tags.includes(tag));
  }
  return records;
}
