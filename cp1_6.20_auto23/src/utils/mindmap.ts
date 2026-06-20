import { MindMapData, MindMapNode } from '@typeDefs/index';
import { v4 as uuidv4 } from 'uuid';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 56;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 40;
const ROOT_COLOR = '#1a73e8';
const LEVEL_COLORS = ['#34a853', '#fbbc04', '#ea4335', '#9334e6', '#e91e63'];

export const generateId = (): string => {
  return uuidv4();
};

export const createInitialMindMap = (rootText = '中心主题'): MindMapData => {
  const rootId = generateId();
  const rootNode: MindMapNode = {
    id: rootId,
    text: rootText,
    parentId: null,
    x: 0,
    y: 0,
    color: ROOT_COLOR,
    level: 0,
    children: [],
  };
  return {
    rootId,
    nodes: {
      [rootId]: rootNode,
    },
  };
};

export const addNode = (
  data: MindMapData,
  parentId: string,
  text = '新节点'
): { data: MindMapData; newNodeId: string } => {
  const parentNode = data.nodes[parentId];
  if (!parentNode) return { data, newNodeId: '' };

  const newId = generateId();
  const level = parentNode.level + 1;
  const color = LEVEL_COLORS[level % LEVEL_COLORS.length];

  const newNode: MindMapNode = {
    id: newId,
    text,
    parentId,
    x: 0,
    y: 0,
    color,
    level,
    children: [],
  };

  const newNodes = { ...data.nodes };
  newNodes[newId] = newNode;
  newNodes[parentId] = {
    ...parentNode,
    children: [...parentNode.children, newId],
  };

  const newData = {
    ...data,
    nodes: newNodes,
  };

  return {
    data: layoutMindMap(newData),
    newNodeId: newId,
  };
};

export const deleteNode = (
  data: MindMapData,
  nodeId: string
): MindMapData => {
  if (nodeId === data.rootId) return data;

  const node = data.nodes[nodeId];
  if (!node) return data;

  const newNodes = { ...data.nodes };

  const deleteRecursive = (id: string) => {
    const n = newNodes[id];
    if (n) {
      n.children.forEach((childId) => deleteRecursive(childId));
      delete newNodes[id];
    }
  };

  if (node.parentId) {
    const parent = newNodes[node.parentId];
    if (parent) {
      newNodes[node.parentId] = {
        ...parent,
        children: parent.children.filter((id) => id !== nodeId),
      };
    }
  }

  deleteRecursive(nodeId);

  return layoutMindMap({
    ...data,
    nodes: newNodes,
  });
};

export const updateNode = (
  data: MindMapData,
  nodeId: string,
  updates: Partial<MindMapNode>
): MindMapData => {
  const node = data.nodes[nodeId];
  if (!node) return data;

  const newData = {
    ...data,
    nodes: {
      ...data.nodes,
      [nodeId]: { ...node, ...updates },
    },
  };

  return newData;
};

export const moveNode = (
  data: MindMapData,
  nodeId: string,
  newParentId: string
): MindMapData => {
  const node = data.nodes[nodeId];
  const newParent = data.nodes[newParentId];

  if (!node || !newParent) return data;
  if (node.parentId === newParentId) return data;
  if (isDescendant(data, newParentId, nodeId)) return data;

  const newNodes = { ...data.nodes };

  if (node.parentId) {
    const oldParent = newNodes[node.parentId];
    if (oldParent) {
      newNodes[node.parentId] = {
        ...oldParent,
        children: oldParent.children.filter((id) => id !== nodeId),
      };
    }
  }

  newNodes[newParentId] = {
    ...newParent,
    children: [...newParent.children, nodeId],
  };

  const levelDiff = newParent.level + 1 - node.level;
  const updateLevels = (id: string, diff: number) => {
    const n = newNodes[id];
    if (n) {
      newNodes[id] = { ...n, level: n.level + diff };
      n.children.forEach((childId) => updateLevels(childId, diff));
    }
  };

  updateLevels(nodeId, levelDiff);

  newNodes[nodeId] = {
    ...newNodes[nodeId],
    parentId: newParentId,
    color: LEVEL_COLORS[(newParent.level + 1) % LEVEL_COLORS.length],
  };

  return layoutMindMap({
    ...data,
    nodes: newNodes,
  });
};

const isDescendant = (
  data: MindMapData,
  nodeId: string,
  ancestorId: string
): boolean => {
  const node = data.nodes[nodeId];
  if (!node) return false;
  if (nodeId === ancestorId) return true;
  if (node.parentId === null) return false;
  return isDescendant(data, node.parentId, ancestorId);
};

export const layoutMindMap = (data: MindMapData): MindMapData => {
  const newNodes = { ...data.nodes };

  const calculateSubtreeHeight = (nodeId: string): number => {
    const node = newNodes[nodeId];
    if (!node || node.children.length === 0) {
      return NODE_HEIGHT;
    }

    let totalHeight = 0;
    node.children.forEach((childId) => {
      totalHeight += calculateSubtreeHeight(childId);
    });
    totalHeight += (node.children.length - 1) * VERTICAL_GAP;

    return Math.max(NODE_HEIGHT, totalHeight);
  };

  const layoutNode = (
    nodeId: string,
    x: number,
    y: number,
    direction: 'right' | 'left'
  ) => {
    const node = newNodes[nodeId];
    if (!node) return;

    newNodes[nodeId] = { ...node, x, y };

    if (node.children.length === 0) return;

    const subtreeHeights = node.children.map((childId) =>
      calculateSubtreeHeight(childId)
    );
    const totalHeight =
      subtreeHeights.reduce((sum, h) => sum + h, 0) +
      (node.children.length - 1) * VERTICAL_GAP;

    let currentY = y - totalHeight / 2;
    const childX = direction === 'right'
      ? x + NODE_WIDTH + HORIZONTAL_GAP
      : x - NODE_WIDTH - HORIZONTAL_GAP;

    node.children.forEach((childId, index) => {
      const childHeight = subtreeHeights[index];
      const childY = currentY + childHeight / 2;
      layoutNode(childId, childX, childY, direction);
      currentY += childHeight + VERTICAL_GAP;
    });
  };

  layoutNode(data.rootId, 0, 0, 'right');

  return {
    ...data,
    nodes: newNodes,
  };
};

export const getNodeSize = (level: number): { width: number; height: number } => {
  const scale = Math.max(0.7, 1 - level * 0.08);
  return {
    width: NODE_WIDTH * scale,
    height: NODE_HEIGHT * scale,
  };
};

export const exportToJSON = (data: MindMapData): string => {
  return JSON.stringify(data, null, 2);
};

export const importFromJSON = (jsonString: string): MindMapData | null => {
  try {
    const data = JSON.parse(jsonString);
    if (data.rootId && data.nodes) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
};
