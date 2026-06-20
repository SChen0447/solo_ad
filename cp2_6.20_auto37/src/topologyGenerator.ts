import type { TopologyData, TopologyType, TopologyParams, TopologyNode, TopologyEdge } from './types';

const MIN_NODES = 8;
const MAX_NODES = 20;

function validateNodeCount(nodeCount: number): void {
  if (!Number.isInteger(nodeCount)) {
    throw new Error(`节点数量必须是整数，当前值: ${nodeCount}`);
  }
  if (nodeCount < MIN_NODES || nodeCount > MAX_NODES) {
    throw new Error(`节点数量必须在 ${MIN_NODES} 到 ${MAX_NODES} 之间，当前值: ${nodeCount}`);
  }
}

function generateRing(nodeCount: number): TopologyData {
  validateNodeCount(nodeCount);
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];
  const radius = 5;

  for (let i = 0; i < nodeCount; i++) {
    const angle = (2 * Math.PI * i) / nodeCount;
    nodes.push({
      id: i,
      position: {
        x: radius * Math.cos(angle),
        y: 0,
        z: radius * Math.sin(angle),
      },
    });
  }

  for (let i = 0; i < nodeCount; i++) {
    edges.push({
      source: i,
      target: (i + 1) % nodeCount,
    });
  }

  return { nodes, edges };
}

function generateStar(nodeCount: number): TopologyData {
  validateNodeCount(nodeCount);
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];
  const radius = 5;

  nodes.push({
    id: 0,
    position: { x: 0, y: 0, z: 0 },
  });

  for (let i = 1; i < nodeCount; i++) {
    const angle = (2 * Math.PI * (i - 1)) / (nodeCount - 1);
    nodes.push({
      id: i,
      position: {
        x: radius * Math.cos(angle),
        y: 0,
        z: radius * Math.sin(angle),
      },
    });
    edges.push({ source: 0, target: i });
  }

  return { nodes, edges };
}

function generateTree(nodeCount: number): TopologyData {
  validateNodeCount(nodeCount);
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];

  const addChildren = (parentId: number, level: number, startAngle: number, endAngle: number, radiusStep: number) => {
    const currentCount = nodes.length;
    if (currentCount >= nodeCount) return;

    const parentNode = nodes[parentId];
    const childrenCount = Math.min(2, nodeCount - currentCount);
    const angleStep = (endAngle - startAngle) / (childrenCount + 1);

    for (let i = 0; i < childrenCount; i++) {
      if (nodes.length >= nodeCount) break;
      const nodeId = nodes.length;
      const angle = startAngle + angleStep * (i + 1);
      const radius = (level + 1) * radiusStep;

      nodes.push({
        id: nodeId,
        position: {
          x: parentNode.position.x + radius * Math.cos(angle),
          y: 0,
          z: parentNode.position.z + radius * Math.sin(angle),
        },
      });
      edges.push({ source: parentId, target: nodeId });

      if (level < 3) {
        const childStartAngle = angle - Math.PI / 4;
        const childEndAngle = angle + Math.PI / 4;
        addChildren(nodeId, level + 1, childStartAngle, childEndAngle, radiusStep);
      }
    }
  };

  nodes.push({
    id: 0,
    position: { x: 0, y: 0, z: 0 },
  });

  addChildren(0, 0, 0, Math.PI * 2, 2.5);

  while (nodes.length < nodeCount) {
    const nodeId = nodes.length;
    const angle = Math.random() * Math.PI * 2;
    const radius = 5 + Math.random() * 2;
    nodes.push({
      id: nodeId,
      position: {
        x: radius * Math.cos(angle),
        y: 0,
        z: radius * Math.sin(angle),
      },
    });
    const connectTo = Math.floor(Math.random() * Math.floor(nodes.length / 2));
    edges.push({ source: connectTo, target: nodeId });
  }

  const positions = nodes.map((n) => n.position);
  const centerX = positions.reduce((sum, p) => sum + p.x, 0) / nodes.length;
  const centerZ = positions.reduce((sum, p) => sum + p.z, 0) / nodes.length;
  nodes.forEach((n) => {
    n.position.x -= centerX;
    n.position.z -= centerZ;
  });

  return { nodes, edges };
}

function generateMesh(nodeCount: number, probability: number): TopologyData {
  validateNodeCount(nodeCount);
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];

  const cols = Math.ceil(Math.sqrt(nodeCount));
  const rows = Math.ceil(nodeCount / cols);
  const spacing = 2;

  for (let i = 0; i < nodeCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const xOffset = rows * col >= nodeCount ? 0 : 0;
    nodes.push({
      id: i,
      position: {
        x: (col - (cols - 1) / 2) * spacing + xOffset,
        y: 0,
        z: (row - (rows - 1) / 2) * spacing,
      },
    });
  }

  if (nodes.length !== nodeCount) {
    throw new Error(`网格型拓扑生成失败: 期望 ${nodeCount} 个节点，实际生成 ${nodes.length} 个`);
  }

  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      const dx = nodes[i].position.x - nodes[j].position.x;
      const dz = nodes[i].position.z - nodes[j].position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= spacing * 1.5 || Math.random() < probability * 0.3) {
        edges.push({ source: i, target: j });
      }
    }
  }

  return { nodes, edges };
}

export function generateTopology(type: TopologyType, params: TopologyParams): TopologyData {
  const { nodeCount, connectionProbability = 0.5 } = params;

  switch (type) {
    case 'ring':
      return generateRing(nodeCount);
    case 'star':
      return generateStar(nodeCount);
    case 'tree':
      return generateTree(nodeCount);
    case 'mesh':
      return generateMesh(nodeCount, connectionProbability);
    default:
      return generateRing(nodeCount);
  }
}
