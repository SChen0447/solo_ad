export interface TopologyNode {
  id: number;
  x: number;
  y: number;
}

export interface TopologyEdge {
  a: number;
  b: number;
}

export interface MazeTopology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export function createStaticTopology(): MazeTopology {
  const nodes: TopologyNode[] = [
    { id: 0, x: 0, y: 0 },
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 0, y: 0 },
    { id: 3, x: 0, y: 0 },
    { id: 4, x: 0, y: 0 },
    { id: 5, x: 0, y: 0 },
    { id: 6, x: 0, y: 0 },
    { id: 7, x: 0, y: 0 }
  ];

  const edges: TopologyEdge[] = [
    { a: 0, b: 1 },
    { a: 0, b: 2 },
    { a: 0, b: 3 },
    { a: 1, b: 4 },
    { a: 1, b: 5 },
    { a: 2, b: 4 },
    { a: 2, b: 6 },
    { a: 3, b: 5 },
    { a: 3, b: 6 },
    { a: 4, b: 7 },
    { a: 5, b: 7 },
    { a: 6, b: 7 }
  ];

  return { nodes, edges };
}

export function getAdjacencyList(topology: MazeTopology): Map<number, number[]> {
  const adj = new Map<number, number[]>();
  for (const node of topology.nodes) {
    adj.set(node.id, []);
  }
  for (const edge of topology.edges) {
    adj.get(edge.a)!.push(edge.b);
    adj.get(edge.b)!.push(edge.a);
  }
  return adj;
}
