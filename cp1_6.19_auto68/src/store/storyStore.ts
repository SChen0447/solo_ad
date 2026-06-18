import { create } from 'zustand';

export interface Segment {
  id: string;
  content: string;
  author: string;
  branchId: string | null;
  createdAt: string;
}

export interface Branch {
  id: string;
  fromSegmentId: string;
  title: string;
  segments: Segment[];
  createdAt: string;
}

export interface Story {
  code: string;
  title: string;
  description: string;
  segments: Segment[];
  branches: Branch[];
  createdAt: string;
  updatedAt: string;
}

export interface StoryListItem {
  code: string;
  title: string;
  description: string;
  segmentCount: number;
  updatedAt: string;
  createdAt: string;
}

interface StoryState {
  currentStory: Story | null;
  storyList: StoryListItem[];
  userNickname: string;
  selectedSegmentId: string | null;
  loading: boolean;
  error: string | null;

  fetchStoryList: () => Promise<void>;
  fetchStory: (code: string) => Promise<void>;
  createStory: (data: { title: string; description: string; firstSegment: string; author: string }) => Promise<Story>;
  addSegment: (code: string, data: { content: string; author: string; branchId?: string | null }) => Promise<Segment>;
  createBranch: (code: string, data: { fromSegmentId: string; title: string; author: string; firstContent: string }) => Promise<Branch>;
  setSelectedSegmentId: (id: string | null) => void;
  setNickname: (name: string) => void;
}

function getStoredNickname(): string {
  try {
    return localStorage.getItem('nickname') || '';
  } catch {
    return '';
  }
}

export const useStoryStore = create<StoryState>((set, get) => ({
  currentStory: null,
  storyList: [],
  userNickname: getStoredNickname(),
  selectedSegmentId: null,
  loading: false,
  error: null,

  fetchStoryList: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/stories');
      if (!res.ok) throw new Error('获取故事列表失败');
      const data = await res.json();
      set({ storyList: data, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  fetchStory: async (code: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`/api/stories/${code}`);
      if (!res.ok) throw new Error('故事不存在');
      const data = await res.json();
      set({ currentStory: data, loading: false, selectedSegmentId: data.segments.length > 0 ? data.segments[data.segments.length - 1].id : null });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  createStory: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '创建失败');
      }
      const story = await res.json();
      set({ currentStory: story, loading: false, selectedSegmentId: story.segments[0]?.id || null });
      return story;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  addSegment: async (code, data) => {
    try {
      const res = await fetch(`/api/stories/${code}/segments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '添加段落失败');
      }
      const segment = await res.json();
      const story = get().currentStory;
      if (story) {
        set({
          currentStory: { ...story, segments: [...story.segments, segment], updatedAt: new Date().toISOString() },
          selectedSegmentId: segment.id,
        });
      }
      return segment;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  createBranch: async (code, data) => {
    try {
      const res = await fetch(`/api/stories/${code}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '创建分支失败');
      }
      const branch = await res.json();
      await get().fetchStory(code);
      return branch;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  setSelectedSegmentId: (id) => set({ selectedSegmentId: id }),

  setNickname: (name: string) => {
    try {
      localStorage.setItem('nickname', name);
    } catch {}
    set({ userNickname: name });
  },
}));
