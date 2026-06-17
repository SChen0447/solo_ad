import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { ConceptNode, Connection, CameraMode, Vector3, NodeType } from '@/types/conceptTypes';

interface ConceptState {
  nodes: ConceptNode[];
  connections: Connection[];
  cameraMode: CameraMode;
  focusedNodeId: string | null;
  forceSimulationEnabled: boolean;
  editingNodeId: string | null;
  radialMenuPosition: Vector3 | null;
  showRadialMenu: boolean;
  connectingFromId: string | null;
  tempConnectionEnd: Vector3 | null;

  addNode: (type: NodeType, position: Vector3, color: string) => void;
  updateNode: (id: string, updates: Partial<ConceptNode>) => void;
  removeNode: (id: string) => void;
  updateNodePosition: (id: string, position: Vector3) => void;
  updateNodeVelocity: (id: string, velocity: Vector3) => void;
  updateAllNodeVelocities: (updates: Record<string, Vector3>) => void;
  setAllNodePositions: (positions: Record<string, Vector3>) => void;

  addConnection: (fromId: string, toId: string) => void;
  removeConnection: (id: string) => void;

  setCameraMode: (mode: CameraMode) => void;
  setFocusedNodeId: (id: string | null) => void;
  toggleForceSimulation: () => void;
  setForceSimulationEnabled: (enabled: boolean) => void;

  setEditingNodeId: (id: string | null) => void;
  openRadialMenu: (position: Vector3) => void;
  closeRadialMenu: () => void;
  startConnection: (fromId: string) => void;
  updateTempConnectionEnd: (position: Vector3 | null) => void;
  finishConnection: (toId: string) => void;
  cancelConnection: () => void;
}

const initialNodes: ConceptNode[] = [
  {
    id: 'init-core-1',
    type: 'core',
    title: '核心概念',
    description: '这是一个核心概念节点，作为思维网络的中心',
    color: '#4c6ef5',
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    isFixed: true,
    createdAt: Date.now(),
  },
  {
    id: 'init-attr-1',
    type: 'attribute',
    title: '属性A',
    description: '核心概念的重要属性',
    color: '#51cf66',
    position: { x: 4, y: 1, z: 2 },
    velocity: { x: 0, y: 0, z: 0 },
    isFixed: false,
    createdAt: Date.now() + 1,
  },
  {
    id: 'init-attr-2',
    type: 'attribute',
    title: '属性B',
    description: '另一个关键属性',
    color: '#f06595',
    position: { x: -3, y: -1, z: 3 },
    velocity: { x: 0, y: 0, z: 0 },
    isFixed: false,
    createdAt: Date.now() + 2,
  },
  {
    id: 'init-rel-1',
    type: 'relation',
    title: '关联点',
    description: '连接多个概念的纽带',
    color: '#ffa94d',
    position: { x: 2, y: 3, z: -3 },
    velocity: { x: 0, y: 0, z: 0 },
    isFixed: false,
    createdAt: Date.now() + 3,
  },
];

const initialConnections: Connection[] = [
  { id: 'conn-1', fromId: 'init-core-1', toId: 'init-attr-1', createdAt: Date.now() },
  { id: 'conn-2', fromId: 'init-core-1', toId: 'init-attr-2', createdAt: Date.now() + 1 },
  { id: 'conn-3', fromId: 'init-core-1', toId: 'init-rel-1', createdAt: Date.now() + 2 },
  { id: 'conn-4', fromId: 'init-attr-1', toId: 'init-rel-1', createdAt: Date.now() + 3 },
];

export const useConceptStore = create<ConceptState>((set, get) => ({
  nodes: initialNodes,
  connections: initialConnections,
  cameraMode: 'free',
  focusedNodeId: null,
  forceSimulationEnabled: true,
  editingNodeId: null,
  radialMenuPosition: null,
  showRadialMenu: false,
  connectingFromId: null,
  tempConnectionEnd: null,

  addNode: (type, position, color) => {
    const newNode: ConceptNode = {
      id: uuidv4(),
      type,
      title: type === 'core' ? '核心概念' : type === 'attribute' ? '属性节点' : '关联节点',
      description: '',
      color,
      position: { ...position },
      velocity: { x: 0, y: 0, z: 0 },
      isFixed: false,
      createdAt: Date.now(),
    };
    set((state) => ({ nodes: [...state.nodes, newNode], editingNodeId: newNode.id, showRadialMenu: false }));
  },

  updateNode: (id, updates) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    }));
  },

  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      connections: state.connections.filter((c) => c.fromId !== id && c.toId !== id),
      editingNodeId: state.editingNodeId === id ? null : state.editingNodeId,
      focusedNodeId: state.focusedNodeId === id ? null : state.focusedNodeId,
    }));
  },

  updateNodePosition: (id, position) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, position: { ...position }, velocity: { x: 0, y: 0, z: 0 } } : n
      ),
    }));
  },

  updateNodeVelocity: (id, velocity) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, velocity: { ...velocity } } : n)),
    }));
  },

  updateAllNodeVelocities: (updates) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (updates[n.id] ? { ...n, velocity: { ...updates[n.id] } } : n)),
    }));
  },

  setAllNodePositions: (positions) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        positions[n.id] && !n.isFixed ? { ...n, position: { ...positions[n.id] } } : n
      ),
    }));
  },

  addConnection: (fromId, toId) => {
    const { connections } = get();
    const exists = connections.some(
      (c) =>
        (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId)
    );
    if (fromId === toId || exists) return;
    const newConn: Connection = {
      id: uuidv4(),
      fromId,
      toId,
      createdAt: Date.now(),
    };
    set((state) => ({ connections: [...state.connections, newConn] }));
  },

  removeConnection: (id) => {
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
    }));
  },

  setCameraMode: (mode) => set({ cameraMode: mode }),
  setFocusedNodeId: (id) => set({ focusedNodeId: id }),
  toggleForceSimulation: () =>
    set((state) => ({ forceSimulationEnabled: !state.forceSimulationEnabled })),
  setForceSimulationEnabled: (enabled) => set({ forceSimulationEnabled: enabled }),

  setEditingNodeId: (id) => set({ editingNodeId: id }),

  openRadialMenu: (position) =>
    set({ radialMenuPosition: { ...position }, showRadialMenu: true }),
  closeRadialMenu: () => set({ showRadialMenu: false, radialMenuPosition: null }),

  startConnection: (fromId) => set({ connectingFromId: fromId }),
  updateTempConnectionEnd: (position) =>
    set({ tempConnectionEnd: position ? { ...position } : null }),
  finishConnection: (toId) => {
    const { connectingFromId, addConnection } = get();
    if (connectingFromId) {
      addConnection(connectingFromId, toId);
    }
    set({ connectingFromId: null, tempConnectionEnd: null });
  },
  cancelConnection: () => set({ connectingFromId: null, tempConnectionEnd: null }),
}));
