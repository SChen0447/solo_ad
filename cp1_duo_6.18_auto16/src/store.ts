import { create } from 'zustand';

export type Language = 'javascript' | 'typescript' | 'python' | 'html' | 'css';

export interface Annotation {
  id: string;
  lineNumber: number;
  content: string;
  createdAt: number;
}

export interface Snippet {
  id: string;
  code: string;
  language: Language;
  annotations: Annotation[];
  createdAt: number;
}

type View = 'editor' | 'preview' | 'share';

interface CodeReviewState {
  currentView: View;
  currentSnippetId: string | null;
  snippets: Record<string, Snippet>;
  selectedLines: [number, number] | null;
  darkMode: boolean;
  loadInput: string;

  setView: (view: View) => void;
  setLoadInput: (value: string) => void;
  createSnippet: (code: string, language: Language) => string;
  updateCurrentSnippet: (code: string, language: Language) => void;
  addAnnotation: (lineNumber: number, content: string) => void;
  deleteAnnotation: (annotationId: string) => void;
  loadSnippetById: (id: string) => boolean;
  setSelectedLines: (lines: [number, number] | null) => void;
  toggleDarkMode: () => void;
  getCurrentSnippet: () => Snippet | null;
  generateShareLink: () => string;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
}

const STORAGE_KEY = 'code_review_snippets';

const generateId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateUniqueId = <T extends object>(existing: Record<string, T>): string => {
  let id: string;
  do {
    id = generateId();
  } while (existing[id]);
  return id;
};

const sampleCode = `function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Calculate the 10th Fibonacci number
const result = fibonacci(10);
console.log("Fibonacci(10):", result);`;

const createInitialState = () => {
  const initialId = generateUniqueId({});
  const initialSnippet: Snippet = {
    id: initialId,
    code: sampleCode,
    language: 'javascript',
    annotations: [],
    createdAt: Date.now(),
  };
  return {
    currentView: 'editor' as View,
    currentSnippetId: initialId,
    snippets: { [initialId]: initialSnippet },
    selectedLines: null,
    darkMode: false,
    loadInput: '',
  };
};

export const useCodeReviewStore = create<CodeReviewState>((set, get) => ({
  ...createInitialState(),

  setView: (view) => set({ currentView: view }),

  setLoadInput: (value) => set({ loadInput: value }),

  createSnippet: (code, language) => {
    const id = generateUniqueId(get().snippets);
    const snippet: Snippet = {
      id,
      code,
      language,
      annotations: [],
      createdAt: Date.now(),
    };
    set((state) => ({
      snippets: { ...state.snippets, [id]: snippet },
      currentSnippetId: id,
    }));
    get().saveToLocalStorage();
    return id;
  },

  updateCurrentSnippet: (code, language) => {
    const { currentSnippetId, snippets } = get();
    if (!currentSnippetId || !snippets[currentSnippetId]) return;
    set((state) => ({
      snippets: {
        ...state.snippets,
        [currentSnippetId]: {
          ...state.snippets[currentSnippetId],
          code,
          language,
        },
      },
    }));
  },

  addAnnotation: (lineNumber, content) => {
    const { currentSnippetId, snippets } = get();
    if (!currentSnippetId || !snippets[currentSnippetId]) return;
    const annotationsMap = snippets[currentSnippetId].annotations.reduce(
      (acc, a) => ({ ...acc, [a.id]: a }),
      {} as Record<string, Annotation>
    );
    const annotation: Annotation = {
      id: generateUniqueId<Annotation>(annotationsMap),
      lineNumber,
      content,
      createdAt: Date.now(),
    };
    set((state) => ({
      snippets: {
        ...state.snippets,
        [currentSnippetId]: {
          ...state.snippets[currentSnippetId],
          annotations: [...state.snippets[currentSnippetId].annotations, annotation],
        },
      },
    }));
    get().saveToLocalStorage();
  },

  deleteAnnotation: (annotationId) => {
    const { currentSnippetId, snippets } = get();
    if (!currentSnippetId || !snippets[currentSnippetId]) return;
    set((state) => ({
      snippets: {
        ...state.snippets,
        [currentSnippetId]: {
          ...state.snippets[currentSnippetId],
          annotations: state.snippets[currentSnippetId].annotations.filter(
            (a) => a.id !== annotationId
          ),
        },
      },
    }));
    get().saveToLocalStorage();
  },

  loadSnippetById: (id) => {
    const { snippets } = get();
    if (snippets[id]) {
      set({ currentSnippetId: id, currentView: 'share' });
      return true;
    }
    return false;
  },

  setSelectedLines: (lines) => set({ selectedLines: lines }),

  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  getCurrentSnippet: () => {
    const { currentSnippetId, snippets } = get();
    return currentSnippetId ? snippets[currentSnippetId] || null : null;
  },

  generateShareLink: () => {
    const { currentSnippetId } = get();
    return currentSnippetId || '';
  },

  saveToLocalStorage: () => {
    try {
      const { snippets } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snippets));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  },

  loadFromLocalStorage: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const snippets = JSON.parse(data) as Record<string, Snippet>;
        const firstId = Object.keys(snippets)[0];
        set({
          snippets,
          currentSnippetId: firstId || null,
        });
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
  },
}));
