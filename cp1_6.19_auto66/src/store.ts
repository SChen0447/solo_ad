import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Frame,
  PathNode,
  ExhibitionHall,
  Artwork,
  ExportData,
  DEFAULT_HALL,
  FRAME_TEMPLATES,
  WALL_SNAP_DISTANCE,
} from './types';

interface ExhibitionStore {
  hall: ExhibitionHall;
  frames: Frame[];
  pathNodes: PathNode[];
  selectedFrameId: string | null;
  selectedPathNodeId: string | null;
  editingFrameId: string | null;
  sidePanelOpen: boolean;
  layersPanelOpen: boolean;

  setHall: (updates: Partial<ExhibitionHall>) => void;
  addFrame: (templateIndex: number, x: number, y: number) => string;
  moveFrame: (id: string, x: number, y: number) => void;
  updateFrame: (id: string, updates: Partial<Frame>) => void;
  deleteFrame: (id: string) => void;
  setFrameArtwork: (frameId: string, artwork: Artwork) => void;
  toggleFrameVisibility: (id: string) => void;
  selectFrame: (id: string | null) => void;
  selectPathNode: (id: string | null) => void;
  setEditingFrame: (id: string | null) => void;
  toggleSidePanel: () => void;
  toggleLayersPanel: () => void;
  updateCollisionStates: () => void;
  generatePath: () => void;
  movePathNode: (id: string, x: number, y: number) => void;
  exportLayout: () => string;
  importLayout: (json: string) => void;
}

function checkCollision(a: Frame, b: Frame): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function snapToWalls(
  x: number,
  y: number,
  fw: number,
  fh: number,
  hallW: number,
  hallD: number
): { x: number; y: number } {
  let sx = x;
  let sy = y;

  const snapDist = WALL_SNAP_DISTANCE;

  if (x < snapDist) {
    sx = 0;
  } else if (x + fw > hallW - snapDist) {
    sx = hallW - fw;
  }

  if (y < snapDist) {
    sy = 0;
  } else if (y + fh > hallD - snapDist) {
    sy = hallD - fh;
  }

  return { x: sx, y: sy };
}

function generateSPath(frames: Frame[], hallW: number, hallD: number): PathNode[] {
  if (frames.length === 0) return [];

  const margin = 50;
  const nodes: PathNode[] = [];

  nodes.push({
    id: uuidv4(),
    x: margin,
    y: hallD - margin,
    order: 0,
  });

  const sortedByY = [...frames]
    .filter((f) => f.visible)
    .sort((a, b) => a.y - b.y);

  if (sortedByY.length === 0) {
    nodes.push({
      id: uuidv4(),
      x: hallW / 2,
      y: hallD / 2,
      order: 1,
    });
    return nodes;
  }

  const rows = 3;
  const rowHeight = (hallD - margin * 2) / rows;

  for (let i = 0; i < rows; i++) {
    const rowTop = margin + i * rowHeight;
    const rowBottom = rowTop + rowHeight;

    const rowFrames = sortedByY.filter(
      (f) => f.y + f.height / 2 >= rowTop && f.y + f.height / 2 < rowBottom
    );

    const goRight = i % 2 === 0;

    if (goRight) {
      nodes.push({
        id: uuidv4(),
        x: margin,
        y: rowTop + rowHeight / 2,
        order: nodes.length,
      });

      const sortedX = rowFrames.sort((a, b) => a.x - b.x);
      for (const f of sortedX) {
        const nodeX = f.x + f.width / 2;
        const nodeY = f.y + f.height + 40;
        if (nodeY < hallD - margin) {
          nodes.push({ id: uuidv4(), x: nodeX, y: nodeY, order: nodes.length });
        }
      }

      nodes.push({
        id: uuidv4(),
        x: hallW - margin,
        y: rowTop + rowHeight / 2,
        order: nodes.length,
      });
    } else {
      nodes.push({
        id: uuidv4(),
        x: hallW - margin,
        y: rowTop + rowHeight / 2,
        order: nodes.length,
      });

      const sortedX = rowFrames.sort((a, b) => b.x - a.x);
      for (const f of sortedX) {
        const nodeX = f.x + f.width / 2;
        const nodeY = f.y + f.height + 40;
        if (nodeY < hallD - margin) {
          nodes.push({ id: uuidv4(), x: nodeX, y: nodeY, order: nodes.length });
        }
      }

      nodes.push({
        id: uuidv4(),
        x: margin,
        y: rowTop + rowHeight / 2,
        order: nodes.length,
      });
    }
  }

  return nodes;
}

