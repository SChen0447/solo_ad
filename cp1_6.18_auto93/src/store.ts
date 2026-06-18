import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  MindMapNode,
  CanvasState,
  MindMapData,
  DEFAULT_COLOR,
  DEFAULT_FONT_SIZE,
  DEFAULT_BORDER_RADIUS,
  DEFAULT_SHADOW_BLUR,
  DEFAULT_NODE_SPACING,
  MIN_ZOOM,
  MAX_ZOOM,
  CENTER_NODE_RADIUS,
  CHILD_NODE_HEIGHT,
  CHILD_NODE_MIN_WIDTH,
  CHILD_NODE_PADDING_X,
  MACARON_COLORS,
} from './types';

interface StoreState extends CanvasState {
  nodes: MindMapNode[];
  animationNodes: Map<string, { x: number; y: number }>;
  addNode: (parentId: string | null, x: number, y: number, text?: string) => MindMapNode;
  updateNode: (id: string, updates: Partial<MindMapNode>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setOffset: (x: number, y: number) => void;
  setNodeSpacing: (spacing: number) => void;
  setHoveredNode: (id: string | null) => void;
  setEditingNode: (id: string | null) => void;
  updateNodeStyle: (id: string, style: Partial<{
    color: string;
    fontSize: number;
    borderRadius: number;
    shadowBlur: number;
  }>) => void;
  exportToJSON: () => MindMapData;
  importFromJSON: (data: MindMapData) => void;
  getSelectedNode: () => MindMapNode | null;
  getChildNodes: (parentId: string) => MindMapNode[];
  calculateNodeSize: (text: string, fontSize: number, isRoot: boolean) => { width: number; height: number };
  layoutNodes: () => void;
  resetMap: () => void;
}

const measureTextWidth = (text: string, fontSize: number): number => {
  if (typeof canvas === 'undefined') {
    return text.length * fontSize * 0.6;
  }
  return 0;
};

let tempCanvas: HTMLCanvasElement | null = null;
const getTextWidth = (text: string, fontSize: number): number => {
  if (typeof window === 'undefined') {
    return text.length * fontSize * 0.6;
  }
  if (!tempCanvas) {
    tempCanvas = document.createElement('canvas');
  }
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) return text.length * fontSize * 0.6;
  ctx.font = `${fontSize}px sans-serif`;
  return ctx.measureText(text).width;
};

const createInitialState = (): { nodes: MindMapNode[] } => {
  const centerNode: MindMapNode = {
    id: uuidv4(),
    text: '中心主题',
    x: 0,
    y: 0,
    color: DEFAULT_COLOR,
    fontSize: DEFAULT_FONT_SIZE,
    borderRadius: DEFAULT_BORDER_RADIUS,
    shadowBlur: DEFAULT_SHADOW_BLUR,
    parentId: null,
    collapsed: false,
    width: CENTER_NODE_RADIUS * 2,
    height: CENTER_NODE_RADIUS * 2,
  };

  const childTexts = ['想法一', '想法二', '想法三'];
  const childNodes: MindMapNode[] = childTexts.map((text, i) => {
    const width = Math.max(CHILD_NODE_MIN_WIDTH, getTextWidth(text, DEFAULT_FONT_SIZE) + CHILD_NODE_PADDING_X * 2);
    return {
      id: uuidv4(),
      text,
      x: 200,
      y: (i - 1) * (CHILD_NODE_HEIGHT + DEFAULT_NODE_SPACING),
      color: MACARON_COLORS[(i + 1) % MACARON_COLORS.length],
      fontSize: DEFAULT_FONT_SIZE,
      borderRadius: DEFAULT_BORDER_RADIUS,
      shadowBlur: DEFAULT_SHADOW_BLUR,
      parentId: centerNode.id,
      collapsed: false,
      width,
      height: CHILD_NODE_HEIGHT,
    };
  });

  return { nodes: [centerNode, ...childNodes] };
};

