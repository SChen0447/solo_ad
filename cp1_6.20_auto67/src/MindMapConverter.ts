import type { Shape, MindMapNode, MindMapConnection, MindMapData } from './types';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 50;
const H_GAP = 80;
const V_GAP = 30;
const RADIUS = 200;

function buildTree(shapes: Shape[]): MindMapNode {
  const stickies = shapes.filter((s) => s.type === 'sticky');
  const others = shapes.filter((s) => s.type !== 'sticky');

  const allItems = [...stickies, ...others];
  if (allItems.length === 0) {
    return {
      id: 'root',
      text: '中心主题',
      x: 0,
      y: 0,
      children: [],
      collapsed: false,
      shapeId: '',
      opacity: 1,
    };
  }

  const centerX = allItems.reduce((s, sh) => s + sh.x + sh.width / 2, 0) / allItems.length;
  const centerY = allItems.reduce((s, sh) => s + sh.y + sh.height / 2, 0) / allItems.length;

  const root: MindMapNode = {
    id: 'root',
    text: '中心主题',
    x: centerX,
    y: centerY,
    children: [],
    collapsed: false,
    shapeId: '',
    opacity: 1,
  };

  const sorted = [...allItems].sort((a, b) => {
    const da = Math.hypot(a.x + a.width / 2 - centerX, a.y + a.height / 2 - centerY);
    const db = Math.hypot(b.x + b.width / 2 - centerX, b.y + b.height / 2 - centerY);
    return da - db;
  });

  const maxPerBranch = Math.ceil(sorted.length / 4) || 1;
  const branches: MindMapNode[][] = [[], [], [], []];

  sorted.forEach((shape, i) => {
    const branchIdx = Math.min(Math.floor(i / maxPerBranch), 3);
    const text = shape.text || shape.type === 'rect' ? '矩形' : shape.type === 'circle' ? '圆形' : shape.type === 'freehand' ? '手绘' : '便签';
    const node: MindMapNode = {
      id: shape.id,
      text: shape.text || text,
      x: 0,
      y: 0,
      children: [],
      collapsed: false,
      shapeId: shape.id,
      opacity: 1,
    };
    branches[branchIdx].push(node);
  });

  const angles = [-Math.PI / 4, Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4];
  angles.forEach((angle, branchIdx) => {
    const branch = branches[branchIdx];
    branch.forEach((node, nodeIdx) => {
      const distance = RADIUS + nodeIdx * (H_GAP + NODE_WIDTH);
      const spread = (nodeIdx - (branch.length - 1) / 2) * (NODE_HEIGHT + V_GAP);
      node.x = centerX + Math.cos(angle) * distance - spread * Math.sin(angle);
      node.y = centerY + Math.sin(angle) * distance + spread * Math.cos(angle);
      root.children.push(node);
    });
  });

  return root;
}

function buildConnections(root: MindMapNode): MindMapConnection[] {
  const connections: MindMapConnection[] = [];

  function traverse(node: MindMapNode) {
    for (const child of node.children) {
      const dx = child.x - node.x;
      const dy = child.y - node.y;
      connections.push({
        from: node.id,
        to: child.id,
        controlPoints: [
          { x: node.x + dx * 0.4, y: node.y },
          { x: child.x - dx * 0.4, y: child.y },
        ],
      });
      traverse(child);
    }
  }

  traverse(root);
  return connections;
}

export function convertToMindMap(shapes: Shape[], canvasWidth: number, canvasHeight: number): MindMapData {
  const root = buildTree(shapes);
  root.x = canvasWidth / 2 - NODE_WIDTH / 2;
  root.y = canvasHeight / 2 - NODE_HEIGHT / 2;
  const connections = buildConnections(root);
  return { root, connections };
}
