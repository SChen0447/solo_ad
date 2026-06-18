import { create } from 'zustand';
import axios from 'axios';
import type { Project, ProjectSummary, HealthMetrics, SearchResult, Task, TaskStatus } from './types';

interface AppState {
  projects: ProjectSummary[];
  currentProject: Project | null;
  currentProjectId: string | null;
  health: HealthMetrics | null;
  searchResults: SearchResult[];
  alerts: string[];
  sidebarCollapsed: boolean;
  sidebarWidth: number;

  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  loadHealth: (id: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  createProject: (name: string, members: string[]) => Promise<void>;
  createTask: (projectId: string, data: Partial<Task>) => Promise<void>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  moveTask: (taskId: string, status: TaskStatus) => Promise<void>;
  toggleSidebar: () => void;
  setSidebarWidth: (w: number) => void;
  addAlert: (msg: string) => void;
  dismissAlert: (idx: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  currentProject: null,
  currentProjectId: null,
  health: null,
  searchResults: [],
  alerts: [],
  sidebarCollapsed: false,
  sidebarWidth: 340,

  loadProjects: async () => {
    const { data } = await axios.get<ProjectSummary[]>('/api/projects');
    set({ projects: data });
    if (!get().currentProjectId && data.length > 0) {
      await get().loadProject(data[0].id);
    }
  },

  loadProject: async (id: string) => {
    const { data } = await axios.get<Project>(`/api/projects/${id}`);
    set({ currentProject: data, currentProjectId: id });
    await get().loadHealth(id);
  },

  loadHealth: async (id: string) => {
    try {
      const { data } = await axios.get<HealthMetrics>(`/api/projects/${id}/health`);
      set({ health: data });
      if (data.overloadedMembers.length > 0) {
        const msg = `⚠️ 成员超负荷：${data.overloadedMembers.join('、')}`;
        if (!get().alerts.includes(msg)) {
          get().addAlert(msg);
        }
      }
    } catch {
      /* ignore */
    }
  },

  search: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }
    const { data } = await axios.get<SearchResult[]>('/api/search', { params: { q: query } });
    set({ searchResults: data });
  },

  clearSearch: () => set({ searchResults: [] }),

  createProject: async (name: string, members: string[]) => {
    await axios.post('/api/projects', { name, members });
    await get().loadProjects();
  },

  createTask: async (projectId: string, data: Partial<Task>) => {
    await axios.post(`/api/projects/${projectId}/tasks`, data);
    await get().loadProject(projectId);
  },

  updateTask: async (taskId: string, data: Partial<Task>) => {
    await axios.patch(`/api/tasks/${taskId}`, data);
    const pid = get().currentProjectId;
    if (pid) await get().loadProject(pid);
  },

  moveTask: async (taskId: string, status: TaskStatus) => {
    await axios.put(`/api/tasks/${taskId}/move`, { status });
    const pid = get().currentProjectId;
    if (pid) await get().loadProject(pid);
  },

  toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarWidth: (w: number) => set({ sidebarWidth: w }),

  addAlert: (msg: string) => set(state => ({ alerts: [...state.alerts, msg] })),

  dismissAlert: (idx: number) => set(state => ({ alerts: state.alerts.filter((_, i) => i !== idx) })),
}));