export const useExhibitionStore = create<ExhibitionStore>((set, get) => ({
  hall: { id: uuidv4(), ...DEFAULT_HALL },
  frames: [],
  pathNodes: [],
  selectedFrameId: null,
  selectedPathNodeId: null,
  editingFrameId: null,
  sidePanelOpen: true,
  layersPanelOpen: false,

  setHall: (updates) =>
    set((state) => ({ hall: { ...state.hall, ...updates } })),

  addFrame: (templateIndex, x, y) => {
    const tpl = FRAME_TEMPLATES[templateIndex] ?? FRAME_TEMPLATES[0];
    const hall = get().hall;
    const snapped = snapToWalls(x, y, tpl.width, tpl.height, hall.width, hall.depth);
    const id = uuidv4();
    const newFrame: Frame = {
      id,
      x: snapped.x,
      y: snapped.y,
      width: tpl.width,
      height: tpl.height,
      frameColor: '#FFFFFF',
      visible: true,
      isColliding: false,
      rotation: 0,
      artwork: null,
    };
    set((state) => {
      const frames = [...state.frames, newFrame];
      const updatedFrames = frames.map((f) => {
        if (f.id === id) return f;
        const colliding = frames.some(
          (other) => other.id !== f.id && checkCollision(f, other)
        );
        return { ...f, isColliding: colliding };
      });
      const currentNew = updatedFrames.find((f) => f.id === id)!;
      const newColliding = updatedFrames.some(
        (other) => other.id !== id && checkCollision(currentNew, other)
      );
      const finalFrames = updatedFrames.map((f) =>
        f.id === id ? { ...f, isColliding: newColliding } : f
      );
      return { frames: finalFrames, selectedFrameId: id };
    });
    return id;
  },

  moveFrame: (id, x, y) =>
    set((state) => {
      const hall = state.hall;
      const snapped = snapToWalls(
        x,
        y,
        state.frames.find((f) => f.id === id)?.width ?? 0,
        state.frames.find((f) => f.id === id)?.height ?? 0,
        hall.width,
        hall.depth
      );
      const frames = state.frames.map((f) =>
        f.id === id ? { ...f, x: snapped.x, y: snapped.y } : f
      );
      const updatedFrames = frames.map((f) => {
        const colliding = frames.some(
          (other) => other.id !== f.id && checkCollision(f, other)
        );
        return { ...f, isColliding: colliding };
      });
      return { frames: updatedFrames };
    }),

  updateFrame: (id, updates) =>
    set((state) => ({
      frames: state.frames.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),

  deleteFrame: (id) =>
    set((state) => {
      const frames = state.frames
        .filter((f) => f.id !== id)
        .map((f) => {
          const colliding = state.frames.some(
            (other) => other.id !== f.id && other.id !== id && checkCollision(f, other)
          );
          return { ...f, isColliding: colliding };
        });
      return {
        frames,
        selectedFrameId:
          state.selectedFrameId === id ? null : state.selectedFrameId,
        editingFrameId:
          state.editingFrameId === id ? null : state.editingFrameId,
      };
    }),

  setFrameArtwork: (frameId, artwork) =>
    set((state) => ({
      frames: state.frames.map((f) =>
        f.id === frameId ? { ...f, artwork } : f
      ),
    })),

  toggleFrameVisibility: (id) =>
    set((state) => ({
      frames: state.frames.map((f) =>
        f.id === id ? { ...f, visible: !f.visible } : f
      ),
    })),

  selectFrame: (id) => set({ selectedFrameId: id, selectedPathNodeId: null }),

  selectPathNode: (id) => set({ selectedPathNodeId: id, selectedFrameId: null }),

  setEditingFrame: (id) => set({ editingFrameId: id }),

  toggleSidePanel: () => set((state) => ({ sidePanelOpen: !state.sidePanelOpen })),

  toggleLayersPanel: () =>
    set((state) => ({ layersPanelOpen: !state.layersPanelOpen })),

  updateCollisionStates: () =>
    set((state) => {
      const frames = state.frames.map((f) => {
        const colliding = state.frames.some(
          (other) => other.id !== f.id && checkCollision(f, other)
        );
        return { ...f, isColliding: colliding };
      });
      return { frames };
    }),

  generatePath: () =>
    set((state) => {
      const pathNodes = generateSPath(
        state.frames,
        state.hall.width,
        state.hall.depth
      );
      return { pathNodes };
    }),

  movePathNode: (id, x, y) =>
    set((state) => ({
      pathNodes: state.pathNodes.map((n) =>
        n.id === id ? { ...n, x, y } : n
      ),
    })),

  exportLayout: () => {
    const { hall, frames, pathNodes } = get();
    const data: ExportData = { hall, frames, pathNodes };
    return JSON.stringify(data, null, 2);
  },

  importLayout: (json) => {
    try {
      const data: ExportData = JSON.parse(json);
      set({
        hall: data.hall,
        frames: data.frames,
        pathNodes: data.pathNodes,
        selectedFrameId: null,
        selectedPathNodeId: null,
        editingFrameId: null,
      });
    } catch {
      console.error('Failed to import layout');
    }
  },
}));
