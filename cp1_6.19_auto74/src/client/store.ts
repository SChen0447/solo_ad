import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { Paragraph, Story, OnlineUser, HistoryEntry } from '../shared/types';
import { v4 as uuidv4 } from 'uuid';

interface StoryState {
  storyId: string | null;
  story: Story | null;
  onlineUsers: OnlineUser[];
  currentUserId: string;
  currentUserName: string;
  activeParagraphId: string | null;
  socket: Socket | null;
  highlightParagraphs: Map<string, { updatedBy: string }>;

  setUserName: (name: string) => void;
  createStory: () => Promise<string>;
  joinStory: (id: string) => void;
  addParagraph: (parentId: string | null) => void;
  updateParagraph: (paragraphId: string, content: string) => void;
  forkParagraph: (parentId: string) => void;
  setActiveParagraph: (id: string | null) => void;
  updateTitle: (title: string) => void;
  exportStory: () => string;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  storyId: null,
  story: null,
  onlineUsers: [],
  currentUserId: uuidv4(),
  currentUserName: '',
  activeParagraphId: null,
  socket: null,
  highlightParagraphs: new Map(),

  setUserName: (name) => set({ currentUserName: name }),

  createStory: async () => {
    const res = await fetch('/api/stories', { method: 'POST' });
    const data = await res.json();
    return data.id;
  },

  joinStory: (id) => {
    const socket = io();
    const { currentUserId, currentUserName } = get();

    socket.on('connect', () => {
      socket.emit('join-story', { storyId: id, userName: currentUserName });
    });

    socket.on('story-state', (story: Story) => {
      set({ story, storyId: id });
    });

    socket.on('online-users', (users: OnlineUser[]) => {
      set({ onlineUsers: users });
    });

    socket.on('paragraph-added', (paragraph: Paragraph) => {
      const { story } = get();
      if (!story) return;
      if (story.paragraphs.find((p) => p.id === paragraph.id)) return;
      set({ story: { ...story, paragraphs: [...story.paragraphs, paragraph] } });
    });

    socket.on('paragraph-updated', (data: { id: string; content: string; updatedAt: number; history: HistoryEntry[]; updatedBy: string }) => {
      const { story } = get();
      if (!story) return;
      const paragraphs = story.paragraphs.map((p) =>
        p.id === data.id
          ? { ...p, content: data.content, updatedAt: data.updatedAt, history: data.history }
          : p
      );
      const newHighlight = new Map(get().highlightParagraphs);
      newHighlight.set(data.id, { updatedBy: data.updatedBy });
      set({ story: { ...story, paragraphs }, highlightParagraphs: newHighlight });

      setTimeout(() => {
        const hl = new Map(get().highlightParagraphs);
        hl.delete(data.id);
        set({ highlightParagraphs: hl });
      }, 2000);
    });

    socket.on('paragraph-forked', (paragraph: Paragraph) => {
      const { story } = get();
      if (!story) return;
      if (story.paragraphs.find((p) => p.id === paragraph.id)) return;
      set({ story: { ...story, paragraphs: [...story.paragraphs, paragraph] } });
    });

    socket.on('title-updated', (title: string) => {
      const { story } = get();
      if (!story) return;
      set({ story: { ...story, title } });
    });

    set({ socket, storyId: id });
  },

  addParagraph: (parentId) => {
    const { socket, storyId, currentUserId, currentUserName } = get();
    if (!socket || !storyId) return;
    const paragraph = {
      id: uuidv4(),
      content: '',
      authorId: currentUserId,
      authorName: currentUserName,
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    socket.emit('add-paragraph', { storyId, paragraph });
    set({ activeParagraphId: paragraph.id });
  },

  updateParagraph: (paragraphId, content) => {
    const { socket, storyId, currentUserName } = get();
    if (!socket || !storyId) return;
    socket.emit('update-paragraph', { storyId, paragraphId, content, authorName: currentUserName });
  },

  forkParagraph: (parentId) => {
    const { socket, storyId, currentUserId, currentUserName } = get();
    if (!socket || !storyId) return;
    const newParagraph = {
      id: uuidv4(),
      content: '',
      authorId: currentUserId,
      authorName: currentUserName,
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    socket.emit('fork-paragraph', { storyId, parentId, newParagraph });
    set({ activeParagraphId: newParagraph.id });
  },

  setActiveParagraph: (id) => set({ activeParagraphId: id }),

  updateTitle: (title) => {
    const { socket, storyId } = get();
    if (!socket || !storyId) return;
    socket.emit('update-title', { storyId, title });
  },

  exportStory: () => {
    const { story } = get();
    if (!story) return '{}';
    return JSON.stringify(
      {
        id: story.id,
        title: story.title,
        paragraphs: story.paragraphs.map((p) => ({
          id: p.id,
          content: p.content,
          authorName: p.authorName,
          parentId: p.parentId,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        branches: story.paragraphs
          .filter((p) => p.parentId !== null)
          .map((p) => ({ from: p.parentId, to: p.id })),
      },
      null,
      2
    );
  },
}));
