import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Comment } from '../types'

interface CommentState {
  comments: Record<string, Comment[]>
}

interface CommentActions {
  addComment: (annotationId: string, text: string, author?: string) => void
  deleteComment: (annotationId: string, commentId: string) => void
  getCommentsForAnnotation: (annotationId: string) => Comment[]
}

const initialState: CommentState = {
  comments: {},
}

export const useCommentStore = create<CommentState & CommentActions>((set, get) => ({
  ...initialState,

  addComment: (annotationId, text, author = '匿名用户') => {
    const comment: Comment = {
      id: uuidv4(),
      annotationId,
      text,
      author,
      createdAt: Date.now(),
    }

    set((state) => {
      const existingComments = state.comments[annotationId] || []
      return {
        comments: {
          ...state.comments,
          [annotationId]: [comment, ...existingComments],
        },
      }
    })
  },

  deleteComment: (annotationId, commentId) => {
    set((state) => {
      const existingComments = state.comments[annotationId] || []
      return {
        comments: {
          ...state.comments,
          [annotationId]: existingComments.filter((c) => c.id !== commentId),
        },
      }
    })
  },

  getCommentsForAnnotation: (annotationId) => {
    return get().comments[annotationId] || []
  },
}))
