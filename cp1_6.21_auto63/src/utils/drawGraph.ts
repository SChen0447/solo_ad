import { MindMapNode, Edge, NODE_WIDTH, LEVEL_GAP, NODE_GAP, FONT_SIZE, LINE_HEIGHT, NODE_PADDING } from '../types';

export function calculateNodeHeight(text: string, width: number = NODE_WIDTH): number {
  const availableWidth = width - NODE_PADDING * 2;
  const charsPerLine = Math.max(1, Math.floor(availableWidth / (FONT_SIZE * 0.6)));
  const lines = Math.ceil(text.length / charsPerLine);
  return Math.max(44, lines * LINE_HEIGHT + NODE_PADDING * 2);
}

export function calculateNodeLevel(nodeId: string, nodes: Record<string, MindMapNode>): number {
  let level = 0;
  let currentId: string | null = nodeId;
  while (currentId) {
    const node: MindMapNode | undefined = nodes[currentId];
    if (!node) break;
    if (node.parentId === null) break;
    currentId = node.parentId;
    level++;
  }
  return level;
}

export function getDescendants(nodeId: string, nodes: Record<string, MindMapNode>): string[] {
  const result: string[] = [];
  const stack = [nodeId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const node = nodes[current];
    if (!node) continue;
    for (const childId of node.children) {
      result.push(childId);
      stack.push(childId);
    }
  }
  return result;
}

export function isNodeVisible(nodeId: string, nodes: Record<string, MindMapNode>): boolean {
  let currentId: string | null = nodeId;
  while (currentId) {
    const node: MindMapNode | undefined = nodes[currentId];
    if (!node) return false;
    if (node.parentId === null) return true;
    const parent: MindMapNode | undefined = nodes[node.parentId];
    if (!parent) return false;
    if (parent.collapsed) return false;
    currentId = node.parentId;
  }
  return true;
}

export function getVisibleNodes(nodes: Record<string, MindMapNode>): string[] {
  return Object.keys(nodes).filter((id) => isNodeVisible(id, nodes));
}

interface SubtreeMeasure {
  height: number;
  nodePositions: Record<string, number>;
}

function measureSubtree(
  nodeId: string,
  nodes: Record<string, MindMapNode>,
  heights: Record<string, number>
): SubtreeMeasure {
  const node = nodes[nodeId];
  const nodePositions: Record<string, number> = {};

  if (node.collapsed || node.children.length === 0) {
    const h = heights[nodeId] || 44;
    nodePositions[nodeId] = 0;
    return { height: h, nodePositions };
  }

  let totalHeight = 0;
  const childMeasures: SubtreeMeasure[] = [];

  for (let i = 0; i < node.children.length; i++) {
    const childId = node.children[i];
    const childMeasure = measureSubtree(childId, nodes, heights);
    childMeasures.push(childMeasure);
    if (i > 0) totalHeight += NODE_GAP;
    totalHeight += childMeasure.height;
  }

  const selfHeight = heights[nodeId] || 44;
  const centerY = totalHeight / 2;
  nodePositions[nodeId] = 0;

  let currentY = centerY - totalHeight / 2;
  for (let i = 0; i < node.children.length; i++) {
    const childMeasure = childMeasures[i];
    const childId = node.children[i];
    const childHeight = childMeasure.height;
    const childCenterY = currentY + childHeight / 2;
    const offsetFromNode = childCenterY;
    nodePositions[childId] = offsetFromNode;
    for (const [descendantId, offset] of Object.entries(childMeasure.nodePositions)) {
      if (descendantId !== childId) {
        nodePositions[descendantId] = offset + offsetFromNode;
      }
    }
    currentY += childHeight + NODE_GAP;
  }

  return {
    height: Math.max(selfHeight, totalHeight),
    nodePositions,
  };
}

export function layoutNodes(
  nodes: Record<string, MindMapNode>,
  rootId: string,
  startX: number = 100,
  startY: number = 300
): Record<string, { x: number; y: number }> {
  const result: Record<string, { x: number; y: number }> = {};
  const heights: Record<string, number> = {};

  for (const [id, node] of Object.entries(nodes)) {
    heights[id] = calculateNodeHeight(node.text, node.width || NODE_WIDTH);
  }

  const measure = measureSubtree(rootId, nodes, heights);

  function assignPositions(
    nodeId: string,
    offsetY: number,
    level: number
  ) {
    const node = nodes[nodeId];
    if (!node) return;

    const x = startX + level * (NODE_WIDTH + LEVEL_GAP);
    const yOffset = measure.nodePositions[nodeId] || 0;
    const y = startY + offsetY + yOffset;

    result[nodeId] = { x, y };

    if (!node.collapsed) {
      for (const childId of node.children) {
        const childOffset = yOffset;
        assignPositions(childId, childOffset, level + 1);
      }
    }
  }

  assignPositions(rootId, 0, 0);

  return result;
}

export function calculateEdges(
  nodes: Record<string, MindMapNode>,
  positions: Record<string, { x: number; y: number }>,
  heights: Record<string, number>
): Edge[] {
  const edges: Edge[] = [];

  for (const node of Object.values(nodes)) {
    if (node.parentId === null) continue;
    if (!isNodeVisible(node.id, nodes)) continue;
    const parent = nodes[node.parentId];
    if (!parent || parent.collapsed) continue;

    const fromPos = positions[node.parentId];
    const toPos = positions[node.id];
    if (!fromPos || !toPos) continue;

    const parentHeight = heights[node.parentId] || 44;
    const childHeight = heights[node.id] || 44;

    const fromX = fromPos.x + (node.width || NODE_WIDTH);
    const fromY = fromPos.y + parentHeight / 2;
    const toX = toPos.x;
    const toY = toPos.y + childHeight / 2;

    const midX = (fromX + toX) / 2;
    const points = [fromX, fromY, midX, fromY, midX, toY, toX, toY];

    edges.push({
      id: `edge-${node.parentId}-${node.id}`,
      from: node.parentId,
      to: node.id,
      points,
    });
  }

  return edges;
}

export function updateNodePositionWithChildren(
  nodeId: string,
  deltaX: number,
  deltaY: number,
  nodes: Record<string, MindMapNode>
): Record<string, MindMapNode> {
  const newNodes = { ...nodes };
  const descendants = getDescendants(nodeId, nodes);
  const allAffected = [nodeId, ...descendants];

  for (const id of allAffected) {
    if (newNodes[id]) {
      newNodes[id] = {
        ...newNodes[id],
        x: newNodes[id].x + deltaX,
        y: newNodes[id].y + deltaY,
      };
    }
  }

  return newNodes;
}
