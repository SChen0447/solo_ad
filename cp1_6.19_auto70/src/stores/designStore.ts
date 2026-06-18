import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import type { DesignImage, Annotation, Reply, AnnotationStatus } from '@/types'

interface DesignState {
  currentImage: DesignImage | null
  annotations: Annotation[]
  replies: Reply[]
  activeAnnotationId: string | null
}

export const useDesignStore = defineStore('design', {
  state: (): DesignState => ({
    currentImage: null,
    annotations: [],
    replies: [],
    activeAnnotationId: null,
  }),

  getters: {
    currentImageAnnotations(state): Annotation[] {
      if (!state.currentImage) return []
      return state.annotations
        .filter((a) => a.imageId === state.currentImage!.id)
        .sort((a, b) => b.createdAt - a.createdAt)
    },

    getAnnotationReplies(state) {
      return (annotationId: string): Reply[] =>
        state.replies
          .filter((r) => r.annotationId === annotationId)
          .sort((a, b) => a.createdAt - b.createdAt)
    },

    annotationById(state) {
      return (id: string): Annotation | undefined =>
        state.annotations.find((a) => a.id === id)
    },

    statusSummary(state) {
      const summary = { pending: 0, 'in-progress': 0, completed: 0 }
      for (const a of state.annotations) {
        summary[a.status]++
      }
      return summary
    },
  },

  actions: {
    setCurrentImage(image: DesignImage) {
      this.currentImage = image
    },

    addAnnotation(x: number, y: number, content: string) {
      if (!this.currentImage) return
      const now = Date.now()
      const annotation: Annotation = {
        id: uuidv4(),
        imageId: this.currentImage.id,
        x,
        y,
        radius: 12,
        content,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      }
      this.annotations.push(annotation)
      return annotation
    },

    updateAnnotationPosition(id: string, x: number, y: number) {
      const annotation = this.annotations.find((a) => a.id === id)
      if (annotation) {
        annotation.x = x
        annotation.y = y
        annotation.updatedAt = Date.now()
      }
    },

    updateAnnotationStatus(id: string, status: AnnotationStatus) {
      const annotation = this.annotations.find((a) => a.id === id)
      if (annotation) {
        annotation.status = status
        annotation.updatedAt = Date.now()
      }
    },

    deleteAnnotation(id: string) {
      this.annotations = this.annotations.filter((a) => a.id !== id)
      this.replies = this.replies.filter((r) => r.annotationId !== id)
      if (this.activeAnnotationId === id) {
        this.activeAnnotationId = null
      }
    },

    addReply(annotationId: string, content: string) {
      const reply: Reply = {
        id: uuidv4(),
        annotationId,
        content,
        createdAt: Date.now(),
      }
      this.replies.push(reply)
      return reply
    },

    setActiveAnnotation(id: string | null) {
      this.activeAnnotationId = id
    },

    getAllData() {
      return {
        image: this.currentImage,
        annotations: this.currentImageAnnotations,
        replies: this.replies,
      }
    },
  },
})
