import { create } from 'zustand';
import type { Stroke, Shape, Note, NoteColor, WSMessage, DrawingMode } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface CanvasState {
  strokes: Stroke[];
  shapes: Shape[];
  notes: Note[];
}

interface WhiteboardState {
  strokes: Stroke[];
  shapes: Shape[];
  notes: Note[];
  drawingMode: DrawingMode;
  penColor: string;
  penWidth: number;
  noteColor: NoteColor;
  connected: boolean;
  userCount: number;
  history: CanvasState[];
  historyIndex: number;
  fading: boolean;

  ws: WebSocket | null;
  sendMessage: (msg: WSMessage) => void;
  connect: () => void;

  setDrawingMode: (mode: DrawingMode) => void;
  setPenColor: (c: string) => void;
  setPenWidth: (w: number) => void;
  setNoteColor: (c: NoteColor) => void;

  addStroke: (stroke: Stroke) => void;
  addShape: (shape: Shape) => void;
  addNote: () => void;
  moveNote: (id: string, x: number, y: number) => void;
  editNote: (id: string, text: string) => void;
  deleteNote: (id: string) => void;
  changeNoteColor: (id: string, color: NoteColor) => void;

  undo: () => void;
  redo: () => void;
  clear: () => void;

  loadSnapshot: (strokes: Stroke[], shapes: Shape[], notes: Note[]) => void;
  setUserCount: (count: number) => void;
  pushHistory: () => void;
}

