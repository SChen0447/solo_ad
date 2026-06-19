export interface GraphNode {
  id: string
  title: string
  description: string
  color: string
  x: number
  y: number
  createdAt?: number
  vx?: number
  vy?: number
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label: string
  createdAt?: number
  animationProgress?: number
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export const NODE_RADIUS = 35
export const MIN_SCALE = 0.5
export const MAX_SCALE = 3
export const COLOR_PALETTE = [
  '#4a6fa5',
  '#e74c3c',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e91e63',
  '#34495e'
]

export const EDGE_LABELS = ['属于', '依赖于', '影响', '包含', '引用', '关联']

interface LayoutOptions {
  iterations?: number
  width?: number
  height?: number
  repulsion?: number
  attraction?: number
  damping?: number
}

export function forceDirectedLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: LayoutOptions = {}
): GraphNode[] {
  const {
    iterations = 200,
    width = 1200,
    height = 800,
    repulsion = 5000,
    attraction = 0.005,
    damping = 0.85
  } = options

  const layoutNodes: GraphNode[] = nodes.map(n => ({
    ...n,
    vx: n.vx || 0,
    vy: n.vy || 0
  }))

  const centerX = width / 2
  const centerY = height / 2
  const nodeMap = new Map<string, GraphNode>()
  layoutNodes.forEach(n => nodeMap.set(n.id, n))

  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const a = layoutNodes[i]
        const b = layoutNodes[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        let dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 1) dist = 1
        const force = repulsion / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx = (a.vx || 0) + fx
        a.vy = (a.vy || 0) + fy
        b.vx = (b.vx || 0) - fx
        b.vy = (b.vy || 0) - fy
      }
    }

    for (const edge of edges) {
      const source = nodeMap.get(edge.source)
      const target = nodeMap.get(edge.target)
      if (!source || !target) continue
      const dx = target.x - source.x
      const dy = target.y - source.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1) continue
      const force = dist * attraction
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      source.vx = (source.vx || 0) + fx
      source.vy = (source.vy || 0) + fy
      target.vx = (target.vx || 0) - fx
      target.vy = (target.vy || 0) - fy
    }

    for (const node of layoutNodes) {
      node.vx = (node.vx || 0) * damping
      node.vy = (node.vy || 0) * damping
      const cx = centerX - node.x
      const cy = centerY - node.y
      node.vx += cx * 0.001
      node.vy += cy * 0.001
      node.x += node.vx
      node.y += node.vy
      node.x = Math.max(NODE_RADIUS, Math.min(width - NODE_RADIUS, node.x))
      node.y = Math.max(NODE_RADIUS, Math.min(height - NODE_RADIUS, node.y))
    }
  }

  return layoutNodes.map(({ vx, vy, ...rest }) => rest)
}

export function findNodeAtPosition(
  nodes: GraphNode[],
  x: number,
  y: number,
  scale: number = 1,
  offsetX: number = 0,
  offsetY: number = 0
): GraphNode | null {
  const worldX = (x - offsetX) / scale
  const worldY = (y - offsetY) / scale
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]
    const dx = worldX - node.x
    const dy = worldY - node.y
    if (dx * dx + dy * dy <= (NODE_RADIUS + 5) * (NODE_RADIUS + 5)) {
      return node
    }
  }
  return null
}

export function findEdgeAtPosition(
  edges: GraphEdge[],
  nodes: GraphNode[],
  x: number,
  y: number,
  scale: number = 1,
  offsetX: number = 0,
  offsetY: number = 0
): GraphEdge | null {
  const worldX = (x - offsetX) / scale
  const worldY = (y - offsetY) / scale
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const threshold = 8 / scale

  for (let i = edges.length - 1; i >= 0; i--) {
    const edge = edges[i]
    const source = nodeMap.get(edge.source)
    const target = nodeMap.get(edge.target)
    if (!source || !target) continue

    const dist = pointToLineDistance(
      worldX, worldY,
      source.x, source.y,
      target.x, target.y
    )
    if (dist <= threshold) {
      return edge
    }
  }
  return null
}

function pointToLineDistance(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const A = px - x1
  const B = py - y1
  const C = x2 - x1
  const D = y2 - y1

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1
  if (lenSq !== 0) param = dot / lenSq

  let xx: number, yy: number
  if (param < 0) {
    xx = x1
    yy = y1
  } else if (param > 1) {
    xx = x2
    yy = y2
  } else {
    xx = x1 + param * C
    yy = y1 + param * D
  }

  const dx = px - xx
  const dy = py - yy
  return Math.sqrt(dx * dx + dy * dy)
}

export function getCanvasPoint(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect
): { x: number; y: number } {
  return {
    x: clientX - canvasRect.left,
    y: clientY - canvasRect.top
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
