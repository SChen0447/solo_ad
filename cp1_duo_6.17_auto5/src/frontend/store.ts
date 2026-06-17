import { create } from 'zustand';
import {
  ConceptNode,
  Connection,
  Collaborator,
  RoomState,
  NodeStyle,
  AnalysisResult,
  DEFAULT_NODE_STYLE,
} from './types';

interface CanvasStore {
  roomId: string | null;
  currentUser: Collaborator | null;
  nodes: ConceptNode[];
  connections: Connection[];
  collaborators: Collaborator[];
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  highlightedNodeIds: string[];
  currentStyle: NodeStyle;
  analysisResults: AnalysisResult[];
  isAIPanelOpen: boolean;
  isConnecting: boolean;
  connectingFromNodeId: string | null;
  zoom: number;
  panX: number;
  panY: number;

  setRoomState: (state: RoomState) => void;
  setCurrentUser: (user: Collaborator) => void;
  setRoomId: (roomId: string) => void;
  addNode: (node: ConceptNode) => void;
  updateNode: (node: ConceptNode) => void;
  deleteNode: (nodeId: string) => void;
  addConnection: (connection: Connection) => void;
  deleteConnection: (connectionId: string) => void;
  addCollaborator: (user: Collaborator) => void;
  removeCollaborator: (userId: string) => void;
  updateCollaboratorCursor: (userId: string, x: number, y: number) => void;
  selectNode: (nodeId: string | null) => void;
  selectConnection: (connectionId: string | null) => void;
  setHighlightedNodes: (nodeIds: string[]) => void;
  setCurrentStyle: (style: Partial<NodeStyle>) => void;
  setAnalysisResults: (results: AnalysisResult[]) => void;
  setAIPanelOpen: (open: boolean) => void;
  startConnecting: (fromNodeId: string) => void;
  cancelConnecting: () => void;
  finishConnecting: () => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetCanvas: () => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  roomId: null,
  currentUser: null,
  nodes: [],
  connections: [],
  collaborators: [],
  selectedNodeId: null,
  selectedConnectionId: null,
  highlightedNodeIds: [],
  currentStyle: DEFAULT_NODE_STYLE,
  analysisResults: [],
  isAIPanelOpen: false,
  isConnecting: false,
  connectingFromNodeId: null,
  zoom: 1,
  panX: 0,
  panY: 0,

  setRoomState: (state) =>
    set({
      roomId: state.roomId,
      nodes: state.nodes,
      connections: state.connections,
      collaborators: state.collaborators,
    }),

  setCurrentUser: (user) => set({ currentUser: user }),
  setRoomId: (roomId) => set({ roomId }),

  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  updateNode: (node) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === node.id ? node : n)),
    })),
  deleteNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      connections: state.connections.filter(
        (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
      ),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
    })),

  addConnection: (connection) =>
    set((state) => ({ connections: [...state.connections, connection] })),
  deleteConnection: (connectionId) =>
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== connectionId),
      selectedConnectionId:
        state.selectedConnectionId === connectionId ? null : state.selectedConnectionId,
    })),

  addCollaborator: (user) =>
    set((state) => ({
      collaborators: [...state.collaborators.filter((c) => c.id !== user.id), user],
    })),
  removeCollaborator: (userId) =>
    set((state) => ({
      collaborators: state.collaborators.filter((c) => c.id !== userId),
    })),
  updateCollaboratorCursor: (userId, x, y) =>
    set((state) => ({
      collaborators: state.collaborators.map((c) =>
        c.id === userId
          ? { ...c, cursorX: x, cursorY: y, lastActive: Date.now() }
          : c
      ),
    })),

  selectNode: (nodeId) =>
    set({ selectedNodeId: nodeId, selectedConnectionId: null }),
  selectConnection: (connectionId) =>
    set({ selectedConnectionId: connectionId, selectedNodeId: null }),

  setHighlightedNodes: (nodeIds) => set({ highlightedNodeIds: nodeIds }),
  setCurrentStyle: (style) =>
    set((state) => ({ currentStyle: { ...state.currentStyle, ...style } })),
  setAnalysisResults: (results) => set({ analysisResults: results }),
  setAIPanelOpen: (open) => set({ isAIPanelOpen: open }),

  startConnecting: (fromNodeId) =>
    set({ isConnecting: true, connectingFromNodeId: fromNodeId }),
  cancelConnecting: () =>
    set({ isConnecting: false, connectingFromNodeId: null }),
  finishConnecting: () =>
    set({ isConnecting: false, connectingFromNodeId: null }),

  setZoom: (zoom) => set({ zoom }),
  setPan: (x, y) => set({ panX: x, panY: y }),

  resetCanvas: () =>
    set({
      nodes: [],
      connections: [],
      selectedNodeId: null,
      selectedConnectionId: null,
      highlightedNodeIds: [],
      analysisResults: [],
      isAIPanelOpen: false,
      zoom: 1,
      panX: 0,
      panY: 0,
    }),
}));
