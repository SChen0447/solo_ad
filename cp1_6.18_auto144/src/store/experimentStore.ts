import { create } from 'zustand'
import { experimentApi, Experiment, ExperimentSummary } from '../api/experimentApi'

interface ExperimentState {
  experiments: ExperimentSummary[]
  currentExperiment: Experiment | null
  loading: boolean
  error: string | null
  fetchExperiments: () => Promise<void>
  fetchExperiment: (id: string) => Promise<void>
  createExperiment: (data: { title: string; summary: string; description: string }) => Promise<Experiment>
  updateExperiment: (id: string, data: Partial<Experiment>) => Promise<void>
  addComment: (id: string, content: string) => Promise<void>
  addTextAttachment: (experimentId: string, title: string, content: string) => Promise<void>
  addImageAttachment: (experimentId: string, data: {
    filename: string
    url: string
    thumbnail: string
    width: number
    height: number
  }) => Promise<void>
  addAnnotation: (attachmentId: string, content: string, lineIndex: number) => Promise<void>
  clearCurrentExperiment: () => void
}

export const useExperimentStore = create<ExperimentState>((set, get) => ({
  experiments: [],
  currentExperiment: null,
  loading: false,
  error: null,

  fetchExperiments: async () => {
    set({ loading: true, error: null })
    try {
      const res = await experimentApi.getExperiments()
      set({ experiments: res.data, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  fetchExperiment: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const res = await experimentApi.getExperiment(id)
      set({ currentExperiment: res.data, loading: false })
    } catch (err: any) {
      set({ error: err.message, loading: false })
    }
  },

  createExperiment: async (data) => {
    set({ loading: true, error: null })
    const res = await experimentApi.createExperiment(data)
    set(state => ({
      experiments: [res.data, ...state.experiments],
      loading: false
    }))
    return res.data
  },

  updateExperiment: async (id, data) => {
    const res = await experimentApi.updateExperiment(id, data)
    set(state => ({
      currentExperiment: res.data,
      experiments: state.experiments.map(exp =>
        exp.id === id
          ? { ...exp, title: res.data.title, summary: res.data.summary, status: res.data.status, updatedAt: res.data.updatedAt }
          : exp
      )
    }))
  },

  addComment: async (id, content) => {
    const res = await experimentApi.addComment(id, content)
    set(state => {
      if (!state.currentExperiment || state.currentExperiment.id !== id) return state
      return {
        currentExperiment: {
          ...state.currentExperiment,
          comments: [...state.currentExperiment.comments, res.data],
          timeline: [
            ...state.currentExperiment.timeline,
            {
              id: `tl-${Date.now()}`,
              type: 'comment' as const,
              userId: res.data.userId,
              userName: res.data.userName,
              userAvatar: res.data.userAvatar,
              description: '发表了评论',
              createdAt: res.data.createdAt
            }
          ]
        }
      }
    })
  },

  addTextAttachment: async (experimentId, title, content) => {
    const res = await experimentApi.addTextAttachment(experimentId, title, content)
    set(state => {
      if (!state.currentExperiment || state.currentExperiment.id !== experimentId) return state
      return {
        currentExperiment: {
          ...state.currentExperiment,
          attachments: [...state.currentExperiment.attachments, res.data]
        }
      }
    })
  },

  addImageAttachment: async (experimentId, data) => {
    const res = await experimentApi.addImageAttachment(experimentId, data)
    set(state => {
      if (!state.currentExperiment || state.currentExperiment.id !== experimentId) return state
      return {
        currentExperiment: {
          ...state.currentExperiment,
          attachments: [...state.currentExperiment.attachments, res.data]
        }
      }
    })
  },

  addAnnotation: async (attachmentId, content, lineIndex) => {
    const res = await experimentApi.addAnnotation(attachmentId, content, lineIndex)
    set(state => {
      if (!state.currentExperiment) return state
      return {
        currentExperiment: {
          ...state.currentExperiment,
          attachments: state.currentExperiment.attachments.map(att => {
            if (att.id === attachmentId && att.type === 'text') {
              return { ...att, annotations: [...att.annotations, res.data] }
            }
            return att
          })
        }
      }
    })
  },

  clearCurrentExperiment: () => {
    set({ currentExperiment: null })
  }
}))
