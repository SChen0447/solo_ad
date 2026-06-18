import { create } from 'zustand'

export type CommentType = 'like' | 'error' | 'suggest' | 'question'

export interface Comment {
  id: string
  text: string
  offsetStart: number
  offsetEnd: number
  type: CommentType
  content: string
}

export const TYPE_CONFIG: Record<CommentType, { label: string; color: string; bgColor: string; icon: string }> = {
  like: { label: '点赞', color: '#4caf50', bgColor: '#4caf5033', icon: '👍' },
  error: { label: '错误', color: '#e53935', bgColor: '#e5393533', icon: '✗' },
  suggest: { label: '建议', color: '#1e88e5', bgColor: '#1e88e533', icon: '💡' },
  question: { label: '疑问', color: '#fb8c00', bgColor: '#fb8c0033', icon: '?' },
}

interface CommentStore {
  comments: Comment[]
  selectedCommentId: string | null
  addComment: (comment: Omit<Comment, 'id'>) => void
  removeComment: (id: string) => void
  updateComment: (id: string, updates: Partial<Pick<Comment, 'content' | 'type'>>) => void
  selectComment: (id: string | null) => void
  clearAll: () => void
}

export const useCommentStore = create<CommentStore>((set) => ({
  comments: [],
  selectedCommentId: null,
  addComment: (comment) =>
    set((state) => ({
      comments: [...state.comments, { ...comment, id: crypto.randomUUID() }],
    })),
  removeComment: (id) =>
    set((state) => ({
      comments: state.comments.filter((c) => c.id !== id),
      selectedCommentId: state.selectedCommentId === id ? null : state.selectedCommentId,
    })),
  updateComment: (id, updates) =>
    set((state) => ({
      comments: state.comments.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  selectComment: (id) => set({ selectedCommentId: id }),
  clearAll: () => set({ comments: [], selectedCommentId: null }),
}))
