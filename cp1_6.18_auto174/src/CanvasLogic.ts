import { JourneyNode, Connection, Point, GRID_SIZE } from './types';

export function getNodePortPosition(
  node: JourneyNode,
  port: 'top' | 'bottom' | 'left' | 'right'
): Point {
  switch (port) {
    case 'top':
      return { x: node.x + node.width / 2, y: node.y };
    case 'bottom':
      return { x: node.x + node.width / 2, y: node.y + node.height };
    case 'left':
      return { x: node.x, y: node.y + node.height / 2 };
    case 'right':
      return { x: node.x + node.width, y: node.y + node.height / 2 };
  }
}

export function getConnectionPath(
  source: Point,
  target: Point,
  sourcePort: 'bottom' | 'right',
  targetPort: 'top' | 'left'
): string {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const controlOffset = Math.min(Math.abs(dx), Math.abs(dy), 80);

  let cp1: Point;
  let cp2: Point;

  if (sourcePort === 'bottom' && targetPort === 'top') {
    cp1 = { x: source.x, y: source.y + controlOffset };
    cp2 = { x: target.x, y: target.y - controlOffset };
  } else if (sourcePort === 'right' && targetPort === 'left') {
    cp1 = { x: source.x + controlOffset, y: source.y };
    cp2 = { x: target.x - controlOffset, y: target.y };
  } else if (sourcePort === 'bottom' && targetPort === 'left') {
    cp1 = { x: source.x, y: source.y + controlOffset };
    cp2 = { x: target.x - controlOffset, y: target.y };
  } else {
    cp1 = { x: source.x + controlOffset, y: source.y };
    cp2 = { x: target.x, y: target.y - controlOffset };
  }

  return `M ${source.x} ${source.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${target.x} ${target.y}`;
}

export function getConnectionMidpoint(
  source: Point,
  target: Point,
  sourcePort: 'bottom' | 'right',
  targetPort: 'top' | 'left'
): Point {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const controlOffset = Math.min(Math.abs(dx), Math.abs(dy), 80);

  let cp1: Point;
  let cp2: Point;

  if (sourcePort === 'bottom' && targetPort === 'top') {
    cp1 = { x: source.x, y: source.y + controlOffset };
    cp2 = { x: target.x, y: target.y - controlOffset };
  } else if (sourcePort === 'right' && targetPort === 'left') {
    cp1 = { x: source.x + controlOffset, y: source.y };
    cp2 = { x: target.x - controlOffset, y: target.y };
  } else if (sourcePort === 'bottom' && targetPort === 'left') {
    cp1 = { x: source.x, y: source.y + controlOffset };
    cp2 = { x: target.x - controlOffset, y: target.y };
  } else {
    cp1 = { x: source.x + controlOffset, y: source.y };
    cp2 = { x: target.x, y: target.y - controlOffset };
  }

  const t = 0.5;
  const x =
    Math.pow(1 - t, 3) * source.x +
    3 * Math.pow(1 - t, 2) * t * cp1.x +
    3 * (1 - t) * Math.pow(t, 2) * cp2.x +
    Math.pow(t, 3) * target.x;
  const y =
    Math.pow(1 - t, 3) * source.y +
    3 * Math.pow(1 - t, 2) * t * cp1.y +
    3 * (1 - t) * Math.pow(t, 2) * cp2.y +
    Math.pow(t, 3) * target.y;

  return { x, y };
}

export function isPointOnPath(
  point: Point,
  source: Point,
  target: Point,
  sourcePort: 'bottom' | 'right',
  targetPort: 'top' | 'left',
  threshold: number = 10
): boolean {
  const steps = 50;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = getPointOnBezier(t, source, target, sourcePort, targetPort);
    const dist = Math.sqrt(Math.pow(point.x - p.x, 2) + Math.pow(point.y - p.y, 2));
    if (dist < threshold) {
      return true;
    }
  }
  return false;
}

function getPointOnBezier(
  t: number,
  source: Point,
  target: Point,
  sourcePort: 'bottom' | 'right',
  targetPort: 'top' | 'left'
): Point {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const controlOffset = Math.min(Math.abs(dx), Math.abs(dy), 80);

  let cp1: Point;
  let cp2: Point;

  if (sourcePort === 'bottom' && targetPort === 'top') {
    cp1 = { x: source.x, y: source.y + controlOffset };
    cp2 = { x: target.x, y: target.y - controlOffset };
  } else if (sourcePort === 'right' && targetPort === 'left') {
    cp1 = { x: source.x + controlOffset, y: source.y };
    cp2 = { x: target.x - controlOffset, y: target.y };
  } else if (sourcePort === 'bottom' && targetPort === 'left') {
    cp1 = { x: source.x, y: source.y + controlOffset };
    cp2 = { x: target.x - controlOffset, y: target.y };
  } else {
    cp1 = { x: source.x + controlOffset, y: source.y };
    cp2 = { x: target.x, y: target.y - controlOffset };
  }

  const x =
    Math.pow(1 - t, 3) * source.x +
    3 * Math.pow(1 - t, 2) * t * cp1.x +
    3 * (1 - t) * Math.pow(t, 2) * cp2.x +
    Math.pow(t, 3) * target.x;
  const y =
    Math.pow(1 - t, 3) * source.y +
    3 * Math.pow(1 - t, 2) * t * cp1.y +
    3 * (1 - t) * Math.pow(t, 2) * cp2.y +
    Math.pow(t, 3) * target.y;

  return { x, y };
}

