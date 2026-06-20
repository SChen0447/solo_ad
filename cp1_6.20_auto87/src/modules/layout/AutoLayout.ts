import dagre from 'dagre';
import { Position } from 'reactflow';
import type { Node, Edge } from 'reactflow';
import type { NodeData } from '../utils/stateManager';

export interface LayoutOptions {
  rankDirection?: 'TB' | 'LR' | 'BT' | 'RL';
  nodeWidth?: number;
  nodeHeight?: number;
  nodePaddingX?: number;
  nodePaddingY?: number;
  rankSeparation?: number;
  nodeSeparation?: number;
  edgeSeparation?: number;
}

export interface LayoutResult {
  nodes: Node<NodeData>[];
  width: number;
  height: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  rankDirection: 'TB',
  nodeWidth: 160,
  nodeHeight: 80,
  nodePaddingX: 0,
  nodePaddingY: 0,
  rankSeparation: 80,
  nodeSeparation: 60,
  edgeSeparation: 10,
};

export function calculateLayout(
  nodes: Node<NodeData>[],
  edges: Edge[],
  options: LayoutOptions = {}
): LayoutResult {
  const opts: Required<LayoutOptions> = { ...DEFAULT_OPTIONS, ...options };

  if (nodes.length === 0) {
    return { nodes: [], width: 0, height: 0 };
  }

  const graph = new dagre.graphlib.Graph();

  graph.setGraph({
    rankdir: opts.rankDirection,
    nodesep: opts.nodeSeparation,
    ranksep: opts.rankSeparation,
    edgesep: opts.edgeSeparation,
    marginx: 40,
    marginy: 40,
    acyclicer: 'greedy',
    align: 'DL',
  });

  graph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    const width = node.width || opts.nodeWidth;
    const height = node.height || opts.nodeHeight;
    graph.setNode(node.id, {
      width,
      height,
      paddingx: opts.nodePaddingX,
      paddingy: opts.nodePaddingY,
    });
  });

  edges.forEach((edge) => {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target, {
        minlen: 1,
        weight: 1,
      });
    }
  });

  dagre.layout(graph);

  const graphInfo = graph.graph();

  const positionedNodes: Node<NodeData>[] = nodes.map((node) => {
    const nodeInfo = graph.node(node.id);
    const width = node.width || opts.nodeWidth;
    const height = node.height || opts.nodeHeight;

    let x: number;
    let y: number;

    if (opts.rankDirection === 'TB' || opts.rankDirection === 'BT') {
      x = nodeInfo.x - width / 2;
      y = nodeInfo.y - height / 2;
    } else {
      x = nodeInfo.x - width / 2;
      y = nodeInfo.y - height / 2;
    }

    return {
      ...node,
      position: {
        x: Math.round(x),
        y: Math.round(y),
      },
      sourcePosition:
        opts.rankDirection === 'LR' ? Position.Right : Position.Bottom,
      targetPosition:
        opts.rankDirection === 'LR' ? Position.Left : Position.Top,
    };
  });

  return {
    nodes: positionedNodes,
    width: graphInfo.width || 0,
    height: graphInfo.height || 0,
  };
}

export interface AnimationFrame {
  nodes: Node<NodeData>[];
}

export function animatePositions(
  fromNodes: Node<NodeData>[],
  toNodes: Node<NodeData>[],
  duration: number = 300
): Promise<AnimationFrame[]> {
  return new Promise((resolve) => {
    const nodeMap = new Map(toNodes.map((n) => [n.id, n]));
    const frames: AnimationFrame[] = [];
    const startTime = performance.now();

    const interpolated = (progress: number): AnimationFrame => {
      return {
        nodes: fromNodes.map((fromNode) => {
          const toNode = nodeMap.get(fromNode.id);
          if (!toNode) return fromNode;

          const eased = easeOutCubic(progress);
          const x = fromNode.position.x + (toNode.position.x - fromNode.position.x) * eased;
          const y = fromNode.position.y + (toNode.position.y - fromNode.position.y) * eased;

          return {
            ...fromNode,
            position: { x: Math.round(x), y: Math.round(y) },
            sourcePosition: toNode.sourcePosition || fromNode.sourcePosition,
            targetPosition: toNode.targetPosition || fromNode.targetPosition,
          };
        }),
      };
    };

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      frames.push(interpolated(progress));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve(frames);
      }
    };

    requestAnimationFrame(step);
  });
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export async function applyLayoutWithAnimation(
  stateManager: {
    getNodes: () => Node<NodeData>[];
    updateNodes: (updates: Map<string, Partial<Node<NodeData>>>) => void;
    updateNode: (id: string, updates: Partial<Node<NodeData>>, recordHistory?: boolean) => void;
    subscribe: (listener: (state: { nodes: Node<NodeData>[] }) => void) => () => void;
  },
  options: LayoutOptions = {}
): Promise<void> {
  const currentNodes = stateManager.getNodes();
  const currentEdges: Edge[] = [];

  const result = calculateLayout(currentNodes, currentEdges, options);

  if (currentNodes.length <= 1) {
    const updates = new Map<string, Partial<Node<NodeData>>>();
    result.nodes.forEach((n) => {
      updates.set(n.id, {
        position: n.position,
        sourcePosition: n.sourcePosition,
        targetPosition: n.targetPosition,
      });
    });
    stateManager.updateNodes(updates);
    return;
  }

  const duration = 300;
  const nodeMap = new Map(result.nodes.map((n) => [n.id, n]));
  const startTime = performance.now();

  await new Promise<void>((resolve) => {
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      currentNodes.forEach((fromNode) => {
        const toNode = nodeMap.get(fromNode.id);
        if (!toNode) return;

        const x = fromNode.position.x + (toNode.position.x - fromNode.position.x) * eased;
        const y = fromNode.position.y + (toNode.position.y - fromNode.position.y) * eased;

        stateManager.updateNode(
          fromNode.id,
          {
            position: { x: Math.round(x), y: Math.round(y) },
            sourcePosition: toNode.sourcePosition,
            targetPosition: toNode.targetPosition,
          },
          false
        );
      });

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(step);
  });

  const finalUpdates = new Map<string, Partial<Node<NodeData>>>();
  result.nodes.forEach((n) => {
    finalUpdates.set(n.id, {
      position: n.position,
      sourcePosition: n.sourcePosition,
      targetPosition: n.targetPosition,
    });
  });
  stateManager.updateNodes(finalUpdates);
}
