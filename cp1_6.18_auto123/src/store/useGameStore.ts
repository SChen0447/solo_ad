import { create } from 'zustand';
import type {
  Project,
  Version,
  Bug,
  BugStatus,
  AnnouncementData,
} from '../types';

interface GameState {
  projects: Project[];
  currentProject: Project | null;
  versions: Version[];
  bugs: Bug[];
  activeTab: 'versions' | 'bugs' | 'announcement';
  loading: boolean;
  announcementMarkdown: string;
  announcementHtml: string;

  fetchProjects: () => Promise<void>;
  setCurrentProject: (project: Project) => void;
  addProject: (data: {
    name: string;
    description: string;
    icon: string;
  }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  fetchVersions: (projectId: string) => Promise<void>;
  addVersion: (
    projectId: string,
    data: {
      version: string;
      date: string;
      summary: string;
      items: { category: string; description: string }[];
    }
  ) => Promise<void>;
  deleteVersion: (id: string) => Promise<void>;
  fetchBugs: (projectId: string) => Promise<void>;
  addBug: (
    projectId: string,
    data: {
      title: string;
      severity: string;
      description: string;
      reporter: string;
    }
  ) => Promise<void>;
  updateBugStatus: (id: string, status: BugStatus) => Promise<void>;
  deleteBug: (id: string) => Promise<void>;
  setActiveTab: (tab: 'versions' | 'bugs' | 'announcement') => void;
  generateAnnouncement: (data: AnnouncementData) => Promise<void>;
  updateProject: (
    id: string,
    data: Partial<Pick<Project, 'name' | 'description'>>
  ) => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  projects: [],
  currentProject: null,
  versions: [],
  bugs: [],
  activeTab: 'versions',
  loading: false,
  announcementMarkdown: '',
  announcementHtml: '',

  fetchProjects: async () => {
    set({ loading: true });
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const projects: Project[] = await res.json();
      set({ projects });
    } catch (error) {
      console.error('fetchProjects error:', error);
    } finally {
      set({ loading: false });
    }
  },

  setCurrentProject: (project: Project) => {
    set({ currentProject: project });
    get().fetchVersions(project.id);
    get().fetchBugs(project.id);
  },

  addProject: async (data) => {
    set({ loading: true });
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add project');
      await get().fetchProjects();
    } catch (error) {
      console.error('addProject error:', error);
    } finally {
      set({ loading: false });
    }
  },

  deleteProject: async (id) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete project');
      const { currentProject } = get();
      if (currentProject?.id === id) {
        set({ currentProject: null, versions: [], bugs: [] });
      }
      await get().fetchProjects();
    } catch (error) {
      console.error('deleteProject error:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchVersions: async (projectId) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`);
      if (!res.ok) throw new Error('Failed to fetch versions');
      const versions: Version[] = await res.json();
      set({ versions });
    } catch (error) {
      console.error('fetchVersions error:', error);
    } finally {
      set({ loading: false });
    }
  },

  addVersion: async (projectId, data) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/projects/${projectId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add version');
      await get().fetchVersions(projectId);
    } catch (error) {
      console.error('addVersion error:', error);
    } finally {
      set({ loading: false });
    }
  },

  deleteVersion: async (id) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/versions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete version');
      const { currentProject } = get();
      if (currentProject) {
        await get().fetchVersions(currentProject.id);
      }
    } catch (error) {
      console.error('deleteVersion error:', error);
    } finally {
      set({ loading: false });
    }
  },

  fetchBugs: async (projectId) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/projects/${projectId}/bugs`);
      if (!res.ok) throw new Error('Failed to fetch bugs');
      const bugs: Bug[] = await res.json();
      set({ bugs });
    } catch (error) {
      console.error('fetchBugs error:', error);
    } finally {
      set({ loading: false });
    }
  },

  addBug: async (projectId, data) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/projects/${projectId}/bugs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add bug');
      await get().fetchBugs(projectId);
    } catch (error) {
      console.error('addBug error:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateBugStatus: async (id, status) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/bugs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, updatedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error('Failed to update bug status');
      const { currentProject } = get();
      if (currentProject) {
        await get().fetchBugs(currentProject.id);
      }
    } catch (error) {
      console.error('updateBugStatus error:', error);
    } finally {
      set({ loading: false });
    }
  },

  deleteBug: async (id) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/bugs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete bug');
      const { currentProject } = get();
      if (currentProject) {
        await get().fetchBugs(currentProject.id);
      }
    } catch (error) {
      console.error('deleteBug error:', error);
    } finally {
      set({ loading: false });
    }
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  generateAnnouncement: async (data) => {
    set({ loading: true });
    try {
      const res = await fetch('/api/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to generate announcement');
      const result = await res.json();
      set({
        announcementMarkdown: result.markdown ?? '',
        announcementHtml: result.html ?? '',
      });
    } catch (error) {
      console.error('generateAnnouncement error:', error);
    } finally {
      set({ loading: false });
    }
  },

  updateProject: async (id, data) => {
    set({ loading: true });
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update project');
      await get().fetchProjects();
    } catch (error) {
      console.error('updateProject error:', error);
    } finally {
      set({ loading: false });
    }
  },
}));
