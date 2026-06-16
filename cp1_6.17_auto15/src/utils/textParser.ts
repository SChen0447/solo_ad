import { Paragraph, Sentence } from '../types';

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const createSentence = (text: string): Sentence => ({
  id: generateId(),
  text: text.trim(),
});

export const createParagraph = (text: string): Paragraph => {
  const sentences = splitIntoSentences(text);
  return {
    id: generateId(),
    sentences: sentences.length > 0 ? sentences : [createSentence('')],
  };
};

export const splitIntoSentences = (text: string): Sentence[] => {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const sentenceRegex = /[^。！？!?\n]+[。！？!?]?|\n/g;
  const matches = trimmed.match(sentenceRegex) || [trimmed];

  return matches
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(createSentence);
};

export const parseTextToParagraphs = (rawText: string): Paragraph[] => {
  const lines = rawText.split(/\n\s*\n/);
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(createParagraph);
};

export const paragraphsToText = (paragraphs: Paragraph[]): string => {
  return paragraphs
    .map((p) => p.sentences.map((s) => s.text).join(''))
    .join('\n\n');
};

export const mergeParagraphs = (
  paragraphs: Paragraph[],
  index: number
): Paragraph[] => {
  if (index < 0 || index >= paragraphs.length - 1) return paragraphs;
  const result = [...paragraphs];
  const merged: Paragraph = {
    id: generateId(),
    sentences: [...result[index].sentences, ...result[index + 1].sentences],
  };
  result.splice(index, 2, merged);
  return result;
};

export const splitParagraph = (
  paragraphs: Paragraph[],
  paragraphIndex: number,
  sentenceIndex: number
): Paragraph[] => {
  if (sentenceIndex <= 0 || sentenceIndex >= paragraphs[paragraphIndex].sentences.length) {
    return paragraphs;
  }
  const result = [...paragraphs];
  const target = result[paragraphIndex];
  const firstPart: Paragraph = {
    id: generateId(),
    sentences: target.sentences.slice(0, sentenceIndex),
  };
  const secondPart: Paragraph = {
    id: generateId(),
    sentences: target.sentences.slice(sentenceIndex),
  };
  result.splice(paragraphIndex, 1, firstPart, secondPart);
  return result;
};
