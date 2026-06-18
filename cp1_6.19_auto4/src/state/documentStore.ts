import { create } from 'zustand';
import type { Comment, DocumentVersion } from '../types';

interface DocumentStore {
  content: string;
  comments: Comment[];
  versions: DocumentVersion[];
  selectedText: string;
  selectionRange: { start: number; end: number } | null;
  showCommentInput: boolean;
  commentInputPosition: { top: number; left: number } | null;
  isSidebarCollapsed: boolean;
  activeCommentId: string | null;
  currentUser: string;
  documentId: string;

  setContent: (content: string) => void;
  setComments: (comments: Comment[]) => void;
  addComment: (comment: Omit<Comment, 'id' | 'timestamp'>) => void;
  updateCommentStatus: (commentId: string, status: 'pending' | 'resolved') => void;
  setVersions: (versions: DocumentVersion[]) => void;
  setSelectedText: (text: string, range: { start: number; end: number } | null) => void;
  setShowCommentInput: (show: boolean, position?: { top: number; left: number }) => void;
  toggleSidebar: () => void;
  setActiveCommentId: (id: string | null) => void;
  setCurrentUser: (user: string) => void;
  restoreVersion: (version: DocumentVersion) => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  content: '',
  comments: [],
  versions: [],
  selectedText: '',
  selectionRange: null,
  showCommentInput: false,
  commentInputPosition: null,
  isSidebarCollapsed: false,
  activeCommentId: null,
  currentUser: '用户' + Math.floor(Math.random() * 1000),
  documentId: 'default',

  setContent: (content) => set({ content }),

  setComments: (comments) => set({ comments }),

  addComment: (commentData) => {
    const newComment: Comment = {
      ...commentData,
      id: 'temp_' + Date.now(),
      timestamp: Date.now(),
    };
    set((state) => ({
      comments: [...state.comments, newComment],
      showCommentInput: false,
      selectedText: '',
      selectionRange: null,
    }));
  },

  updateCommentStatus: (commentId, status) =>
    set((state) => ({
      comments: state.comments.map((c) =>
        c.id === commentId ? { ...c, status } : c
      ),
    })),

  setVersions: (versions) => set({ versions }),

  setSelectedText: (text, range) => set({ selectedText: text, selectionRange: range }),

  setShowCommentInput: (show, position) =>
    set({ showCommentInput: show, commentInputPosition: position || null }),

  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  setActiveCommentId: (id) => set({ activeCommentId: id }),

  setCurrentUser: (user) => set({ currentUser: user }),

  restoreVersion: (version) => {
    if (version.content !== undefined) {
      set({ content: version.content });
    }
    if (version.comments !== undefined) {
      set({ comments: version.comments });
    }
  },
}));