export const useMindMapStore = create<StoreState>((set, get) => {
  const initial = createInitialState();

  return {
    nodes: initial.nodes,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    selectedNodeId: null,
    nodeSpacing: DEFAULT_NODE_SPACING,
    hoveredNodeId: null,
    editingNodeId: null,
    animationNodes: new Map(),

    addNode: (parentId: string | null, x: number, y: number, text = '新节点') => {
      const isRoot = parentId === null;
      const fontSize = DEFAULT_FONT_SIZE;
      const colorIndex = isRoot ? 0 : Math.floor(Math.random() * MACARON_COLORS.length);
      const width = isRoot
        ? CENTER_NODE_RADIUS * 2
        : Math.max(CHILD_NODE_MIN_WIDTH, getTextWidth(text, fontSize) + CHILD_NODE_PADDING_X * 2);
      const height = isRoot ? CENTER_NODE_RADIUS * 2 : CHILD_NODE_HEIGHT;

      const newNode: MindMapNode = {
        id: uuidv4(),
        text,
        x,
        y,
        color: MACARON_COLORS[colorIndex],
        fontSize,
        borderRadius: DEFAULT_BORDER_RADIUS,
        shadowBlur: DEFAULT_SHADOW_BLUR,
        parentId,
        collapsed: false,
        width,
        height,
      };

      set((state) => ({
        nodes: [...state.nodes, newNode],
        selectedNodeId: newNode.id,
      }));

      return newNode;
    },

    updateNode: (id: string, updates: Partial<MindMapNode>) => {
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === id ? { ...node, ...updates } : node
        ),
      }));
    },

    deleteNode: (id: string) => {
      const { nodes } = get();
      const nodeToDelete = nodes.find((n) => n.id === id);
      if (!nodeToDelete) return;

      const getDescendants = (nodeId: string): string[] => {
        const children = nodes.filter((n) => n.parentId === nodeId);
        return [nodeId, ...children.flatMap((c) => getDescendants(c.id))];
      };

      const idsToDelete = new Set(getDescendants(id));

      set((state) => ({
        nodes: state.nodes.filter((n) => !idsToDelete.has(n.id)),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      }));
    },

    selectNode: (id: string | null) => {
      set({ selectedNodeId: id, editingNodeId: null });
    },

    setZoom: (zoom: number) => {
      const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
      set({ zoom: clamped });
    },

    setOffset: (x: number, y: number) => {
      set({ offsetX: x, offsetY: y });
    },

    setNodeSpacing: (spacing: number) => {
      set({ nodeSpacing: spacing });
      get().layoutNodes();
    },

    setHoveredNode: (id: string | null) => {
      set({ hoveredNodeId: id });
    },

    setEditingNode: (id: string | null) => {
      set({ editingNodeId: id });
    },

    updateNodeStyle: (id, style) => {
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === id ? { ...node, ...style } : node
        ),
      }));
    },

    exportToJSON: () => {
      const { nodes, zoom, offsetX, offsetY, nodeSpacing } = get();
      return {
        nodes,
        zoom,
        offsetX,
        offsetY,
        nodeSpacing,
        version: '1.0.0',
      };
    },

    importFromJSON: (data: MindMapData) => {
      set({
        nodes: data.nodes,
        zoom: data.zoom,
        offsetX: data.offsetX,
        offsetY: data.offsetY,
        nodeSpacing: data.nodeSpacing,
        selectedNodeId: null,
        hoveredNodeId: null,
        editingNodeId: null,
      });
    },

    getSelectedNode: () => {
      const { nodes, selectedNodeId } = get();
      return nodes.find((n) => n.id === selectedNodeId) || null;
    },

    getChildNodes: (parentId: string) => {
      return get().nodes.filter((n) => n.parentId === parentId);
    },

    calculateNodeSize: (text: string, fontSize: number, isRoot: boolean) => {
      if (isRoot) {
        return { width: CENTER_NODE_RADIUS * 2, height: CENTER_NODE_RADIUS * 2 };
      }
      const width = Math.max(CHILD_NODE_MIN_WIDTH, getTextWidth(text, fontSize) + CHILD_NODE_PADDING_X * 2);
      return { width, height: CHILD_NODE_HEIGHT };
    },

    layoutNodes: () => {
      const { nodes, nodeSpacing } = get();
      const rootNodes = nodes.filter((n) => n.parentId === null);
      if (rootNodes.length === 0) return;

      const root = rootNodes[0];
      const newPositions = new Map<string, { x: number; y: number }>();

      const layoutChildren = (parent: MindMapNode, level: number) => {
        const children = nodes.filter((n) => n.parentId === parent.id);
        if (children.length === 0) return;

        const totalHeight = children.reduce((sum, c) => sum + c.height, 0) +
          (children.length - 1) * nodeSpacing;

        let currentY = parent.y - totalHeight / 2 + children[0].height / 2;

        children.forEach((child) => {
          const x = parent.x + parent.width / 2 + 120 + level * 80;
          const y = currentY;
          newPositions.set(child.id, { x, y });
          currentY += child.height + nodeSpacing;
          layoutChildren(child, level + 1);
        });
      };

      layoutChildren(root, 0);

      set((state) => ({
        nodes: state.nodes.map((node) => {
          const pos = newPositions.get(node.id);
          if (pos) {
            return { ...node, x: pos.x, y: pos.y };
          }
          return node;
        }),
      }));
    },

    resetMap: () => {
      const initial = createInitialState();
      set({
        nodes: initial.nodes,
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        selectedNodeId: null,
        hoveredNodeId: null,
        editingNodeId: null,
        nodeSpacing: DEFAULT_NODE_SPACING,
      });
    },
  };
});
