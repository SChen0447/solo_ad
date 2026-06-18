import { create } from 'zustand';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
}

export interface TimeRecord {
  start: number;
  end: number | null;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'high' | 'medium' | 'low';
  createdAt: number;
  totalTime: number;
  isRunning: boolean;
  currentStartTime: number | null;
  timeRecords: TimeRecord[];
}

interface TaskStore {
  projects: Project[];
  tasks: Task[];
  selectedProjectId: string | null;
  searchQuery: string;
  sidebarOpen: boolean;
  selectedTask: Task | null;
  socket: Socket | null;

  initSocket: () => void;
  disconnectSocket: () => void;

  fetchProjects: () => Promise<void>;
  createProject: (name: string, description: string) => Promise<void>;
  selectProject: (id: string | null) => void;

  fetchTasks: (projectId: string) => Promise<void>;
  createTask: (projectId: string, title: string, description: string, priority: Task['priority']) => Promise<void>;
  moveTask: (taskId: string, newStatus: Task['status']) => void;

  startTimer: (taskId: string) => void;
  pauseTimer: (taskId: string) => void;

  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
  setSelectedTask: (task: Task | null) => void;

  getFilteredProjects: () => Project[];
  getTasksByStatus: (status: Task['status']) => Task[];
}

const API_BASE = '/api';

export const useTaskStore = create<TaskStore>((set, get) => ({
  projects: [],
  tasks: [],
  selectedProjectId: null,
  searchQuery: '',
  sidebarOpen: true,
  selectedTask: null,
  socket: null,

  initSocket: () => {
    const socket = io('http://localhost:3001');

    socket.on('timer:started', ({ taskId, isRunning, currentStartTime, totalTime }) => {
      set(state => {
        const updatedTasks = state.tasks.map(t =>
          t.id === taskId
            ? { ...t, isRunning, currentStartTime, totalTime }
            : t
        );
        let updatedSelectedTask = state.selectedTask;
        if (state.selectedTask && state.selectedTask.id === taskId) {
          updatedSelectedTask = {
            ...state.selectedTask,
            isRunning,
            currentStartTime,
            totalTime
          };
        }
        return { tasks: updatedTasks, selectedTask: updatedSelectedTask };
      });
    });

    socket.on('timer:paused', ({ taskId, isRunning, totalTime, timeRecords }) => {
      set(state => {
        const updatedTasks = state.tasks.map(t =>
          t.id === taskId
            ? { ...t, isRunning, totalTime, timeRecords, currentStartTime: null }
            : t
        );
        let updatedSelectedTask = state.selectedTask;
        if (state.selectedTask && state.selectedTask.id === taskId) {
          updatedSelectedTask = {
            ...state.selectedTask,
            isRunning,
            totalTime,
            timeRecords,
            currentStartTime: null
          };
        }
        return { tasks: updatedTasks, selectedTask: updatedSelectedTask };
      });
    });

    socket.on('task:moved', ({ taskId, newStatus }) => {
      set(state => {
        const updatedTasks = state.tasks.map(t =>
          t.id === taskId ? { ...t, status: newStatus } : t
        );
        let updatedSelectedTask = state.selectedTask;
        if (state.selectedTask && state.selectedTask.id === taskId) {
          updatedSelectedTask = {
            ...state.selectedTask,
            status: newStatus
          };
        }
        return { tasks: updatedTasks, selectedTask: updatedSelectedTask };
      });
    });

    socket.on('task:created', (task: Task) => {
      const { selectedProjectId } = get();
      if (task.projectId === selectedProjectId) {
        set(state => ({
          tasks: [...state.tasks, task]
        }));
      }
    });

    socket.on('project:created', (project: Project) => {
      set(state => ({
        projects: [...state.projects, project]
      }));
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  fetchProjects: async () => {
    try {
      const response = await axios.get<Project[]>(`${API_BASE}/projects`);
      set({ projects: response.data });
      if (response.data.length > 0 && !get().selectedProjectId) {
        set({ selectedProjectId: response.data[0].id });
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  },

  createProject: async (name, description) => {
    try {
      const response = await axios.post<Project>(`${API_BASE}/projects`, {
        name,
        description
      });
      set(state => ({
        projects: [...state.projects, response.data]
      }));
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  },

  selectProject: (id) => {
    set({ selectedProjectId: id });
    if (id) {
      get().fetchTasks(id);
    }
  },

  fetchTasks: async (projectId) => {
    try {
      const response = await axios.get<Task[]>(
        `${API_BASE}/projects/${projectId}/tasks`
      );
      set({ tasks: response.data });
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  },

  createTask: async (projectId, title, description, priority) => {
    try {
      const response = await axios.post<Task>(`${API_BASE}/tasks`, {
        projectId,
        title,
        description,
        priority
      });
      set(state => ({
        tasks: [...state.tasks, response.data]
      }));
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  },

  moveTask: (taskId, newStatus) => {
    const { socket } = get();
    const task = get().tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    }));

    if (socket) {
      socket.emit('task:move', { taskId, newStatus });
    }

    axios.patch(`${API_BASE}/tasks/${taskId}`, { status: newStatus }).catch(err => {
      console.error('Failed to update task status:', err);
    });
  },

  startTimer: (taskId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('timer:start', { taskId });
    }
  },

  pauseTimer: (taskId) => {
    const { socket } = get();
    if (socket) {
      socket.emit('timer:pause', { taskId });
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  toggleSidebar: () => {
    set(state => ({ sidebarOpen: !state.sidebarOpen }));
  },

  setSelectedTask: (task) => {
    set({ selectedTask: task });
  },

  getFilteredProjects: () => {
    const { projects, searchQuery } = get();
    if (!searchQuery.trim()) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(
      p => p.name.toLowerCase().includes(query) ||
           p.description.toLowerCase().includes(query)
    );
  },

  getTasksByStatus: (status) => {
    return get().tasks.filter(t => t.status === status);
  }
}));
