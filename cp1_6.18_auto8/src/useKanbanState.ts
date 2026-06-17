import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  useCallback,
  Dispatch,
} from 'react';
import { nanoid } from 'nanoid';
import {
  MergeRequestCard,
  ColumnStatus,
  Comment,
  EmojiType,
  FilterCriteria,
  ToastMessage,
  BannerMessage,
  KanbanState,
  ALL_STATUSES,
} from './types';

type Action =
  | { type: 'SET_CARDS'; payload: MergeRequestCard[] }
  | { type: 'ADD_CARD'; payload: MergeRequestCard }
  | { type: 'UPDATE_CARD_STATUS'; payload: { id: string; status: ColumnStatus; silent?: boolean } }
  | { type: 'ADD_COMMENT'; payload: { cardId: string; comment: Comment } }
  | {
      type: 'TOGGLE_REACTION';
      payload: { cardId: string; commentId: string; emoji: EmojiType; user: string };
    }
  | { type: 'SET_FILTERS'; payload: Partial<FilterCriteria> }
  | { type: 'RESET_FILTERS' }
  | { type: 'SHOW_TOAST'; payload: ToastMessage }
  | { type: 'HIDE_TOAST' }
  | { type: 'SHOW_BANNER'; payload: BannerMessage }
  | { type: 'HIDE_BANNER' };

const initialFilters: FilterCriteria = {
  labels: [],
  creators: [],
  keyword: '',
};

const initialState: KanbanState = {
  cards: [],
  filters: initialFilters,
  toast: null,
  banner: null,
};

function reducer(state: KanbanState, action: Action): KanbanState {
  switch (action.type) {
    case 'SET_CARDS':
      return { ...state, cards: action.payload };
    case 'ADD_CARD':
      return { ...state, cards: [action.payload, ...state.cards] };
    case 'UPDATE_CARD_STATUS': {
      const { id, status } = action.payload;
      const cards = state.cards.map((c) =>
        c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c,
      );
      return { ...state, cards };
    }
    case 'ADD_COMMENT': {
      const { cardId, comment } = action.payload;
      const cards = state.cards.map((c) =>
        c.id === cardId
          ? { ...c, comments: [...c.comments, comment], updatedAt: new Date().toISOString() }
          : c,
      );
      return { ...state, cards };
    }
    case 'TOGGLE_REACTION': {
      const { cardId, commentId, emoji, user } = action.payload;
      const cards = state.cards.map((c) => {
        if (c.id !== cardId) return c;
        const comments = c.comments.map((cmt) => {
          if (cmt.id !== commentId) return cmt;
          const reactions = { ...cmt.reactions };
          if (!reactions[emoji]) reactions[emoji] = [];
          const idx = reactions[emoji].indexOf(user);
          if (idx === -1) reactions[emoji] = [...reactions[emoji], user];
          else reactions[emoji] = reactions[emoji].filter((u) => u !== user);
          return { ...cmt, reactions };
        });
        return { ...c, comments };
      });
      return { ...state, cards };
    }
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case 'RESET_FILTERS':
      return { ...state, filters: initialFilters };
    case 'SHOW_TOAST':
      return { ...state, toast: action.payload };
    case 'HIDE_TOAST':
      return { ...state, toast: null };
    case 'SHOW_BANNER':
      return { ...state, banner: action.payload };
    case 'HIDE_BANNER':
      return { ...state, banner: null };
    default:
      return state;
  }
}

