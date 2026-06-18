import { v4 as uuidv4 } from 'uuid';

export type QuestionType = 'choice' | 'fill' | 'sort';

export interface ChoiceQuestion {
  id: string;
  type: 'choice';
  title: string;
  options: string[];
  correctAnswer: number;
}

export interface FillQuestion {
  id: string;
  type: 'fill';
  title: string;
  blanks: string[];
}

export interface SortQuestion {
  id: string;
  type: 'sort';
  title: string;
  items: string[];
  correctOrder: number[];
}

export type Question = ChoiceQuestion | FillQuestion | SortQuestion;

export interface AnswerRecord {
  questionId: string;
  userAnswer: number | string[] | number[];
  isCorrect: boolean;
  timeSpent: number;
}

export interface QuizResult {
  id: string;
  studentName: string;
  answers: AnswerRecord[];
  totalScore: number;
  totalTime: number;
  createdAt: string;
}

const questions: Question[] = [
  {
    id: uuidv4(),
    type: 'choice',
    title: 'React 是由哪家公司开发的？',
    options: ['Google', 'Facebook (Meta)', 'Microsoft', 'Amazon'],
    correctAnswer: 1
  },
  {
    id: uuidv4(),
    type: 'choice',
    title: '以下哪个不是 JavaScript 的数据类型？',
    options: ['String', 'Boolean', 'Float', 'Symbol'],
    correctAnswer: 2
  },
  {
    id: uuidv4(),
    type: 'choice',
    title: 'CSS 中 flex 布局的主轴对齐属性是？',
    options: ['align-items', 'justify-content', 'flex-direction', 'align-content'],
    correctAnswer: 1
  },
  {
    id: uuidv4(),
    type: 'fill',
    title: 'React 中用于管理组件状态的 Hook 是 ___，用于处理副作用的 Hook 是 ___。',
    blanks: ['useState', 'useEffect']
  },
  {
    id: uuidv4(),
    type: 'fill',
    title: 'HTTP 协议中，___ 状态码表示成功，___ 表示未找到资源。',
    blanks: ['200', '404']
  },
  {
    id: uuidv4(),
    type: 'fill',
    title: 'TypeScript 中，定义接口使用 ___ 关键字，定义类型别名使用 ___ 关键字。',
    blanks: ['interface', 'type']
  },
  {
    id: uuidv4(),
    type: 'sort',
    title: '请将以下前端技术按照出现时间从早到晚排序：',
    items: ['jQuery', 'React', 'Vue.js', 'AngularJS'],
    correctOrder: [0, 3, 1, 2]
  },
  {
    id: uuidv4(),
    type: 'sort',
    title: '请将以下 CSS 布局技术按照出现时间从早到晚排序：',
    items: ['Flexbox', 'Grid', 'Table布局', 'Float布局'],
    correctOrder: [2, 3, 0, 1]
  },
  {
    id: uuidv4(),
    type: 'sort',
    title: '请将以下编程语言按照出现时间从早到晚排序：',
    items: ['JavaScript', 'Python', 'C语言', 'Java'],
    correctOrder: [2, 3, 1, 0]
  }
];

const results: QuizResult[] = [];
const resultsMap = new Map<string, QuizResult>();

export const questionStore = {
  getAll: (): Question[] => {
    return [...questions];
  },

  getById: (id: string): Question | undefined => {
    return questions.find(q => q.id === id);
  },

  getByType: (type: QuestionType): Question[] => {
    return questions.filter(q => q.type === type);
  },

  create: (question: Omit<Question, 'id'>): Question => {
    const newQuestion = { ...question, id: uuidv4() } as Question;
    questions.push(newQuestion);
    return newQuestion;
  },

  update: (id: string, updates: Partial<Question>): Question | null => {
    const index = questions.findIndex(q => q.id === id);
    if (index === -1) return null;
    questions[index] = { ...questions[index], ...updates } as Question;
    return questions[index];
  },

  delete: (id: string): boolean => {
    const index = questions.findIndex(q => q.id === id);
    if (index === -1) return false;
    questions.splice(index, 1);
    return true;
  }
};

export const resultStore = {
  getAll: (): QuizResult[] => {
    return [...results];
  },

  getById: (id: string): QuizResult | undefined => {
    return resultsMap.get(id);
  },

  create: (result: Omit<QuizResult, 'id' | 'createdAt'>): QuizResult => {
    const newResult: QuizResult = {
      ...result,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    results.push(newResult);
    resultsMap.set(newResult.id, newResult);
    return newResult;
  }
};
