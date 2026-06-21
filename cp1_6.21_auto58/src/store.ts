import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Project, VideoEntry, VideoStatus, ViewMode } from './types';
import { loadFromStorage, saveToStorageDebounced } from './utils/storage';

interface AppState {
  projects: Project[];
  videos: VideoEntry[];
  selectedProjectId: string | null;
  viewMode: ViewMode;
  calendarDate: string;
  calendarMode: 'month' | 'day';

  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;

  addVideo: (video: Omit<VideoEntry, 'id' | 'createdAt' | 'sortOrder'>) => void;
  updateVideo: (id: string, data: Partial<VideoEntry>) => void;
  deleteVideo: (id: string) => void;
  deleteVideos: (ids: string[]) => void;
  moveVideoToProject: (videoIds: string[], targetProjectId: string) => void;
  updateVideoStatus: (id: string, status: VideoStatus) => void;
  reorderVideos: (projectId: string, orderedIds: string[]) => void;
  delayVideoToTomorrow: (id: string) => void;

  setViewMode: (mode: ViewMode) => void;
  setSelectedProjectId: (id: string | null) => void;
  setCalendarDate: (date: string) => void;
  setCalendarMode: (mode: 'month' | 'day') => void;
}

const initial = loadFromStorage();

function persist(state: { projects: Project[]; videos: VideoEntry[] }) {
  saveToStorageDebounced({ projects: state.projects, videos: state.videos });
}

export const useStore = create<AppState>((set, get) => ({
  projects: initial.projects as Project[],
  videos: initial.videos as VideoEntry[],
  selectedProjectId: null,
  viewMode: 'projects',
  calendarDate: new Date().toISOString().slice(0, 10),
  calendarMode: 'month',

  addProject: (project) => {
    const newProject: Project = {
      ...project,
      id: uuidv4(),
      createdAt: Date.now(),
    };
    set((s) => {
      const projects = [...s.projects, newProject];
      persist({ ...s, projects });
      return { projects };
    });
  },

  updateProject: (id, data) => {
    set((s) => {
      const projects = s.projects.map((p) => (p.id === id ? { ...p, ...data } : p));
      persist({ ...s, projects });
      return { projects };
    });
  },

  deleteProject: (id) => {
    set((s) => {
      const projects = s.projects.filter((p) => p.id !== id);
      const videos = s.videos.filter((v) => v.projectId !== id);
      persist({ ...s, projects, videos });
      return {
        projects,
        videos,
        selectedProjectId: s.selectedProjectId === id ? null : s.selectedProjectId,
      };
    });
  },

  addVideo: (video) => {
    const projectVideos = get().videos.filter((v) => v.projectId === video.projectId);
    const newVideo: VideoEntry = {
      ...video,
      id: uuidv4(),
      sortOrder: projectVideos.length,
      createdAt: Date.now(),
    };
    set((s) => {
      const videos = [...s.videos, newVideo];
      persist({ ...s, videos });
      return { videos };
    });
  },

  updateVideo: (id, data) => {
    set((s) => {
      const videos = s.videos.map((v) => (v.id === id ? { ...v, ...data } : v));
      persist({ ...s, videos });
      return { videos };
    });
  },

  deleteVideo: (id) => {
    set((s) => {
      const videos = s.videos.filter((v) => v.id !== id);
      persist({ ...s, videos });
      return { videos };
    });
  },

  deleteVideos: (ids) => {
    const idSet = new Set(ids);
    set((s) => {
      const videos = s.videos.filter((v) => !idSet.has(v.id));
      persist({ ...s, videos });
      return { videos };
    });
  },

  moveVideoToProject: (videoIds, targetProjectId) => {
    set((s) => {
      const targetVideos = s.videos.filter((v) => v.projectId === targetProjectId);
      const baseSort = targetVideos.length;
      const videos = s.videos.map((v, idx) => {
        if (videoIds.includes(v.id)) {
          return { ...v, projectId: targetProjectId, sortOrder: baseSort + idx };
        }
        return v;
      });
      persist({ ...s, videos });
      return { videos };
    });
  },

  updateVideoStatus: (id, status) => {
    set((s) => {
      const videos = s.videos.map((v) => (v.id === id ? { ...v, status } : v));
      persist({ ...s, videos });
      return { videos };
    });
  },

  reorderVideos: (projectId, orderedIds) => {
    set((s) => {
      const orderMap = new Map(orderedIds.map((id, idx) => [id, idx]));
      const videos = s.videos.map((v) => {
        if (v.projectId === projectId && orderMap.has(v.id)) {
          return { ...v, sortOrder: orderMap.get(v.id)! };
        }
        return v;
      });
      persist({ ...s, videos });
      return { videos };
    });
  },

  delayVideoToTomorrow: (id) => {
    set((s) => {
      const videos = s.videos.map((v) => {
        if (v.id === id) {
          const d = new Date(v.plannedTime);
          d.setDate(d.getDate() + 1);
          const newTime = d.toISOString().slice(0, 16);
          return { ...v, plannedTime: newTime, status: 'pending' as VideoStatus };
        }
        return v;
      });
      persist({ ...s, videos });
      return { videos };
    });
  },

  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
  setCalendarDate: (date) => set({ calendarDate: date }),
  setCalendarMode: (mode) => set({ calendarMode: mode }),
}));