interface KanbanContextValue {
  state: KanbanState;
  dispatch: Dispatch<Action>;
  filteredCards: Record<ColumnStatus, MergeRequestCard[]>;
  allCreators: string[];
  fetchCards: () => Promise<void>;
  createCard: (data: {
    title: string;
    description: string;
    sourceBranch: string;
    targetBranch: string;
    labels: any[];
    creator: string;
  }) => Promise<void>;
  moveCard: (id: string, from: ColumnStatus, to: ColumnStatus) => Promise<void>;
  addComment: (
    cardId: string,
    data: { author: string; content: string; mentions: string[]; codeSnippet?: any },
  ) => Promise<void>;
  toggleReaction: (cardId: string, commentId: string, emoji: EmojiType, user: string) => Promise<void>;
  showToastMsg: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const KanbanContext = createContext<KanbanContextValue | null>(null);

export function KanbanProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch('/api/cards');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      dispatch({ type: 'SET_CARDS', payload: data });
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const showToastMsg = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = nanoid(6);
    dispatch({ type: 'SHOW_TOAST', payload: { id, text, type } });
    setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 2000);
  }, []);

  const createCard = useCallback(
    async (data: {
      title: string;
      description: string;
      sourceBranch: string;
      targetBranch: string;
      labels: any[];
      creator: string;
    }) => {
      try {
        const res = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('创建失败');
        const card = await res.json();
        dispatch({ type: 'ADD_CARD', payload: card });
        showToastMsg('合并请求创建成功 🎉', 'success');
      } catch (e: any) {
        showToastMsg(e.message || '创建失败', 'error');
      }
    },
    [showToastMsg],
  );

  const moveCard = useCallback(
    async (id: string, from: ColumnStatus, to: ColumnStatus) => {
      if (from === to) return;
      try {
        dispatch({ type: 'UPDATE_CARD_STATUS', payload: { id, status: to } });
        const bannerId = nanoid(6);
        dispatch({
          type: 'SHOW_BANNER',
          payload: { id: bannerId, text: `卡片状态已更新`, from, to },
        });
        setTimeout(() => dispatch({ type: 'HIDE_BANNER' }), 2000);

        const res = await fetch(`/api/cards/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: to }),
        });
        if (!res.ok) throw new Error('更新失败');
        showToastMsg('状态更新成功', 'success');
      } catch (e: any) {
        dispatch({ type: 'UPDATE_CARD_STATUS', payload: { id, status: from } });
        showToastMsg(e.message || '状态更新失败', 'error');
      }
    },
    [showToastMsg],
  );

  const addComment = useCallback(
    async (
      cardId: string,
      data: { author: string; content: string; mentions: string[]; codeSnippet?: any },
    ) => {
      try {
        const res = await fetch(`/api/cards/${cardId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error('评论发布失败');
        const comment = await res.json();
        dispatch({ type: 'ADD_COMMENT', payload: { cardId, comment } });
        showToastMsg('评论已发布', 'success');
      } catch (e: any) {
        showToastMsg(e.message || '评论发布失败', 'error');
      }
    },
    [showToastMsg],
  );

  const toggleReaction = useCallback(
    async (cardId: string, commentId: string, emoji: EmojiType, user: string) => {
      try {
        dispatch({ type: 'TOGGLE_REACTION', payload: { cardId, commentId, emoji, user } });
        const res = await fetch(`/api/cards/${cardId}/comments/${commentId}/reactions`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji, user }),
        });
        if (!res.ok) throw new Error('操作失败');
      } catch (e: any) {
        dispatch({ type: 'TOGGLE_REACTION', payload: { cardId, commentId, emoji, user } });
        showToastMsg(e.message || '操作失败', 'error');
      }
    },
    [showToastMsg],
  );

  const allCreators = useMemo(() => {
    const set = new Set<string>();
    state.cards.forEach((c) => set.add(c.creator));
    return Array.from(set);
  }, [state.cards]);

  const filteredCards = useMemo(() => {
    const { filters, cards } = state;
    const kw = filters.keyword.trim().toLowerCase();
    const result: Record<ColumnStatus, MergeRequestCard[]> = {
      pending: [],
      reviewing: [],
      merged: [],
    };
    for (const status of ALL_STATUSES) {
      result[status] = cards.filter((c) => {
        if (c.status !== status) return false;
        if (filters.labels.length > 0 && !c.labels.some((l) => filters.labels.includes(l)))
          return false;
        if (filters.creators.length > 0 && !filters.creators.includes(c.creator)) return false;
        if (kw) {
          const hay = `${c.title} ${c.description} ${c.creator} ${c.sourceBranch} ${c.targetBranch}`.toLowerCase();
          if (!hay.includes(kw)) return false;
        }
        return true;
      });
    }
    return result;
  }, [state.cards, state.filters]);

  const value: KanbanContextValue = {
    state,
    dispatch,
    filteredCards,
    allCreators,
    fetchCards,
    createCard,
    moveCard,
    addComment,
    toggleReaction,
    showToastMsg,
  };

  return <KanbanContext.Provider value={value}>{children}</KanbanContext.Provider>;
}

export function useKanban() {
  const ctx = useContext(KanbanContext);
  if (!ctx) throw new Error('useKanban must be used within KanbanProvider');
  return ctx;
}
