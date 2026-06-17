import { useEffect, useRef, useState, useCallback } from 'react';
import { RoomData, StoryNodeData, TreeNode } from '../types';

interface Props {
  room: RoomData;
  selectedNodeId: string | null;
  onSelectNode: (id: string) => void;
}

interface LayoutNode {
  id: string;
  node: StoryNodeData;
  x: number;
  y: number;
  width: number;
  height: number;
  mod: number;
  prelim: number;
  parentId: string | null;
  children: string[];
  thread: string | null;
  ancestor: string;
  change: number;
  shift: number;
  number: number;
}

const CARD_WIDTH = 200;
const CARD_HEIGHT = 100;
const H_GAP = 40;
const V_GAP = 80;

function buildLayoutNodes(nodes: Record<string, StoryNodeData>, rootId: string | null): LayoutNode[] {
  const layoutNodes: Map<string, LayoutNode> = new Map();
  const childrenMap: Map<string, string[]> = new Map();

  for (const id in nodes) {
    const n = nodes[id];
    const depthFactor = Math.pow(0.85, n.depth);
    layoutNodes.set(id, {
      id,
      node: n,
      x: 0,
      y: 0,
      width: CARD_WIDTH * depthFactor,
      height: CARD_HEIGHT * depthFactor,
      mod: 0,
      prelim: 0,
      parentId: n.parent_id,
      children: [],
      thread: null,
      ancestor: id,
      change: 0,
      shift: 0,
      number: 0
    });
    childrenMap.set(id, []);
  }

  for (const id in nodes) {
    const n = nodes[id];
    if (n.parent_id && layoutNodes.has(n.parent_id)) {
      childrenMap.get(n.parent_id)!.push(id);
    }
  }

  for (const [id, ln] of layoutNodes) {
    ln.children = childrenMap.get(id) || [];
  }

  const sortedNodes: LayoutNode[] = [];
  if (rootId && layoutNodes.has(rootId)) {
    const walk = (id: string, level: number) => {
      const ln = layoutNodes.get(id)!;
      sortedNodes.push(ln);
      const children = ln.children;
      children.forEach((cid, idx) => {
        const child = layoutNodes.get(cid)!;
        child.number = idx;
      });
      children.forEach(cid => walk(cid, level + 1));
    };
    walk(rootId, 0);
  }

  return sortedNodes;
}