const MAX_HISTORY = 50;

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  strokes: [],
  shapes: [],
  notes: [],
  drawingMode: 'pen',
  penColor: '#000000',
  penWidth: 3,
  noteColor: 'yellow',
  connected: false,
  userCount: 0,
  history: [],
  historyIndex: -1,
  fading: false,
  ws: null,

  connect: () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => set({ connected: true });
    ws.onclose = () => set({ connected: false });
    ws.onerror = () => set({ connected: false });

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);
        switch (msg.type) {
          case 'snapshot':
            get().loadSnapshot(
              msg.payload.strokes || [],
              msg.payload.shapes || [],
              msg.payload.notes || [],
            );
            break;
          case 'stroke-add':
            set(s => ({ strokes: [...s.strokes, msg.payload as Stroke] }));
            break;
          case 'shape-add':
            set(s => ({ shapes: [...s.shapes, msg.payload as Shape] }));
            break;
          case 'note-add':
            set(s => ({ notes: [...s.notes, msg.payload as Note] }));
            break;
          case 'note-move': {
            const p = msg.payload as { id: string; x: number; y: number };
            set(s => ({
              notes: s.notes.map(n => n.id === p.id ? { ...n, x: p.x, y: p.y } : n),
            }));
            break;
          }
          case 'note-edit': {
            const p = msg.payload as { id: string; text: string };
            set(s => ({
              notes: s.notes.map(n => n.id === p.id ? { ...n, text: p.text } : n),
            }));
            break;
          }
          case 'note-delete': {
            const p = msg.payload as { id: string };
            set(s => ({ notes: s.notes.filter(n => n.id !== p.id) }));
            break;
          }
          case 'note-color': {
            const p = msg.payload as { id: string; color: NoteColor };
            set(s => ({
              notes: s.notes.map(n => n.id === p.id ? { ...n, color: p.color } : n),
            }));
            break;
          }
          case 'clear':
            set({ strokes: [], shapes: [], notes: [] });
            break;
          case 'user-count':
            set({ userCount: msg.payload as number });
            break;
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    set({ ws });
  },

  sendMessage: (msg: WSMessage) => {
    const ws = get().ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  },

  setDrawingMode: (mode) => set({ drawingMode: mode }),
  setPenColor: (c) => set({ penColor: c }),
  setPenWidth: (w) => set({ penWidth: w }),
  setNoteColor: (c) => set({ noteColor: c }),

  addStroke: (stroke: Stroke) => {
    get().pushHistory();
    set(s => ({ strokes: [...s.strokes, stroke] }));
    get().sendMessage({ type: 'stroke-add', payload: stroke });
  },

  addShape: (shape: Shape) => {
    get().pushHistory();
    set(s => ({ shapes: [...s.shapes, shape] }));
    get().sendMessage({ type: 'shape-add', payload: shape });
  },

  addNote: () => {
    get().pushHistory();
    const canvasEl = document.querySelector('.whiteboard-canvas');
    const rect = canvasEl?.getBoundingClientRect();
    const cx = rect ? rect.width / 2 : 400;
    const cy = rect ? rect.height / 2 : 300;
    const note: Note = {
      id: uuidv4(),
      x: cx - 60,
      y: cy - 40,
      text: '',
      color: get().noteColor,
    };
    set(s => ({ notes: [...s.notes, note] }));
    get().sendMessage({ type: 'note-add', payload: note });
  },

  moveNote: (id, x, y) => {
    set(s => ({
      notes: s.notes.map(n => n.id === id ? { ...n, x, y } : n),
    }));
    get().sendMessage({ type: 'note-move', payload: { id, x, y } });
  },

  editNote: (id, text) => {
    set(s => ({
      notes: s.notes.map(n => n.id === id ? { ...n, text } : n),
    }));
    get().sendMessage({ type: 'note-edit', payload: { id, text } });
  },

  deleteNote: (id) => {
    get().pushHistory();
    set(s => ({ notes: s.notes.filter(n => n.id !== id) }));
    get().sendMessage({ type: 'note-delete', payload: { id } });
  },

  changeNoteColor: (id, color) => {
    set(s => ({
      notes: s.notes.map(n => n.id === id ? { ...n, color } : n),
    }));
    get().sendMessage({ type: 'note-color', payload: { id, color } });
  },

  pushHistory: () => {
    const { strokes, shapes, notes, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      strokes: JSON.parse(JSON.stringify(strokes)),
      shapes: JSON.parse(JSON.stringify(shapes)),
      notes: JSON.parse(JSON.stringify(notes)),
    });
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < 0) return;
    set({ fading: true });
    setTimeout(() => {
      const entry = history[historyIndex];
      if (entry) {
        set({
          strokes: JSON.parse(JSON.stringify(entry.strokes)),
          shapes: JSON.parse(JSON.stringify(entry.shapes)),
          notes: JSON.parse(JSON.stringify(entry.notes)),
          historyIndex: historyIndex - 1,
          fading: false,
        });
        get().sendMessage({ type: 'clear', payload: null });
        entry.strokes.forEach(s => get().sendMessage({ type: 'stroke-add', payload: s }));
        entry.shapes.forEach(sh => get().sendMessage({ type: 'shape-add', payload: sh }));
        entry.notes.forEach(n => get().sendMessage({ type: 'note-add', payload: n }));
      } else {
        set({ fading: false });
      }
    }, 200);
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    set({ fading: true });
    setTimeout(() => {
      const newIndex = historyIndex + 1;
      const entry = history[newIndex];
      if (entry) {
        set({
          strokes: JSON.parse(JSON.stringify(entry.strokes)),
          shapes: JSON.parse(JSON.stringify(entry.shapes)),
          notes: JSON.parse(JSON.stringify(entry.notes)),
          historyIndex: newIndex,
          fading: false,
        });
        get().sendMessage({ type: 'clear', payload: null });
        entry.strokes.forEach(s => get().sendMessage({ type: 'stroke-add', payload: s }));
        entry.shapes.forEach(sh => get().sendMessage({ type: 'shape-add', payload: sh }));
        entry.notes.forEach(n => get().sendMessage({ type: 'note-add', payload: n }));
      } else {
        set({ fading: false });
      }
    }, 200);
  },

  clear: () => {
    get().pushHistory();
    set({ strokes: [], shapes: [], notes: [] });
    get().sendMessage({ type: 'clear', payload: null });
  },

  loadSnapshot: (strokes, shapes, notes) => {
    set({ strokes, shapes, notes });
  },

  setUserCount: (count) => set({ userCount: count }),
}));
