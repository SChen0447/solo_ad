import { create } from 'zustand';
import {
  Wall,
  SoundSource,
  Point,
  RoomConfig,
  PresetType,
  createWall,
  createSoundSource,
} from '../simulation/roomModel';
import { ReflectionPath } from '../simulation/waveSimulator';

export type ToolMode = 'wall' | 'source' | 'select' | 'none';

interface DrawingState {
  isDrawing: boolean;
  currentPoints: Point[];
}

interface AcousticStore {
  walls: Wall[];
  sources: SoundSource[];
  selectedSourceId: string | null;
  toolMode: ToolMode;
  drawing: DrawingState;
  isSimulating: boolean;
  simulationStartTime: number | null;
  reflectionPaths: ReflectionPath[];
  heatmap: number[][] | null;
  heatmapInfo: { spl: number; dominantSource: string }[][] | null;
  hoveredPoint: Point | null;
  hoveredInfo: { spl: number; source: string } | null;
  canvasWidth: number;
  canvasHeight: number;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  currentPreset: PresetType | null;

  setToolMode: (mode: ToolMode) => void;
  addWallPoint: (point: Point) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;
  addSource: (type: 'point' | 'line', position: Point) => void;
  selectSource: (id: string | null) => void;
  updateSource: (id: string, updates: Partial<SoundSource>) => void;
  removeSource: (id: string) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  setReflectionPaths: (paths: ReflectionPath[]) => void;
  setHeatmap: (heatmap: number[][] | null) => void;
  setHeatmapInfo: (info: { spl: number; dominantSource: string }[][] | null) => void;
  setHoveredPoint: (point: Point | null) => void;
  setHoveredInfo: (info: { spl: number; source: string } | null) => void;
  setCanvasSize: (width: number, height: number) => void;
  loadPreset: (preset: PresetType) => void;
  setRoomFromConfig: (config: RoomConfig) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  moveWallEndpoint: (wallId: string, which: 'start' | 'end', newPos: Point) => void;
  resetRoom: () => void;
}

export const useAcousticStore = create<AcousticStore>((set, get) => ({
  walls: [],
  sources: [],
  selectedSourceId: null,
  toolMode: 'none',
  drawing: { isDrawing: false, currentPoints: [] },
  isSimulating: false,
  simulationStartTime: null,
  reflectionPaths: [],
  heatmap: null,
  heatmapInfo: null,
  hoveredPoint: null,
  hoveredInfo: null,
  canvasWidth: 800,
  canvasHeight: 600,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  currentPreset: null,

  setToolMode: (mode) => set({ toolMode: mode }),

  addWallPoint: (point) => {
    const { drawing } = get();
    const newPoints = [...drawing.currentPoints, point];
    set({ drawing: { isDrawing: true, currentPoints: newPoints } });
  },

  finishDrawing: () => {
    const { drawing } = get();
    if (drawing.currentPoints.length < 3) {
      set({ drawing: { isDrawing: false, currentPoints: [] } });
      return;
    }
    const newWalls: Wall[] = [];
    const pts = drawing.currentPoints;
    for (let i = 0; i < pts.length; i++) {
      const next = (i + 1) % pts.length;
      const labels = ['北墙', '东墙', '南墙', '西墙', '内墙1', '内墙2', '内墙3'];
      newWalls.push(createWall(pts[i], pts[next], labels[i % labels.length]));
    }
    set((state) => ({
      walls: [...state.walls, ...newWalls],
      drawing: { isDrawing: false, currentPoints: [] },
      toolMode: 'none',
      reflectionPaths: [],
      heatmap: null,
      heatmapInfo: null,
    }));
  },

  cancelDrawing: () => set({ drawing: { isDrawing: false, currentPoints: [] } }),

  addSource: (type, position) => {
    const source = createSoundSource(type, position);
    set((state) => ({
      sources: [...state.sources, source],
      selectedSourceId: source.id,
      reflectionPaths: [],
      heatmap: null,
      heatmapInfo: null,
    }));
  },

  selectSource: (id) => set({ selectedSourceId: id }),

  updateSource: (id, updates) => {
    set((state) => ({
      sources: state.sources.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      reflectionPaths: [],
      heatmap: null,
      heatmapInfo: null,
    }));
  },

  removeSource: (id) => {
    set((state) => ({
      sources: state.sources.filter((s) => s.id !== id),
      selectedSourceId: state.selectedSourceId === id ? null : state.selectedSourceId,
      reflectionPaths: [],
      heatmap: null,
      heatmapInfo: null,
    }));
  },

  startSimulation: () => set({ isSimulating: true, simulationStartTime: Date.now() }),
  stopSimulation: () =>
    set({
      isSimulating: false,
      simulationStartTime: null,
      reflectionPaths: [],
      heatmap: null,
      heatmapInfo: null,
    }),

  setReflectionPaths: (paths) => set({ reflectionPaths: paths }),
  setHeatmap: (heatmap) => set({ heatmap }),
  setHeatmapInfo: (info) => set({ heatmapInfo: info }),
  setHoveredPoint: (point) => set({ hoveredPoint: point }),
  setHoveredInfo: (info) => set({ hoveredInfo: info }),
  setCanvasSize: (width, height) => set({ canvasWidth: width, canvasHeight: height }),

  loadPreset: (preset) => set({ currentPreset: preset }),

  setRoomFromConfig: (config) => {
    set({
      walls: config.walls,
      sources: config.sources,
      currentPreset: null,
      reflectionPaths: [],
      heatmap: null,
      heatmapInfo: null,
      isSimulating: false,
      simulationStartTime: null,
    });
  },

  toggleLeftPanel: () => set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  toggleRightPanel: () => set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed })),

  moveWallEndpoint: (wallId, which, newPos) => {
    set((state) => ({
      walls: state.walls.map((w) =>
        w.id === wallId ? { ...w, [which]: newPos } : w
      ),
      reflectionPaths: [],
      heatmap: null,
      heatmapInfo: null,
    }));
  },

  resetRoom: () =>
    set({
      walls: [],
      sources: [],
      selectedSourceId: null,
      toolMode: 'none',
      drawing: { isDrawing: false, currentPoints: [] },
      isSimulating: false,
      simulationStartTime: null,
      reflectionPaths: [],
      heatmap: null,
      heatmapInfo: null,
      currentPreset: null,
    }),
}));
