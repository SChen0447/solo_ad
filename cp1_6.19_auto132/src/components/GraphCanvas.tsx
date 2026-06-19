import { useRef, useEffect, useState, useCallback } from 'react'
import {
  GraphNode,
  GraphEdge,
  NODE_RADIUS,
  MIN_SCALE,
  MAX_SCALE,
  EDGE_LABELS,
  findNodeAtPosition,
  findEdgeAtPosition,
  getCanvasPoint,
  clamp
} from '../utils/graphLayout'

interface GraphCanvasProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  selectedNodeId: string | null
  onNodeCreate: (x: number, y: number) => void
  onNodeMove: (id: string, x: number, y: number) => void
  onNodeClick: (node: GraphNode) => void
  onEdgeCreate: (sourceId: string, targetId: string, label: string) => void
  onEdgeDelete: (edgeId: string) => void
  onNodesChange: React.Dispatch<React.SetStateAction<GraphNode[]>>
  onEdgesChange: React.Dispatch<React.SetStateAction<GraphEdge[]>>
}

interface NewNodeAnim {
  id: string
  progress: number
  startScale: number
}

interface ContextMenu {
  x: number
  y: number
  type: 'edge'
  edgeId: string
}

export default function GraphCanvas(props: GraphCanvasProps) {
  const {
    nodes,
    edges,
    selectedNodeId,
    onNodeCreate,
    onNodeMove,
    onNodeClick,
    onEdgeCreate,
    onEdgeDelete,
    onNodesChange
  } = props
  void props.onEdgesChange

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const scaleRef = useRef(1)
  const offsetRef = useRef({ x: 0, y: 0 })
  const [, setTick] = useState(0)

  const newNodeAnimsRef = useRef<Map<string, NewNodeAnim>>(new Map())
  const edgeAnimRef = useRef<Map<string, number>>(new Map())
  const contextMenuRef = useRef<ContextMenu | null>(null)
  const hoveredEdgeIdRef = useRef<string | null>(null)
  const pendingEdgeRef = useRef<{ sourceId: string; endX: number; endY: number } | null>(null)
  const draggingRef = useRef<{ type: 'node' | 'pan'; nodeId?: string; startX: number; startY: number; offsetStartX?: number; offsetStartY?: number } | null>(null)
  const lastMoveTimeRef = useRef(0)

  const rafRef = useRef<number>(0)
  const animTimeRef = useRef(0)

  const forceRender = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    for (const edge of edges) {
      if (edge.animationProgress === 0 && !edgeAnimRef.current.has(edge.id)) {
        edgeAnimRef.current.set(edge.id, 0)
      }
    }
  }, [edges])

  const worldToScreen = (wx: number, wy: number) => ({
    x: wx * scaleRef.current + offsetRef.current.x,
    y: wy * scaleRef.current + offsetRef.current.y
  })

  const screenToWorld = (sx: number, sy: number) => ({
    x: (sx - offsetRef.current.x) / scaleRef.current,
    y: (sy - offsetRef.current.y) / scaleRef.current
  })

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    size: number
  ) => {
    const angle = Math.atan2(toY - fromY, toX - fromX)
    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(
      toX - size * Math.cos(angle - Math.PI / 6),
      toY - size * Math.sin(angle - Math.PI / 6)
    )
    ctx.lineTo(
      toX - size * Math.cos(angle + Math.PI / 6),
      toY - size * Math.sin(angle + Math.PI / 6)
    )
    ctx.closePath()
    ctx.fill()
  }

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = 'rgba(0,0,0,0.04)'
    ctx.lineWidth = 1
    const grid = 50 * scaleRef.current
    const startX = ((offsetRef.current.x % grid) + grid) % grid
    const startY = ((offsetRef.current.y % grid) + grid) % grid
    for (let x = startX; x < w; x += grid) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = startY; y < h; y += grid) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
  }

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height

    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    ctx.fillStyle = '#f0f2f5'
    ctx.fillRect(0, 0, w, h)
    drawGrid(ctx, w, h)

    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const R = NODE_RADIUS * scaleRef.current

    for (const edge of edges) {
      const source = nodeMap.get(edge.source)
      const target = nodeMap.get(edge.target)
      if (!source || !target) continue

      const s = worldToScreen(source.x, source.y)
      const t = worldToScreen(target.x, target.y)

      let anim = edgeAnimRef.current.get(edge.id)
      if (anim !== undefined && anim < 1) {
        anim = Math.min(1, anim + 0.05)
        edgeAnimRef.current.set(edge.id, anim)
        if (anim >= 1) edgeAnimRef.current.delete(edge.id)
      } else {
        anim = 1
      }

      const endX = s.x + (t.x - s.x) * anim
      const endY = s.y + (t.y - s.y) * anim

      const dx = t.x - s.x
      const dy = t.y - s.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1) continue

      const ux = dx / dist
      const uy = dy / dist
      const srcEdgeX = s.x + ux * R
      const srcEdgeY = s.y + uy * R
      const tgtEdgeX = endX - ux * R * anim
      const tgtEdgeY = endY - uy * R * anim

      const isHovered = hoveredEdgeIdRef.current === edge.id
      ctx.strokeStyle = isHovered ? '#4a6fa5' : '#bbb'
      ctx.lineWidth = isHovered ? 3 * scaleRef.current : 1.5 * scaleRef.current
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(srcEdgeX, srcEdgeY)
      ctx.lineTo(tgtEdgeX, tgtEdgeY)
      ctx.stroke()

      if (anim >= 0.9) {
        ctx.fillStyle = isHovered ? '#4a6fa5' : '#bbb'
        const arrX = s.x + (t.x - s.x) * Math.min(anim, 0.95)
        const arrY = s.y + (t.y - s.y) * Math.min(anim, 0.95)
        drawArrow(ctx, srcEdgeX, srcEdgeY, arrX - ux * R * 0.3, arrY - uy * R * 0.3, 8 * scaleRef.current)
      }

      if (anim >= 0.8 && edge.label) {
        const midX = (s.x + t.x) / 2
        const midY = (s.y + t.y) / 2
        const fontSize = Math.max(10, 12 * scaleRef.current)
        ctx.font = `${fontSize}px -apple-system, sans-serif`
        const metrics = ctx.measureText(edge.label)
        const pad = 4 * scaleRef.current
        const bgW = metrics.width + pad * 2
        const bgH = fontSize + pad * 1.5

        ctx.fillStyle = 'rgba(255,255,255,0.92)'
        ctx.strokeStyle = isHovered ? '#4a6fa5' : '#ddd'
        ctx.lineWidth = 1
        const bx = midX - bgW / 2
        const by = midY - bgH / 2
        ctx.beginPath()
        ctx.roundRect?.(bx, by, bgW, bgH, 4 * scaleRef.current)
        if (!ctx.roundRect) {
          ctx.rect(bx, by, bgW, bgH)
        }
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = isHovered ? '#4a6fa5' : '#555'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(edge.label, midX, midY + 1)
      }
    }

    if (pendingEdgeRef.current) {
      const { sourceId, endX, endY } = pendingEdgeRef.current
      const source = nodeMap.get(sourceId)
      if (source) {
        const s = worldToScreen(source.x, source.y)
        ctx.strokeStyle = '#4a6fa5'
        ctx.lineWidth = 2 * scaleRef.current
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(endX, endY)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.fillStyle = '#4a6fa5'
        ctx.beginPath()
        ctx.arc(endX, endY, 5 * scaleRef.current, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const sortedNodes = [...nodes].sort((a, b) => {
      if (a.id === selectedNodeId) return 1
      if (b.id === selectedNodeId) return -1
      return 0
    })

    for (const node of sortedNodes) {
      let scaleMult = 1
      const anim = newNodeAnimsRef.current.get(node.id)
      if (anim) {
        anim.progress = Math.min(1, anim.progress + 0.06)
        scaleMult = anim.startScale + (1 - anim.startScale) * anim.progress
        if (anim.progress >= 1) newNodeAnimsRef.current.delete(node.id)
      }

      const p = worldToScreen(node.x, node.y)
      const radius = R * scaleMult
      const isSelected = node.id === selectedNodeId

      if (isSelected) {
        ctx.save()
        ctx.shadowColor = node.color
        ctx.shadowBlur = 15 * scaleRef.current
        ctx.fillStyle = node.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2.5 * scaleRef.current
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        ctx.fillStyle = node.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      const grad = ctx.createRadialGradient(
        p.x - radius * 0.3, p.y - radius * 0.3, radius * 0.1,
        p.x, p.y, radius
      )
      grad.addColorStop(0, 'rgba(255,255,255,0.35)')
      grad.addColorStop(0.5, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(p.x, p.y, radius - 1, 0, Math.PI * 2)
      ctx.fill()

      const fontSize = Math.max(9, Math.min(14, 12 * scaleRef.current * scaleMult))
      ctx.font = `600 ${fontSize}px -apple-system, sans-serif`
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 3

      const maxChars = Math.max(4, Math.floor((radius * 1.8) / (fontSize * 0.6)))
      let displayTitle = node.title
      if (displayTitle.length > maxChars) {
        displayTitle = displayTitle.substring(0, maxChars - 1) + '…'
      }
      ctx.fillText(displayTitle, p.x, p.y + 1)
      ctx.shadowBlur = 0
    }
  }, [nodes, edges, selectedNodeId])

  useEffect(() => {
    const loop = (t: number) => {
      animTimeRef.current = t
      render()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [render])

  useEffect(() => {
    const handleResize = () => forceRender()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [forceRender])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { x, y } = getCanvasPoint(e.clientX, e.clientY, rect)
    contextMenuRef.current = null

    const hitNode = findNodeAtPosition(nodes, x, y, scaleRef.current, offsetRef.current.x, offsetRef.current.y)
    if (hitNode) {
      draggingRef.current = {
        type: 'node',
        nodeId: hitNode.id,
        startX: e.clientX,
        startY: e.clientY
      }
      return
    }

    draggingRef.current = {
      type: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      offsetStartX: offsetRef.current.x,
      offsetStartY: offsetRef.current.y
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { x, y } = getCanvasPoint(e.clientX, e.clientY, rect)

    const now = performance.now()
    if (draggingRef.current?.type !== 'node' && now - lastMoveTimeRef.current < 16) {
      return
    }
    lastMoveTimeRef.current = now

    if (draggingRef.current?.type === 'node') {
      const drag = draggingRef.current
      const world = screenToWorld(x, y)
      onNodeMove(drag.nodeId!, world.x, world.y)
      return
    }

    if (pendingEdgeRef.current) {
      pendingEdgeRef.current.endX = x
      pendingEdgeRef.current.endY = y
      return
    }

    if (draggingRef.current?.type === 'pan') {
      const drag = draggingRef.current
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      let newX = (drag.offsetStartX ?? 0) + dx
      let newY = (drag.offsetStartY ?? 0) + dy

      if (nodes.length > 0) {
        const minX = Math.min(...nodes.map(n => n.x))
        const maxX = Math.max(...nodes.map(n => n.x))
        const minY = Math.min(...nodes.map(n => n.y))
        const maxY = Math.max(...nodes.map(n => n.y))
        const s = scaleRef.current
        const graphW = (maxX - minX) * s
        const graphH = (maxY - minY) * s
        const cx = ((minX + maxX) / 2) * s + newX
        const cy = ((minY + maxY) / 2) * s + newY
        const maxOffX = rect.width / 2 + Math.max(0, graphW / 2 - rect.width / 3)
        const maxOffY = rect.height / 2 + Math.max(0, graphH / 2 - rect.height / 3)
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        if (Math.abs(cx - centerX) > maxOffX) {
          newX = (centerX - (minX + maxX) / 2 * s) + Math.sign(cx - centerX) * maxOffX * 0.9
        }
        if (Math.abs(cy - centerY) > maxOffY) {
          newY = (centerY - (minY + maxY) / 2 * s) + Math.sign(cy - centerY) * maxOffY * 0.9
        }
      }

      offsetRef.current = { x: newX, y: newY }
      return
    }

    const hoveredEdge = findEdgeAtPosition(edges, nodes, x, y, scaleRef.current, offsetRef.current.x, offsetRef.current.y)
    hoveredEdgeIdRef.current = hoveredEdge?.id || null
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { x, y } = getCanvasPoint(e.clientX, e.clientY, rect)

    if (pendingEdgeRef.current) {
      const { sourceId } = pendingEdgeRef.current
      const hitNode = findNodeAtPosition(nodes, x, y, scaleRef.current, offsetRef.current.x, offsetRef.current.y)
      if (hitNode && hitNode.id !== sourceId) {
        const dup = edges.find(e => e.source === sourceId && e.target === hitNode.id)
        if (!dup) {
          showEdgeLabelDialog(sourceId, hitNode.id)
        }
      }
      pendingEdgeRef.current = null
    }

    if (draggingRef.current?.type === 'node') {
      const drag = draggingRef.current
      const moved = Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY)
      if (moved < 4) {
        const node = nodes.find(n => n.id === drag.nodeId)
        if (node) onNodeClick(node)
      }
    }

    draggingRef.current = null
  }

  const showEdgeLabelDialog = (sourceId: string, targetId: string) => {
    const choice = window.prompt(
      '输入关系标签（默认：属于）\n常用：属于、依赖于、影响、包含、引用、关联',
      EDGE_LABELS[0]
    )
    if (choice === null) return
    const label = (choice.trim() || EDGE_LABELS[0]).substring(0, 10)
    onEdgeCreate(sourceId, targetId, label)
  }

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { x, y } = getCanvasPoint(e.clientX, e.clientY, rect)

    const hitNode = findNodeAtPosition(nodes, x, y, scaleRef.current, offsetRef.current.x, offsetRef.current.y)
    if (hitNode) return

    const world = screenToWorld(x, y)
    onNodeCreate(world.x, world.y)
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { x, y } = getCanvasPoint(e.clientX, e.clientY, rect)

    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    const newScale = clamp(scaleRef.current * factor, MIN_SCALE, MAX_SCALE)
    const actualFactor = newScale / scaleRef.current

    offsetRef.current = {
      x: x - (x - offsetRef.current.x) * actualFactor,
      y: y - (y - offsetRef.current.y) * actualFactor
    }
    scaleRef.current = newScale
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const { x, y } = getCanvasPoint(e.clientX, e.clientY, rect)

    const hoveredEdge = findEdgeAtPosition(edges, nodes, x, y, scaleRef.current, offsetRef.current.x, offsetRef.current.y)
    if (hoveredEdge) {
      const confirmed = window.confirm(`删除关系 "${hoveredEdge.label}"？`)
      if (confirmed) onEdgeDelete(hoveredEdge.id)
      return
    }

    const hitNode = findNodeAtPosition(nodes, x, y, scaleRef.current, offsetRef.current.x, offsetRef.current.y)
    if (!hitNode) return
    if (pendingEdgeRef.current) {
      pendingEdgeRef.current = null
    } else {
      pendingEdgeRef.current = {
        sourceId: hitNode.id,
        endX: x,
        endY: y
      }
    }
  }

  const handleMouseLeave = () => {
    if (!pendingEdgeRef.current && !draggingRef.current) {
      hoveredEdgeIdRef.current = null
    }
  }

  useEffect(() => {
    onNodesChange(prev => {
      for (const n of prev) {
        if (!nodes.find(ex => ex.id === n.id)) {
          newNodeAnimsRef.current.set(n.id, {
            id: n.id,
            progress: 0,
            startScale: 0.1
          })
          break
        }
      }
      return prev
    })
  }, [nodes.length, onNodesChange])

  useEffect(() => {
    if (nodes.length > 0) {
      const latest = nodes[nodes.length - 1]
      if (!newNodeAnimsRef.current.has(latest.id)) {
        const existsBefore = nodes.length > 1
        if (!existsBefore || nodes.filter(n => n.id === latest.id).length === 1) {
          newNodeAnimsRef.current.set(latest.id, {
            id: latest.id,
            progress: 0,
            startScale: 0.1
          })
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.map(n => n.id).join(',')])

  const resetView = () => {
    scaleRef.current = 1
    offsetRef.current = { x: 0, y: 0 }
    forceRender()
  }

  const zoomIn = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    const newScale = clamp(scaleRef.current * 1.2, MIN_SCALE, MAX_SCALE)
    const actualFactor = newScale / scaleRef.current
    offsetRef.current = {
      x: cx - (cx - offsetRef.current.x) * actualFactor,
      y: cy - (cy - offsetRef.current.y) * actualFactor
    }
    scaleRef.current = newScale
    forceRender()
  }

  const zoomOut = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const cx = rect.width / 2
    const cy = rect.height / 2
    const newScale = clamp(scaleRef.current / 1.2, MIN_SCALE, MAX_SCALE)
    const actualFactor = newScale / scaleRef.current
    offsetRef.current = {
      x: cx - (cx - offsetRef.current.x) * actualFactor,
      y: cy - (cy - offsetRef.current.y) * actualFactor
    }
    scaleRef.current = newScale
    forceRender()
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor:
            pendingEdgeRef.current ? 'crosshair' :
              draggingRef.current?.type === 'node' ? 'grabbing' :
                draggingRef.current?.type === 'pan' ? 'grabbing' :
                  'default'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        onMouseLeave={handleMouseLeave}
      />
      <div style={zoomControls}>
        <button style={zoomBtn} onClick={zoomIn} title="放大">+</button>
        <button style={zoomBtn} onClick={zoomOut} title="缩小">−</button>
        <button style={zoomBtn} onClick={resetView} title="重置视图">⌂</button>
        <div style={zoomLabel}>{Math.round(scaleRef.current * 100)}%</div>
      </div>
      <div style={tipBar}>
        <span>双击空白创建节点 · 右键节点开始连线 · 右键关系线删除</span>
      </div>
    </div>
  )
}

const zoomControls: React.CSSProperties = {
  position: 'absolute',
  bottom: 20,
  right: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  backgroundColor: 'rgba(255,255,255,0.95)',
  padding: 8,
  borderRadius: 10,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  zIndex: 5,
}

const zoomBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 6,
  border: '1px solid #e0e0e0',
  backgroundColor: '#fff',
  fontSize: 18,
  fontWeight: 600,
  color: '#555',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 150ms',
}

const zoomLabel: React.CSSProperties = {
  fontSize: 11,
  textAlign: 'center',
  color: '#888',
  marginTop: 2,
  padding: '2px 4px',
}

const tipBar: React.CSSProperties = {
  position: 'absolute',
  top: 14,
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: 'rgba(255,255,255,0.9)',
  padding: '7px 18px',
  borderRadius: 20,
  fontSize: 12,
  color: '#666',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  zIndex: 5,
  pointerEvents: 'none',
}
