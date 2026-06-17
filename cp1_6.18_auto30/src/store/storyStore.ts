import { create } from 'zustand';
import type { StoryNode, Connection, User, StoryState } from '@shared/types';

interface StoryStore extends StoryState {
  setNodes: (nodes: StoryNode[]) => void;
  setConnections: (connections: Connection[]) => void;
  addNode: (node: StoryNode) => void;
  updateNode: (node: StoryNode) => void;
  deleteNode: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;
  addConnection: (connection: Connection) => void;
  deleteConnection: (connectionId: string) => void;
  setSelectedNodeId: (nodeId: string | null) => void;
  setEditingNodeId: (nodeId: string | null) => void;
  setOnlineUsers: (users: User[]) => void;
  addOnlineUser: (user: User) => void;
  removeOnlineUser: (userId: string) => void;
  setCurrentUserId: (userId: string) => void;
  setPreviewNodeId: (nodeId: string | null) => void;
  setIsPreviewMode: (isPreview: boolean) => void;
  setEditingByOther: (nodeId: string, userId: string | null) => void;
  getOutgoingConnections: (nodeId: string) => Connection[];
  getNodeById: (nodeId: string) => StoryNode | undefined;
  exportToJSON: () => string;
  exportToTextTree: () => string;
}

export const useStoryStore = create<StoryStore>((set, get) => ({
  nodes: [],
  connections: [],
  selectedNodeId: null,
  editingNodeId: null,
  onlineUsers: [],
  currentUserId: '',
  previewNodeId: null,
  isPreviewMode: false,
  editingByOther: {},

  setNodes: (nodes) => set({ nodes }),
  setConnections: (connections) => set({ connections }),

  addNode: (node) => set((state) => ({
    nodes: [...state.nodes, node],
  })),

  updateNode: (node) => set((state) => ({
    nodes: state.nodes.map((n) => (n.id === node.id ? node : n)),
  })),

  deleteNode: (nodeId) => set((state) => ({
    nodes: state.nodes.filter((n) => n.id !== nodeId),
    connections: state.connections.filter(
      (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
    ),
    selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
  })),

  updateNodePosition: (nodeId, x, y) => set((state) => ({
    nodes: state.nodes.map((n) =>
      n.id === nodeId ? { ...n, x, y } : n
    ),
  })),

  addConnection: (connection) => set((state) => ({
    connections: [...state.connections, connection],
  })),

  deleteConnection: (connectionId) => set((state) => ({
    connections: state.connections.filter((c) => c.id !== connectionId),
  })),

  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
  setEditingNodeId: (nodeId) => set({ editingNodeId: nodeId }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addOnlineUser: (user) => set((state) => ({
    onlineUsers: [...state.onlineUsers, user],
  })),

  removeOnlineUser: (userId) => set((state) => ({
    onlineUsers: state.onlineUsers.filter((u) => u.id !== userId),
  })),

  setCurrentUserId: (userId) => set({ currentUserId: userId }),
  setPreviewNodeId: (nodeId) => set({ previewNodeId: nodeId }),
  setIsPreviewMode: (isPreview) => set({ isPreviewMode: isPreview }),

  setEditingByOther: (nodeId, userId) => set((state) => {
    const newEditingByOther = { ...state.editingByOther };
    if (userId === null) {
      delete newEditingByOther[nodeId];
    } else {
      newEditingByOther[nodeId] = userId;
    }
    return { editingByOther: newEditingByOther };
  }),

  getOutgoingConnections: (nodeId) => {
    return get().connections.filter((c) => c.fromNodeId === nodeId);
  },

  getNodeById: (nodeId) => {
    return get().nodes.find((n) => n.id === nodeId);
  },

  exportToJSON: () => {
    const { nodes, connections } = get();
    return JSON.stringify({ nodes, connections }, null, 2);
  },

  exportToTextTree: () => {
    const { nodes, connections } = get();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const outgoingMap = new Map<string, Connection[]>();
    
    connections.forEach((c) => {
      if (!outgoingMap.has(c.fromNodeId)) {
        outgoingMap.set(c.fromNodeId, []);
      }
      outgoingMap.get(c.fromNodeId)!.push(c);
    });

    const rootNodes = nodes.filter(
      (n) => !connections.some((c) => c.toNodeId === n.id)
    );

    const lines: string[] = [];
    
    const printNode = (nodeId: string, prefix: string, isLast: boolean, visited: Set<string>) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = nodeMap.get(nodeId);
      if (!node) return;

      const connector = isLast ? '└── ' : '├── ';
      lines.push(`${prefix}${connector}${node.title}`);
      
      const children = outgoingMap.get(nodeId) || [];
      const newPrefix = prefix + (isLast ? '    ' : '│   ');
      
      children.forEach((child, index) => {
        printNode(child.toNodeId, newPrefix, index === children.length - 1, visited);
      });
    };

    rootNodes.forEach((root, index) => {
      const visited = new Set<string>();
      printNode(root.id, '', index === rootNodes.length - 1, visited);
    });

    return lines.join('\n');
  },
}));
