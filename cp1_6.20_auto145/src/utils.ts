import { BilingualText, Language, AnswerValue, Question } from './types';

export const t = (text: BilingualText, lang: Language): string => {
  if (!text) return '';
  const value = lang === 'en' ? text.en : text.zh;
  return value || text.zh || text.en || '';
};

export const generateId = (): string =>
  Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);

export const getQuestionTypeLabel = (type: string, lang: Language): string => {
  const labels: Record<string, BilingualText> = {
    single_choice: { zh: '单选题', en: 'Single Choice' },
    multiple_choice: { zh: '多选题', en: 'Multiple Choice' },
    rating: { zh: '评分题', en: 'Rating' },
    text: { zh: '文本题', en: 'Text Input' },
  };
  const label = labels[type];
  return label ? t(label, lang) : type;
};

export const getQuestionTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    single_choice: '◉',
    multiple_choice: '☑',
    rating: '★',
    text: '✎',
  };
  return icons[type] || '?';
};

export const validateRequired = (question: Question, value: AnswerValue): boolean => {
  if (!question.required) return true;
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'number' && isNaN(value)) return false;
  return true;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
};

export const downloadCSV = (content: string, filename: string): void => {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const escapeCSV = (value: string): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};
