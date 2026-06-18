import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { UseMetaStore, EventNode, Character, TimelineConfig } from '../types';
import { parseTextAsync } from '../modules/textParser';

const CHARACTER_COLORS = [
  '#e8a87c', '#c38d9e', '#85b79d', '#7c9eb2', '#b58db6',
  '#d4a574', '#88b04b', '#f67280', '#c06c84', '#6c5b7b',
  '#355c7d', '#f8b195', '#f67280', '#c06c84', '#6c5b7b'
];

const initialConfig: TimelineConfig = {
  scale: 1,
  panX: 0,
  panY: 0,
  viewMode: 'timeline',
  highlightedCharacterId: null,
  selectedEventId: null,
  nodeSpacing: 100
};

const initialState = {
  rawText: '',
  events: [] as EventNode[],
  characters: [] as Character[],
  relationships: [] as [],
  config: initialConfig,
  isParsing: false,
  parseError: null as string | null,
  showEditModal: false,
  editingEventId: null as string | null,
  showConfirmModal: false,
  confirmModalType: null as 'reset' | 'delete' | null,
  isLeftPanelCollapsed: false,
  isRightPanelOpen: false
};

export const useMetaStore = create<UseMetaStore>((set, get) => ({
  ...initialState,

  setRawText: (text: string) => {
    set({ rawText: text });
  },

  parseText: async () => {
    const { rawText } = get();
    if (!rawText.trim()) {
      set({ parseError: '请输入或导入文本内容' });
      return;
    }

    set({ isParsing: true, parseError: null });

    try {
      const result = await parseTextAsync(rawText);
      set({
        events: result.events,
        characters: result.characters,
        relationships: result.relationships,
        isParsing: false,
        config: {
          ...get().config,
          scale: 1,
          panX: 0,
          panY: 0
        }
      });
    } catch (error) {
      set({
        isParsing: false,
        parseError: error instanceof Error ? error.message : '解析失败，请重试'
      });
    }
  },

  addEvent: (event: Omit<EventNode, 'id'>) => {
    const newEvent: EventNode = {
      ...event,
      id: uuidv4()
    };
    const events = [...get().events, newEvent];
    const characters = get().characters.map(char => ({
      ...char,
      eventCount: events.filter(e => e.characterIds.includes(char.id)).length
    }));
    set({ events, characters });
  },

  updateEvent: (id: string, updates: Partial<EventNode>) => {
    const events = get().events.map(e =>
      e.id === id ? { ...e, ...updates } : e
    );
    const characters = get().characters.map(char => ({
      ...char,
      eventCount: events.filter(e => e.characterIds.includes(char.id)).length
    }));
    set({ events, characters });
  },

  deleteEvent: (id: string) => {
    const events = get().events.filter(e => e.id !== id);
    const characters = get().characters.map(char => ({
      ...char,
      eventCount: events.filter(e => e.characterIds.includes(char.id)).length
    }));
    set({
      events,
      characters,
      config: {
        ...get().config,
        selectedEventId: get().config.selectedEventId === id ? null : get().config.selectedEventId
      }
    });
  },

  moveEvent: (id: string, newOrder: number) => {
    const events = [...get().events];
    const eventIndex = events.findIndex(e => e.id === id);
    if (eventIndex === -1) return;

    const [movedEvent] = events.splice(eventIndex, 1);
    const clampedNewOrder = Math.max(0, Math.min(newOrder, events.length));
    events.splice(clampedNewOrder, 0, movedEvent);

    const reorderedEvents = events.map((e, index) => ({
      ...e,
      order: index
    }));

    set({ events: reorderedEvents });
  },

  addCharacter: (name: string) => {
    const existing = get().characters.find(c => c.name === name);
    if (existing) return;

    const newChar: Character = {
      id: uuidv4(),
      name,
      color: CHARACTER_COLORS[get().characters.length % CHARACTER_COLORS.length],
      eventCount: 0
    };
    set({ characters: [...get().characters, newChar] });
  },

  updateCharacter: (id: string, updates: Partial<Character>) => {
    set({
      characters: get().characters.map(c =>
        c.id === id ? { ...c, ...updates } : c
      )
    });
  },

  deleteCharacter: (id: string) => {
    const characters = get().characters.filter(c => c.id !== id);
    const events = get().events.map(e => ({
      ...e,
      characterIds: e.characterIds.filter(cid => cid !== id)
    }));
    set({
      characters,
      events,
      config: {
        ...get().config,
        highlightedCharacterId: get().config.highlightedCharacterId === id ? null : get().config.highlightedCharacterId
      }
    });
  },

  setScale: (scale: number) => {
    const clampedScale = Math.max(0.5, Math.min(3, scale));
    set({
      config: {
        ...get().config,
        scale: clampedScale
      }
    });
  },

  setPan: (x: number, y: number) => {
    set({
      config: {
        ...get().config,
        panX: x,
        panY: y
      }
    });
  },

  setViewMode: (mode: 'timeline' | 'relationship') => {
    set({
      config: {
        ...get().config,
        viewMode: mode
      }
    });
  },

  setHighlightedCharacter: (id: string | null) => {
    set({
      config: {
        ...get().config,
        highlightedCharacterId: id
      }
    });
  },

  setSelectedEvent: (id: string | null) => {
    set({
      config: {
        ...get().config,
        selectedEventId: id
      }
    });
  },

  setNodeSpacing: (spacing: number) => {
    set({
      config: {
        ...get().config,
        nodeSpacing: Math.max(50, Math.min(200, spacing))
      }
    });
  },

  setShowEditModal: (show: boolean, eventId?: string | null) => {
    set({
      showEditModal: show,
      editingEventId: eventId ?? null
    });
  },

  setShowConfirmModal: (show: boolean, type?: 'reset' | 'delete' | null) => {
    set({
      showConfirmModal: show,
      confirmModalType: type ?? null
    });
  },

  setIsLeftPanelCollapsed: (collapsed: boolean) => {
    set({ isLeftPanelCollapsed: collapsed });
  },

  setIsRightPanelOpen: (open: boolean) => {
    set({ isRightPanelOpen: open });
  },

  exportSVG: () => {
    const svgElement = document.getElementById('timeline-svg');
    if (!svgElement) {
      alert('未找到SVG画布');
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `timeline_${Date.now()}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  },

  reset: () => {
    set(initialState);
  }
}));

export const useTimelineConfig = () => useMetaStore(state => state.config);
export const useEvents = () => useMetaStore(state => state.events);
export const useCharacters = () => useMetaStore(state => state.characters);
export const useRelationships = () => useMetaStore(state => state.relationships);
export const useRawText = () => useMetaStore(state => state.rawText);
