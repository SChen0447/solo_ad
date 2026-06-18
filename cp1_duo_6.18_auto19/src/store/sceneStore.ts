import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Scene, Message } from '../types';

const SCENES_KEY = 'rp_scenes';
const MESSAGES_KEY = 'rp_messages';
const ACTIVE_SCENE_KEY = 'rp_active_scene';

interface SceneState {
  scenes: Scene[];
  messages: Record<string, Message[]>;
  activeSceneId: string | null;
  setActiveScene: (sceneId: string | null) => void;
  addScene: (name: string, worldBackground: string) => Scene;
  updateScene: (sceneId: string, updates: Partial<Scene>) => void;
  deleteScene: (sceneId: string) => void;
  reorderScenes: (fromIndex: number, toIndex: number) => void;
  addMessage: (sceneId: string, role: 'user' | 'ai', content: string) => Message;
  updateMessage: (messageId: string, content: string) => void;
  deleteMessage: (messageId: string) => void;
  getMessages: (sceneId: string) => Message[];
  importScenes: (scenes: Scene[], messages: Record<string, Message[]>) => void;
}

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return defaultValue;
};

const saveToStorage = <T>(key: string, value: T): void => {
  try {
    setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(value));
    }, 0);
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};

export const useSceneStore = create<SceneState>((set, get) => ({
  scenes: loadFromStorage<Scene[]>(SCENES_KEY, []),
  messages: loadFromStorage<Record<string, Message[]>>(MESSAGES_KEY, {}),
  activeSceneId: loadFromStorage<string | null>(ACTIVE_SCENE_KEY, null),

  setActiveScene: (sceneId: string | null) => {
    set({ activeSceneId: sceneId });
    saveToStorage(ACTIVE_SCENE_KEY, sceneId);
  },

  addScene: (name: string, worldBackground: string): Scene => {
    const now = Date.now();
    const scene: Scene = {
      id: uuidv4(),
      name,
      worldBackground,
      createdAt: now,
      updatedAt: now,
    };
    const newScenes = [...get().scenes, scene];
    set({
      scenes: newScenes,
      activeSceneId: scene.id,
      messages: { ...get().messages, [scene.id]: [] },
    });
    saveToStorage(SCENES_KEY, newScenes);
    saveToStorage(MESSAGES_KEY, get().messages);
    saveToStorage(ACTIVE_SCENE_KEY, scene.id);
    return scene;
  },

  updateScene: (sceneId: string, updates: Partial<Scene>) => {
    const newScenes = get().scenes.map((s) =>
      s.id === sceneId ? { ...s, ...updates, updatedAt: Date.now() } : s
    );
    set({ scenes: newScenes });
    saveToStorage(SCENES_KEY, newScenes);
  },

  deleteScene: (sceneId: string) => {
    const newScenes = get().scenes.filter((s) => s.id !== sceneId);
    const { [sceneId]: _, ...restMessages } = get().messages;
    const activeSceneId = get().activeSceneId === sceneId ? null : get().activeSceneId;
    set({ scenes: newScenes, messages: restMessages, activeSceneId });
    saveToStorage(SCENES_KEY, newScenes);
    saveToStorage(MESSAGES_KEY, restMessages);
    saveToStorage(ACTIVE_SCENE_KEY, activeSceneId);
  },

  reorderScenes: (fromIndex: number, toIndex: number) => {
    const scenes = [...get().scenes];
    const [removed] = scenes.splice(fromIndex, 1);
    scenes.splice(toIndex, 0, removed);
    set({ scenes });
    saveToStorage(SCENES_KEY, scenes);
  },

  addMessage: (sceneId: string, role: 'user' | 'ai', content: string): Message => {
    const message: Message = {
      id: uuidv4(),
      sceneId,
      role,
      content,
      timestamp: Date.now(),
    };
    const sceneMessages = get().messages[sceneId] || [];
    const newSceneMessages = [...sceneMessages, message];
    const newMessages = { ...get().messages, [sceneId]: newSceneMessages };
    set({ messages: newMessages });
    saveToStorage(MESSAGES_KEY, newMessages);
    return message;
  },

  updateMessage: (messageId: string, content: string) => {
    const messages = { ...get().messages };
    for (const sceneId of Object.keys(messages)) {
      const sceneMessages = messages[sceneId];
      const idx = sceneMessages.findIndex((m) => m.id === messageId);
      if (idx !== -1) {
        sceneMessages[idx] = {
          ...sceneMessages[idx],
          content,
          edited: true,
        };
        messages[sceneId] = [...sceneMessages];
        break;
      }
    }
    set({ messages });
    saveToStorage(MESSAGES_KEY, messages);
  },

  deleteMessage: (messageId: string) => {
    const messages = { ...get().messages };
    for (const sceneId of Object.keys(messages)) {
      const sceneMessages = messages[sceneId].filter((m) => m.id !== messageId);
      if (sceneMessages.length !== messages[sceneId].length) {
        messages[sceneId] = sceneMessages;
        break;
      }
    }
    set({ messages });
    saveToStorage(MESSAGES_KEY, messages);
  },

  getMessages: (sceneId: string): Message[] => {
    return get().messages[sceneId] || [];
  },

  importScenes: (scenes: Scene[], messages: Record<string, Message[]>) => {
    const existingScenes = get().scenes;
    const existingMessages = get().messages;
    const mergedScenes = [...existingScenes, ...scenes];
    const mergedMessages = { ...existingMessages, ...messages };
    set({ scenes: mergedScenes, messages: mergedMessages });
    saveToStorage(SCENES_KEY, mergedScenes);
    saveToStorage(MESSAGES_KEY, mergedMessages);
  },
}));
