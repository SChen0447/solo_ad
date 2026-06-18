import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import type { Design, DesignListItem, Annotation, Comment } from './types';

interface AppState {
  designs: DesignListItem[];
  currentDesign: Design | null;
  selectedAnnotationId: string | null;
  socket: Socket | null;
  username: string;

  initSocket: () => void;
  fetchDesigns: () => Promise<void>;
  fetchDesign: (id: string) => Promise<void>;
  uploadDesign: (name: string, imageData: string) => Promise<Design | null>;
  createAnnotation: (designId: string, annotation: Omit<Annotation, 'id' | 'comments' | 'createdAt'>) => Promise<Annotation | null>;
  updateAnnotation: (designId: string, annotationId: string, updates: Partial<Annotation>) => Promise<void>;
  removeAnnotation: (designId: string, annotationId: string) => Promise<void>;
  addComment: (designId: string, annotationId: string, content: string) => Promise<void>;
  selectAnnotation: (id: string | null) => void;
  clearCurrentDesign: () => void;
  exportData: () => Promise<void>;
  importData: (data: Record<string, Design>) => Promise<number>;
}

const generateUsername = (): string => {
  const saved = localStorage.getItem('designflow_username');
  if (saved) return saved;
  const name = `访问者${Math.floor(Math.random() * 9000) + 1000}`;
  localStorage.setItem('designflow_username', name);
  return name;
};

export const useStore = create<AppState>((set, get) => ({
  designs: [],
  currentDesign: null,
  selectedAnnotationId: null,
  socket: null,
  username: generateUsername(),

  initSocket: () => {
    if (get().socket) return;
    const socket = io();

    socket.on('annotation:created', (_designId: string, annotation: Annotation) => {
      const { currentDesign } = get();
      if (currentDesign && !currentDesign.annotations.find(a => a.id === annotation.id)) {
        set({
          currentDesign: {
            ...currentDesign,
            annotations: [...currentDesign.annotations, annotation]
          }
        });
      }
    });

    socket.on('annotation:updated', (_designId: string, annotation: Annotation) => {
      const { currentDesign } = get();
      if (currentDesign) {
        set({
          currentDesign: {
            ...currentDesign,
            annotations: currentDesign.annotations.map(a =>
              a.id === annotation.id ? annotation : a
            )
          }
        });
      }
    });

    socket.on('annotation:deleted', (_designId: string, annotationId: string) => {
      const { currentDesign, selectedAnnotationId } = get();
      if (currentDesign) {
        set({
          currentDesign: {
            ...currentDesign,
            annotations: currentDesign.annotations.filter(a => a.id !== annotationId)
          },
          selectedAnnotationId: selectedAnnotationId === annotationId ? null : selectedAnnotationId
        });
      }
    });

    socket.on('comment:created', (_designId: string, annotationId: string, comment: Comment) => {
      const { currentDesign } = get();
      if (currentDesign) {
        set({
          currentDesign: {
            ...currentDesign,
            annotations: currentDesign.annotations.map(a => {
              if (a.id === annotationId && !a.comments.find(c => c.id === comment.id)) {
                return { ...a, comments: [...a.comments, comment] };
              }
              return a;
            })
          }
        });
      }
    });

    socket.on('design:created', () => {
      get().fetchDesigns();
    });

    socket.on('data:imported', () => {
      get().fetchDesigns();
    });

    set({ socket });
  },

  fetchDesigns: async () => {
    try {
      const res = await fetch('/api/designs');
      const data = await res.json();
      set({ designs: data });
    } catch (err) {
      console.error('Failed to fetch designs:', err);
    }
  },

  fetchDesign: async (id: string) => {
    try {
      const res = await fetch(`/api/designs/${id}`);
      if (!res.ok) {
        set({ currentDesign: null });
        return;
      }
      const data = await res.json();
      set({ currentDesign: data, selectedAnnotationId: null });
      const socket = get().socket;
      if (socket) {
        socket.emit('design:join', id);
      }
    } catch (err) {
      console.error('Failed to fetch design:', err);
      set({ currentDesign: null });
    }
  },

  uploadDesign: async (name: string, imageData: string) => {
    try {
      const res = await fetch('/api/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, imageData })
      });
      const data = await res.json();
      get().fetchDesigns();
      return data;
    } catch (err) {
      console.error('Failed to upload design:', err);
      return null;
    }
  },

  createAnnotation: async (designId: string, annotation: Omit<Annotation, 'id' | 'comments' | 'createdAt'>) => {
    try {
      const res = await fetch(`/api/designs/${designId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(annotation)
      });
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('Failed to create annotation:', err);
      return null;
    }
  },

  updateAnnotation: async (designId: string, annotationId: string, updates: Partial<Annotation>) => {
    try {
      await fetch(`/api/designs/${designId}/annotations/${annotationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.error('Failed to update annotation:', err);
    }
  },

  removeAnnotation: async (designId: string, annotationId: string) => {
    try {
      await fetch(`/api/designs/${designId}/annotations/${annotationId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Failed to delete annotation:', err);
    }
  },

  addComment: async (designId: string, annotationId: string, content: string) => {
    try {
      const { username } = get();
      await fetch(`/api/designs/${designId}/annotations/${annotationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: username, content })
      });
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  },

  selectAnnotation: (id: string | null) => {
    set({ selectedAnnotationId: id });
  },

  clearCurrentDesign: () => {
    const { socket, currentDesign } = get();
    if (socket && currentDesign) {
      socket.emit('design:leave', currentDesign.id);
    }
    set({ currentDesign: null, selectedAnnotationId: null });
  },

  exportData: async () => {
    try {
      const res = await fetch('/api/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `designs-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
    }
  },

  importData: async (data: Record<string, Design>) => {
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      get().fetchDesigns();
      return result.imported;
    } catch (err) {
      console.error('Failed to import data:', err);
      return 0;
    }
  }
}));
