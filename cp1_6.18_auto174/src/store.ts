import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  JourneyNode,
  Connection,
  NodeType,
  NODE_DEFAULT_WIDTH,
  NODE_DEFAULT_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  NODE_TEMPLATES,
  MIN_BORDER_RADIUS,
  MAX_BORDER_RADIUS,
  NODE_MIN_HEIGHT,
  NODE_MAX_HEIGHT,
  MIN_LINE_WIDTH,
  MAX_LINE_WIDTH,
} from './types';

interface CanvasStore {
  nodes: JourneyNode[];
  connections: Connection[];
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  zoom: number;
  panX: number;
  panY: number;

  addNode: (type: NodeType, x: number, y: number) => void;
  updateNode: (id: string, updates: Partial<JourneyNode>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;

  addConnection: (
    sourceId: string,
    targetId: string,
    sourcePort: 'bottom' | 'right',
    targetPort: 'top' | 'left'
  ) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  selectConnection: (id: string | null) => void;

  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;

  clearSelection: () => void;
  deleteSelected: () => void;

  resetView: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  nodes: [],
  connections: [],
  selectedNodeId: null,
  selectedConnectionId: null,
  zoom: 1,
  panX: 0,
  panY: 0,

  addNode: (type: NodeType, x: number, y: number) => {
    const template = NODE_TEMPLATES.find((t) => t.type === type);
    if (!template) return;

    const newNode: JourneyNode = {
      id: uuidv4(),
      type,
      x,
      y,
      width: NODE_DEFAULT_WIDTH,
      height: NODE_DEFAULT_HEIGHT,
      label: template.label,
      color: template.defaultColor,
      borderRadius: 8,
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: newNode.id,
      selectedConnectionId: null,
    }));
  },

  updateNode: (id: string, updates: Partial<JourneyNode>) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              ...updates,
              height: updates.height
                ? Math.max(NODE_MIN_HEIGHT, Math.min(NODE_MAX_HEIGHT, updates.height))
                : node.height,
              borderRadius: updates.borderRadius
                ? Math.max(MIN_BORDER_RADIUS, Math.min(MAX_BORDER_RADIUS, updates.borderRadius))
                : node.borderRadius,
            }
          : node
      ),
    }));
  },

  deleteNode: (id: string) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      connections: state.connections.filter(
        (conn) => conn.sourceId !== id && conn.targetId !== id
      ),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  selectNode: (id: string | null) => {
    set({ selectedNodeId: id, selectedConnectionId: null });
  },

  addConnection: (
    sourceId: string,
    targetId: string,
    sourcePort: 'bottom' | 'right',
    targetPort: 'top' | 'left'
  ) => {
    const { connections } = get();
    const exists = connections.some(
      (c) =>
        c.sourceId === sourceId &&
        c.targetId === targetId &&
        c.sourcePort === sourcePort &&
        c.targetPort === targetPort
    );
    if (exists) return;

    const newConnection: Connection = {
      id: uuidv4(),
      sourceId,
      targetId,
      label: '过渡',
      lineWidth: 2,
      lineStyle: 'solid',
      color: '#667eea',
      sourcePort,
      targetPort,
    };

    set((state) => ({
      connections: [...state.connections, newConnection],
      selectedConnectionId: newConnection.id,
      selectedNodeId: null,
    }));
  },

  updateConnection: (id: string, updates: Partial<Connection>) => {
    set((state) => ({
      connections: state.connections.map((conn) =>
        conn.id === id
          ? {
              ...conn,
              ...updates,
              lineWidth: updates.lineWidth
                ? Math.max(MIN_LINE_WIDTH, Math.min(MAX_LINE_WIDTH, updates.lineWidth))
                : conn.lineWidth,
            }
          : conn
      ),
    }));
  },

  deleteConnection: (id: string) => {
    set((state) => ({
      connections: state.connections.filter((conn) => conn.id !== id),
      selectedConnectionId:
        state.selectedConnectionId === id ? null : state.selectedConnectionId,
    }));
  },

  selectConnection: (id: string | null) => {
    set({ selectedConnectionId: id, selectedNodeId: null });
  },

  setZoom: (zoom: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    set({ zoom: clampedZoom });
  },

  setPan: (x: number, y: number) => {
    set({ panX: x, panY: y });
  },

  clearSelection: () => {
    set({ selectedNodeId: null, selectedConnectionId: null });
  },

  deleteSelected: () => {
    const { selectedNodeId, selectedConnectionId, deleteNode, deleteConnection } = get();
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    }
    if (selectedConnectionId) {
      deleteConnection(selectedConnectionId);
    }
  },

  resetView: () => {
    set({ zoom: 1, panX: 0, panY: 0 });
  },
}));
