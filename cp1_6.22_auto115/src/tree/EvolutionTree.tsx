import React, { useState, useEffect, useMemo, useRef } from 'react'
import * as dagre from 'dagre'
import { TreeNode, GENE_COLOR_HEX, GeneColor } from '../types'

interface EvolutionTreeProps {
  tree: TreeNode[]
  onNodeClick: (node: TreeNode) => void
}

const NODE_SIZE = 75
const NODE_RADIUS = NODE_SIZE / 2

interface LaidOutNode extends TreeNode {
  x: number
  y: number
  width: number
  height: number
}

interface LaidOutEdge {
  points: { x: number; y: number }[]
  v: string
  w: string
}

function buildDagreLayout(nodes: TreeNode[]): {
  laidOutNodes: LaidOutNode[]
  edges: LaidOutEdge[]
  width: number
  height: number
} {
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir: 'TB',
    ranksep: 90,
    nodesep: 40,
    marginx: 60,
    marginy: 60
  })
  g.setDefaultEdgeLabel(() => ({}))

  if (nodes.length === 0) {
    return { laidOutNodes: [], edges: [], width: 0, height: 0 }
  }

  nodes.forEach(n => {
    g.setNode(n.id, { width: NODE_SIZE, height: NODE_SIZE })
  })

  const edgeSet = new Set<string>()
  nodes.forEach(n => {
    n.parentIds.forEach(pid => {
      const key = `${pid}->${n.id}`
      if (!edgeSet.has(key) && g.node(pid)) {
        g.setEdge(pid, n.id, {})
        edgeSet.add(key)
      }
    })
  })

  dagre.layout(g)

  const laidOutNodes: LaidOutNode[] = nodes.map(n => {
    const pos = g.node(n.id)
    return { ...n, x: pos.x, y: pos.y, width: NODE_SIZE, height: NODE_SIZE }
  })

  const edges: LaidOutEdge[] = g.edges().map(e => {
    const ge = g.edge(e)
    return {
      v: e.v,
      w: e.w,
      points: ge.points || []
    }
  })

  const graph = g.graph()
  return {
    laidOutNodes,
    edges,
    width: (graph.width || 600) + 60,
    height: (graph.height || 400) + 60
  }
}

function genesToDominantColor(genes: GeneColor[]): string {
  const counts: Record<string, number> = {}
  genes.forEach(g => { if (g) counts[g] = (counts[g] || 0) + 1 })
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return '#334155'
  return GENE_COLOR_HEX[entries[0][0]] || '#334155'
}

function describeLeaf(shape: string): string {
  const m: Record<string, string> = {
    round: '圆形叶',
    pointed: '披针形叶',
    heart: '心形叶',
    lanceolate: '细长叶'
  }
  return m[shape] || '普通叶'
}