function applyWalkerLayout(sortedNodes: LayoutNode[]) {
  const nodeMap = new Map<string, LayoutNode>();
  sortedNodes.forEach(n => nodeMap.set(n.id, n));

  const firstWalk = (v: LayoutNode) => {
    if (v.children.length === 0) {
      const leftSibling = getLeftSibling(v);
      v.prelim = leftSibling ? leftSibling.prelim + v.width + H_GAP : 0;
    } else {
      let defaultAncestor = v.children[0];
      v.children.forEach(childId => {
        const child = nodeMap.get(childId)!;
        firstWalk(child);
        defaultAncestor = apportion(child, defaultAncestor);
      });
      executeShifts(v);
      const midpoint = (nodeMap.get(v.children[0])!.prelim + nodeMap.get(v.children[v.children.length - 1])!.prelim) / 2;
      const leftSibling = getLeftSibling(v);
      if (leftSibling) {
        v.prelim = leftSibling.prelim + v.width + H_GAP;
        v.mod = v.prelim - midpoint;
      } else {
        v.prelim = midpoint;
      }
    }
  };

  const secondWalk = (v: LayoutNode, m: number) => {
    v.x = v.prelim + m;
    v.y = v.node.depth * (CARD_HEIGHT + V_GAP);
    v.children.forEach(childId => {
      secondWalk(nodeMap.get(childId)!, m + v.mod);
    });
  };

  const apportion = (v: LayoutNode, defaultAncestor: string): string => {
    const leftSibling = getLeftSibling(v);
    if (leftSibling) {
      let vip = v;
      let vop = v;
      let vim = leftSibling;
      let vom = getFirstChild(v.parentId);
      let sip = vip.mod;
      let sop = vop.mod;
      let sim = vim.mod;
      let som = vom.mod;

      while (nextRight(vim) && nextLeft(vip)) {
        vim = nextRight(vim)!;
        vip = nextLeft(vip)!;
        vom = nextLeft(vom)!;
        vop = nextRight(vop)!;
        vop.ancestor = v.id;
        const shift = (vim.prelim + sim) - (vip.prelim + sip) + H_GAP;
        if (shift > 0) {
          moveSubtree(ancestor(vim, v, defaultAncestor), v, shift);
          sip += shift;
          sop += shift;
        }
        sim += vim.mod;
        sip += vip.mod;
        som += vom.mod;
        sop += vop.mod;
      }
      if (nextRight(vim) && !nextRight(vop)) {
        vop.thread = nextRight(vim);
        vop.mod += sim - sop;
      }
      if (nextLeft(vip) && !nextLeft(vom)) {
        vom.thread = nextLeft(vip);
        vom.mod += sip - som;
        defaultAncestor = v.id;
      }
    }
    return defaultAncestor;
  };

  const nextLeft = (v: LayoutNode | string): LayoutNode | null => {
    const node = typeof v === 'string' ? nodeMap.get(v) : v;
    if (!node) return null;
    if (node.children.length > 0) return nodeMap.get(node.children[0])!;
    return node.thread ? nodeMap.get(node.thread) : null;
  };

  const nextRight = (v: LayoutNode | string): LayoutNode | null => {
    const node = typeof v === 'string' ? nodeMap.get(v) : v;
    if (!node) return null;
    if (node.children.length > 0) return nodeMap.get(node.children[node.children.length - 1])!;
    return node.thread ? nodeMap.get(node.thread) : null;
  };

  const getLeftSibling = (v: LayoutNode): LayoutNode | null => {
    if (!v.parentId) return null;
    const parent = nodeMap.get(v.parentId);
    if (!parent) return null;
    const idx = parent.children.indexOf(v.id);
    if (idx <= 0) return null;
    return nodeMap.get(parent.children[idx - 1]) || null;
  };

  const getFirstChild = (parentId: string | null): LayoutNode => {
    if (!parentId) return sortedNodes[0];
    const parent = nodeMap.get(parentId);
    if (!parent || parent.children.length === 0) return sortedNodes[0];
    return nodeMap.get(parent.children[0])!;
  };

  const moveSubtree = (wm: LayoutNode, wp: LayoutNode, shift: number) => {
    const subtrees = wp.number - wm.number;
    wp.change -= shift / subtrees;
    wp.shift += shift;
    wm.change += shift / subtrees;
    wp.prelim += shift;
    wp.mod += shift;
  };

  const executeShifts = (v: LayoutNode) => {
    let shift = 0;
    let change = 0;
    for (let i = v.children.length - 1; i >= 0; i--) {
      const child = nodeMap.get(v.children[i])!;
      child.prelim += shift;
      child.mod += shift;
      change += child.change;
      shift += child.shift + change;
    }
  };

  const ancestor = (vim: LayoutNode, v: LayoutNode, defaultAncestor: string): LayoutNode => {
    const parent = nodeMap.get(v.parentId);
    if (parent && parent.children.includes(vim.ancestor)) {
      return nodeMap.get(vim.ancestor)!;
    }
    return nodeMap.get(defaultAncestor)!;
  };

  if (sortedNodes.length > 0) {
    firstWalk(sortedNodes[0]);
    secondWalk(sortedNodes[0], 0);
  }
}

export default function StoryTree({ room, selectedNodeId, onSelectNode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [animatingNodes, setAnimatingNodes] = useState<Set<string>>(new Set());
  const layoutNodesRef = useRef<LayoutNode[]>([]);
  const nodesMapRef = useRef<Map<string, LayoutNode>>(new Map());
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const prevNodesCountRef = useRef(0);

  useEffect(() => {
    const currentCount = Object.keys(room.nodes).length;
    if (currentCount > prevNodesCountRef.current && prevNodesCountRef.current > 0) {
      const oldIds = new Set(prevNodesCountRef.current > 0 ? Array.from(nodesMapRef.current.keys()) : []);
      const newIds = Object.keys(room.nodes).filter(id => !oldIds.has(id));
      if (newIds.length > 0) {
        setAnimatingNodes(new Set(newIds));
        setTimeout(() => setAnimatingNodes(new Set()), 250);
      }
    }
    prevNodesCountRef.current = currentCount;
  }, [room.nodes]);

  const calculate