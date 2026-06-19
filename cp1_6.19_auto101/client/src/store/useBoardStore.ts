import { create } from 'zustand';
import type { Task, Column, Comment } from '@shared/types';

interface BoardState {
  tasks: Task[];
  columns: Column[];
  searchQuery: string;
  selectedTask: Task | null;
  isModalOpen: boolean;
  isAddColumnOpen: boolean;
  isLoading: boolean;
  
  fetchData: () => Promise<void>;
  moveTask: (taskId: string, columnId: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  addColumn: (title: string) => Promise<void>;
  addComment: (taskId: string, content: string, author: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  openModal: (task: Task) => void;
  closeModal: () => void;
  openAddColumn: () => void;
  closeAddColumn: () => void;
  getFilteredTasks: (columnId: string) => Task[];
}

export const useBoardStore = create<BoardState>((set, get) => ({
  tasks: [],
  columns: [],
  searchQuery: '',
  selectedTask: null,
  isModalOpen: false,
  isAddColumnOpen: false,
  isLoading: false,

  fetchData: async () => {
    set({ isLoading: true });
    try {
      const [tasksRes, columnsRes] = await Promise.all([
        fetch('/api/tasks'),
        fetch('/api/columns'),
      ]);
      const tasks = await tasksRes.json();
      const columns = await columnsRes.json();
      set({ tasks, columns, isLoading: false });
    } catch (error) {
      console.error('加载数据失败:', error);
      set({ isLoading: false });
    }
  },

  moveTask: async (taskId: string, columnId: string) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) return;

    const previousColumnId = task.columnId;
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, columnId } : t
      ),
    }));

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId }),
      });
    } catch (error) {
      console.error('移动任务失败:', error);
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? { ...t, columnId: previousColumnId } : t
        ),
      }));
    }
  },

  updateTask: async (taskId: string, updates: Partial<Task>) => {
    const oldTask = get().tasks.find(t => t.id === taskId);
    if (!oldTask) return;

    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
      selectedTask: state.selectedTask?.id === taskId
        ? { ...state.selectedTask, ...updates }
        : state.selectedTask,
    }));

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (error) {
      console.error('更新任务失败:', error);
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? oldTask : t
        ),
      }));
    }
  },

  addColumn: async (title: string) => {
    try {
      const res = await fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const newColumn = await res.json();
      set(state => ({
        columns: [...state.columns, newColumn],
      }));
    } catch (error) {
      console.error('添加列失败:', error);
    }
  },

  addComment: async (taskId: string, content: string, author: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, author }),
      });
      const newComment: Comment = await res.json();
      
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId
            ? { ...t, comments: [newComment, ...t.comments] }
            : t
        ),
        selectedTask: state.selectedTask?.id === taskId
          ? { ...state.selectedTask, comments: [newComment, ...state.selectedTask.comments] }
          : state.selectedTask,
      }));
    } catch (error) {
      console.error('添加评论失败:', error);
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  openModal: (task: Task) => set({ selectedTask: task, isModalOpen: true }),
  closeModal: () => set({ isModalOpen: false, selectedTask: null }),

  openAddColumn: () => set({ isAddColumnOpen: true }),
  closeAddColumn: () => set({ isAddColumnOpen: false }),

  getFilteredTasks: (columnId: string) => {
    const { tasks, searchQuery } = get();
    const query = searchQuery.toLowerCase().trim();
    
    return tasks.filter(task => {
      const matchesColumn = task.columnId === columnId;
      if (!query) return matchesColumn;
      
      const matchesSearch =
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query);
      return matchesColumn && matchesSearch;
    });
  },
}));