export function checkNodeCollision(
  node1: JourneyNode,
  node2: JourneyNode
): boolean {
  return (
    node1.x < node2.x + node2.width &&
    node1.x + node1.width > node2.x &&
    node1.y < node2.y + node2.height &&
    node1.y + node1.height > node2.y
  );
}

export function isPointInNode(point: Point, node: JourneyNode): boolean {
  return (
    point.x >= node.x &&
    point.x <= node.x + node.width &&
    point.y >= node.y &&
    point.y <= node.y + node.height
  );
}

export function isPointNearPort(
  point: Point,
  node: JourneyNode,
  port: 'top' | 'bottom' | 'left' | 'right',
  threshold: number = 12
): boolean {
  const portPos = getNodePortPosition(node, port);
  const dist = Math.sqrt(
    Math.pow(point.x - portPos.x, 2) + Math.pow(point.y - portPos.y, 2)
  );
  return dist < threshold;
}

export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function autoLayout(nodes: JourneyNode[], connections: Connection[]): JourneyNode[] {
  const nodeMap = new Map<string, JourneyNode>();
  nodes.forEach((node) => nodeMap.set(node.id, { ...node }));

  const startNodes = nodes.filter((n) => n.type === 'start');
  if (startNodes.length === 0 && nodes.length > 0) {
    startNodes.push(nodes[0]);
  }

  const levels = new Map<string, number>();
  const visited = new Set<string>();

  function assignLevel(nodeId: string, level: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    levels.set(nodeId, level);

    connections
      .filter((c) => c.sourceId === nodeId)
      .forEach((c) => {
        assignLevel(c.targetId, level + 1);
      });
  }

  startNodes.forEach((n) => assignLevel(n.id, 0));

  nodes.forEach((n) => {
    if (!levels.has(n.id)) {
      levels.set(n.id, 0);
    }
  });

  const levelNodes = new Map<number, JourneyNode[]>();
  levels.forEach((level, nodeId) => {
    const node = nodeMap.get(nodeId);
    if (node) {
      if (!levelNodes.has(level)) {
        levelNodes.set(level, []);
      }
      levelNodes.get(level)!.push(node);
    }
  });

  const startX = 100;
  const startY = 100;
  const horizontalGap = 250;
  const verticalGap = 40;

  levelNodes.forEach((levelNodesList, level) => {
    let currentY = startY;
    levelNodesList.forEach((node) => {
      node.x = startX + level * horizontalGap;
      node.y = currentY;
      currentY += node.height + verticalGap;
    });
  });

  return Array.from(nodeMap.values());
}

export function screenToCanvas(
  screenX: number,
  screenY: number,
  panX: number,
  panY: number,
  zoom: number,
  canvasRect: DOMRect
): Point {
  return {
    x: (screenX - canvasRect.left - panX) / zoom,
    y: (screenY - canvasRect.top - panY) / zoom,
  };
}

export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  panX: number,
  panY: number,
  zoom: number
): Point {
  return {
    x: canvasX * zoom + panX,
    y: canvasY * zoom + panY,
  };
}

export function findNearestInputPort(
  point: Point,
  nodes: JourneyNode[],
  excludeNodeId?: string
): { nodeId: string; port: 'top' | 'left' } | null {
  let nearest: { nodeId: string; port: 'top' | 'left'; dist: number } | null = null;
  const threshold = 20;

  nodes.forEach((node) => {
    if (node.id === excludeNodeId) return;

    (['top', 'left'] as const).forEach((port) => {
      const portPos = getNodePortPosition(node, port);
      const dist = Math.sqrt(
        Math.pow(point.x - portPos.x, 2) + Math.pow(point.y - portPos.y, 2)
      );
      if (dist < threshold && (!nearest || dist < nearest.dist)) {
        nearest = { nodeId: node.id, port, dist };
      }
    });
  });

  return nearest ? { nodeId: nearest.nodeId, port: nearest.port } : null;
}
