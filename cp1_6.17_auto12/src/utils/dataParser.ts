export interface RawNode {
  id: string;
  label: string;
  group: string | number;
}

export interface RawLink {
  source: string;
  target: string;
}

export interface RawGraphData {
  nodes: RawNode[];
  links: RawLink[];
}

export interface GraphNode extends RawNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  index?: number;
  degree: number;
  inDegree: number;
  outDegree: number;
  neighbors: string[];
}

export interface GraphLink {
  source: GraphNode | string;
  target: GraphNode | string;
  index?: number;
}

export interface ParsedGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function parseGraphData(rawData: RawGraphData): ParsedGraphData {
  const nodeMap = new Map<string, GraphNode>();

  const nodes: GraphNode[] = rawData.nodes.map((node) => {
    const graphNode: GraphNode = {
      ...node,
      degree: 0,
      inDegree: 0,
      outDegree: 0,
      neighbors: []
    };
    nodeMap.set(node.id, graphNode);
    return graphNode;
  });

  const links: GraphLink[] = rawData.links.map((link) => {
    const sourceNode = nodeMap.get(link.source);
    const targetNode = nodeMap.get(link.target);

    if (sourceNode && targetNode) {
      sourceNode.outDegree += 1;
      sourceNode.degree += 1;
      if (!sourceNode.neighbors.includes(link.target)) {
        sourceNode.neighbors.push(link.target);
      }

      targetNode.inDegree += 1;
      targetNode.degree += 1;
      if (!targetNode.neighbors.includes(link.source)) {
        targetNode.neighbors.push(link.source);
      }
    }

    return {
      source: link.source,
      target: link.target
    };
  });

  return { nodes, links };
}

export function validateGraphData(data: unknown): data is RawGraphData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.links)) {
    return false;
  }

  const nodesValid = obj.nodes.every((node: unknown) => {
    if (typeof node !== 'object' || node === null) return false;
    const n = node as Record<string, unknown>;
    return (
      typeof n.id === 'string' &&
      typeof n.label === 'string' &&
      (typeof n.group === 'string' || typeof n.group === 'number')
    );
  });

  const linksValid = obj.links.every((link: unknown) => {
    if (typeof link !== 'object' || link === null) return false;
    const l = link as Record<string, unknown>;
    return typeof l.source === 'string' && typeof l.target === 'string';
  });

  return nodesValid && linksValid;
}

export function getNodeById(nodes: GraphNode[], id: string): GraphNode | undefined {
  return nodes.find((node) => node.id === id);
}

export function getNodeLabelMap(nodes: GraphNode[]): Map<string, string> {
  const map = new Map<string, string>();
  nodes.forEach((node) => {
    map.set(node.id, node.label);
  });
  return map;
}

export function getGroupSet(nodes: GraphNode[]): Set<string | number> {
  return new Set(nodes.map((node) => node.group));
}
