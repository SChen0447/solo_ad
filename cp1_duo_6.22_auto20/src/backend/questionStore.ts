import { v4 as uuidv4 } from 'uuid';

export type QuestionType = 'single' | 'multiple' | 'fill';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer: string | string[];
  knowledge: string;
  difficulty: Difficulty;
}

interface QuestionStore {
  questions: Question[];
  addQuestions: (questions: Omit<Question, 'id'>[]) => number;
  getQuestionsByFilter: (filters: {
    knowledges?: string[];
    difficulties?: Difficulty[];
    count?: number;
  }) => Question[];
  getAllQuestions: () => Question[];
  getKnowledges: () => string[];
  clearAll: () => void;
}

const questionStore: QuestionStore = {
  questions: [],

  addQuestions(newQuestions) {
    const questionsWithIds = newQuestions.map((q) => ({
      ...q,
      id: uuidv4(),
    }));
    this.questions.push(...questionsWithIds);
    return questionsWithIds.length;
  },

  getQuestionsByFilter({ knowledges, difficulties, count }) {
    let filtered = [...this.questions];

    const hasKnowledgeFilter =
      knowledges !== undefined &&
      knowledges !== null &&
      Array.isArray(knowledges) &&
      knowledges.length > 0 &&
      knowledges.some((k) => k && k.trim() !== '');

    if (hasKnowledgeFilter) {
      const validKnowledges = knowledges
        .filter((k) => k && k.trim() !== '')
        .map((k) => k.trim().toLowerCase());
      filtered = filtered.filter((q) => {
        return validKnowledges.includes(q.knowledge.trim().toLowerCase());
      });
    }

    const hasDifficultyFilter =
      difficulties !== undefined &&
      difficulties !== null &&
      Array.isArray(difficulties) &&
      difficulties.length > 0;

    if (hasDifficultyFilter) {
      const validDifficulties = difficulties.filter(
        (d) => d === 'easy' || d === 'medium' || d === 'hard'
      );
      if (validDifficulties.length > 0) {
        filtered = filtered.filter((q) => validDifficulties.includes(q.difficulty));
      }
    }

    const shuffled = filtered.sort(() => Math.random() - 0.5);

    const numCount = typeof count === 'number' ? count : parseInt(String(count), 10);
    if (!isNaN(numCount) && numCount > 0) {
      return shuffled.slice(0, Math.min(numCount, shuffled.length));
    }

    return shuffled;
  },

  getAllQuestions() {
    return this.questions;
  },

  getKnowledges() {
    const knowledges = new Set(this.questions.map((q) => q.knowledge));
    return Array.from(knowledges);
  },

  clearAll() {
    this.questions = [];
  },
};

export default questionStore;