export default function EvolutionTree({ tree, onNodeClick }: EvolutionTreeProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { laidOutNodes, edges, width, height } = useMemo(() => buildDagreLayout(tree), [tree])

  const hoveredNode = hoveredId ? laidOutNodes.find(n => n.id === hoveredId) : null

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    setScale(prev => Math.max(0.3, Math.min(2.5, prev + delta)))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'circle') return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return
    setTranslate({
      x: dragStartRef.current.tx + (e.clientX - dragStartRef.current.x),
      y: dragStartRef.current.ty + (e.clientY - dragStartRef.current.y)
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    dragStartRef.current = null
  }

  const resetView = () => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }

  const fitToScreen = () => {
    if (!containerRef.current || width === 0 || height === 0) return
    const rect = containerRef.current.getBoundingClientRect()
    const sx = (rect.width - 40) / width
    const sy = (rect.height - 40) / height
    const s = Math.min(sx, sy, 1.2)
    setScale(s)
    setTranslate({
      x: (rect.width - width * s) / 2,
      y: (rect.height - height * s) / 2
    })
  }

  useEffect(() => {
    if (tree.length > 0) {
      setTimeout(fitToScreen, 50)
    }
  }, [tree.length])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #161026 0%, #0f0a1a 100%)',
        position: 'relative',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={{
        position: 'absolute',
        top: 14,
        left: 14,
        zIndex: 20,
        padding: '10px 14px',
        background: 'rgba(30, 41, 59, 0.85)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: 8,
        backdropFilter: 'blur(6px)'
      }}>
        <div style={{ color: '#22d3ee', fontWeight: 700, fontSize: 14, marginBottom: 3 }}>🌳 进化树</div>
        <div style={{ color: '#94a3b8', fontSize: 11 }}>
          节点数: <span style={{ color: '#f59e0b' }}>{tree.length}</span>
          {selectedId && <span> · 选中: <span style={{ color: '#22d3ee' }}>{laidOutNodes.find(n=>n.id===selectedId)?.plantName}</span></span>}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        top: 14,
        right: 14,
        zIndex: 20,
        display: 'flex',
        gap: 6
      }}>
        <button
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(2.5, s + 0.2)) }}
          style={btnStyle}
        >+</button>
        <button
          onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(0.3, s - 0.2)) }}
          style={btnStyle}
        >−</button>
        <button
          onClick={(e) => { e.stopPropagation(); fitToScreen() }}
          style={btnStyle}
          title="适配屏幕"
        >⊙</button>
        <button
          onClick={(e) => { e.stopPropagation(); resetView() }}
          style={btnStyle}
        >⟲</button>
      </div>

      {tree.length === 0 ? (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#475569',
          fontSize: 13,
          flexDirection: 'column',
          gap: 8
        }}>
          <div style={{ fontSize: 48, opacity: 0.3 }}>🌱</div>
          <div>种植或杂交植物后，进化树将自动生成</div>
        </div>
      ) : (
        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', inset: 0 }}
        >
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {laidOutNodes.map(n => {
              const color = genesToDominantColor(n.geneSequence)
              return (
                <radialGradient key={`grad-${n.id}`} id={`grad-${n.id}`} cx="35%" cy="35%">
                  <stop offset="0%" stopColor={color} stopOpacity="1" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.4" />
                </radialGradient>
              )
            })}
          </defs>
          <g
            transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}
            style={{ transition: isDragging ? 'none' : 'transform 0.1s' }}
          >
            {edges.map((e, i) => {
              if (e.points.length < 2) return null
              const d = e.points.reduce((acc, p, idx) => {
                if (idx === 0) return `M ${p.x} ${p.y}`
                return `${acc} L ${p.x} ${p.y}`
              }, '')
              const isHighlight = hoveredId && (e.v === hoveredId || e.w === hoveredId)
              return (
                <path
                  key={`edge-${i}`}
                  d={d}
                  fill="none"
                  stroke={isHighlight ? '#22d3ee' : '#ffffff40'}
                  strokeWidth={isHighlight ? 6 : 4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={isHighlight ? 1 : 0.6}
                  style={{ transition: 'all 0.25s' }}
                />
              )
            })}

            {laidOutNodes.map(n => {
              const color = genesToDominantColor(n.geneSequence)
              const isHovered = hoveredId === n.id
              const isSelected = selectedId === n.id
              return (
                <g
                  key={n.id}
                  transform={`translate(${n.x}, ${n.y})`}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredId(n.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(n.id); onNodeClick(n) }}
                >
                  <circle
                    r={NODE_RADIUS + (isHovered || isSelected ? 5 : 0)}
                    fill="none"
                    stroke={isSelected ? '#f59e0b' : isHovered ? '#22d3ee' : 'transparent'}
                    strokeWidth={3}
                    style={{ transition: 'all 0.2s' }}
                    opacity={0.9}
                  />
                  <circle
                    r={NODE_RADIUS}
                    fill={`url(#grad-${n.id})`}
                    stroke={color}
                    strokeWidth={2}
                    filter="url(#glow)"
                    style={{ transition: 'all 0.2s' }}
                  />
                  <circle
                    r={NODE_RADIUS * 0.55}
                    fill={color}
                    opacity={0.85}
                  />
                  <text
                    textAnchor="middle"
                    dy="0.35em"
                    fontSize={n.plantName.length > 3 ? 11 : 13}
                    fontWeight={700}
                    fill="#fff"
                    style={{ pointerEvents: 'none', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
                  >
                    {n.plantName}
                  </text>
                  <text
                    textAnchor="middle"
                    y={NODE_RADIUS + 16}
                    fontSize={10}
                    fill={isSelected ? '#f59e0b' : '#64748b'}
                    fontWeight={600}
                  >
                    G{n.generation}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      )}

      {hoveredNode && (
        <div
          style={{
            position: 'absolute',
            zIndex: 30,
            pointerEvents: 'none',
            left: Math.min(window.innerWidth - 260, translate.x + hoveredNode.x * scale + NODE_RADIUS + 16),
            top: Math.max(10, translate.y + hoveredNode.y * scale - NODE_RADIUS - 20),
            width: 240,
            padding: 14,
            background: 'rgba(15, 23, 42, 0.95)',
            border: `1px solid ${genesToDominantColor(hoveredNode.geneSequence)}60`,
            borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%',
              background: genesToDominantColor(hoveredNode.geneSequence),
              boxShadow: `0 0 8px ${genesToDominantColor(hoveredNode.geneSequence)}`
            }} />
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14 }}>{hoveredNode.plantName}</span>
            <span style={{ marginLeft: 'auto', color: '#f59e0b', fontSize: 10 }}>第 {hoveredNode.generation} 代</span>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ color: '#64748b', fontSize: 10, marginBottom: 4 }}>基因序列</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {hoveredNode.geneSequence.map((g, i) => (
                <div key={i} style={{
                  width: 16, height: 16, borderRadius: 4,
                  background: g ? GENE_COLOR_HEX[g] : '#334155',
                  border: g ? `1px solid ${GENE_COLOR_HEX[g]}80` : '1px solid #475569',
                  fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700
                }}>
                  {g ? g[0].toUpperCase() : ''}
                </div>
              ))}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px 10px',
            fontSize: 11
          }}>
            <div>
              <div style={{ color: '#64748b' }}>花瓣颜色</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: hoveredNode.traits.petalColor }} />
                <span style={{ color: '#e2e8f0' }}>自然色</span>
              </div>
            </div>
            <div>
              <div style={{ color: '#64748b' }}>叶形</div>
              <div style={{ color: '#e2e8f0', marginTop: 2 }}>{describeLeaf(hoveredNode.traits.leafShape)}</div>
            </div>
            <div>
              <div style={{ color: '#64748b' }}>株高</div>
              <div style={{ color: '#22d3ee', marginTop: 2, fontWeight: 600 }}>{Math.round(hoveredNode.traits.height * 50)} cm</div>
            </div>
            <div>
              <div style={{ color: '#64748b' }}>花径</div>
              <div style={{ color: '#f59e0b', marginTop: 2, fontWeight: 600 }}>{Math.round(hoveredNode.traits.flowerSize * 100)} mm</div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ color: '#64748b', marginBottom: 3 }}>抗病性</div>
              <div style={{ height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${hoveredNode.traits.diseaseResistance * 100}%`,
                  background: 'linear-gradient(90deg, #22d3ee, #4ade80)',
                  transition: 'width 0.4s'
                }} />
              </div>
            </div>
          </div>

          {hoveredNode.parentIds.length > 0 && (
            <div style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid #334155',
              fontSize: 10,
              color: '#64748b'
            }}>
              亲本数: <span style={{ color: '#94a3b8' }}>{hoveredNode.parentIds.length}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1px solid rgba(56, 189, 248, 0.3)',
  background: 'rgba(30, 41, 59, 0.9)',
  color: '#cbd5e1',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}
