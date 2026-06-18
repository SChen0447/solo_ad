import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useStoryStore } from '../../store/useStoryStore'
import { NodeComponent } from './NodeComponent'

const GRID_SIZE = 50
const MIN_SCALE = 0.3
const MAX_SCALE = 3
const NODE_WIDTH = 240
const NODE_MIN_HEIGHT = 120

export const MapCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [offsetStart, setOffsetStart] = useState({ x: 0, y: 0 })

  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [nodeStartPos, setNodeStartPos] = useState({ x: 0, y: 0 })

  const [connecting, setConnecting] = useState<{
    fromNodeId: string
    fromOptionId: string | null
    startX: number
    startY: number
    mouseX: number
    mouseY: number
  } | null>(null)

  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null)

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [viewport, setViewport] = useState({ x: 0, y: 0, width: 0, height: 0 })

  const {
    nodes,
    connections,
    selectedNodeId,
    selectedConnectionId,
    addNode,
    updateNode,
    selectNode,
    addConnection,
    deleteConnection,
    selectConnection,
  } = useStoryStore()

  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        setCanvasSize({ width: rect.width, height: rect.height })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    const viewX = -offset.x / scale
    const viewY = -offset.y / scale
    const viewW = canvasSize.width / scale
    const viewH = canvasSize.height / scale
    setViewport({ x: viewX, y: viewY, width: viewW, height: viewH })
  }, [offset, scale, canvasSize])

  const visibleNodes = useMemo(() => {
    if (nodes.length <= 50) return nodes
    return nodes.filter((node) => {
      return (
        node.x + NODE_WIDTH >= viewport.x - 50 &&
        node.x <= viewport.x + viewport.width + 50 &&
        node.y + NODE_MIN_HEIGHT >= viewport.y - 50 &&
        node.y <= viewport.y + viewport.height + 50
      )
    })
  }, [nodes, viewport])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed) {
        setSpacePressed(true)
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'grab'
        }
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false)
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'default'
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [spacePressed])

  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 }
      const rect = canvasRef.current.getBoundingClientRect()
      return {
        x: (screenX - rect.left - offset.x) / scale,
        y: (screenY - rect.top - offset.y) / scale,
      }
    },
    [offset, scale]
  )

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * delta))

    const scaleRatio = newScale / scale
    const newOffsetX = mouseX - (mouseX - offset.x) * scaleRatio
    const newOffsetY = mouseY - (mouseY - offset.y) * scaleRatio

    setScale(newScale)
    setOffset({ x: newOffsetX, y: newOffsetY })
  }, [scale, offset])

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (spacePressed || e.button === 1) {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      setOffsetStart({ ...offset })
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing'
      }
      return
    }

    if (e.target === e.currentTarget) {
      selectNode(null)
      selectConnection(null)
    }
  }, [spacePressed, offset, selectNode, selectConnection])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      setOffset({
        x: offsetStart.x + dx,
        y: offsetStart.y + dy,
      })
      return
    }

    if (draggingNode) {
      const world = screenToWorld(e.clientX, e.clientY)
      const dx = world.x - dragStart.x
      const dy = world.y - dragStart.y
      updateNode(draggingNode, {
        x: Math.round((nodeStartPos.x + dx) / 10) * 10,
        y: Math.round((nodeStartPos.y + dy) / 10) * 10,
      })
    }

    if (connecting) {
      const world = screenToWorld(e.clientX, e.clientY)
      setConnecting({
        ...connecting,
        mouseX: world.x,
        mouseY: world.y,
      })
    }
  }, [isPanning, panStart, offsetStart, draggingNode, dragStart, nodeStartPos, connecting, screenToWorld, updateNode])

  const handleCanvasMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false)
      if (canvasRef.current && !spacePressed) {
        canvasRef.current.style.cursor = 'default'
      }
    }

    if (draggingNode) {
      setDraggingNode(null)
    }

    if (connecting) {
      setConnecting(null)
    }
  }, [isPanning, spacePressed, draggingNode, connecting])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      const world = screenToWorld(e.clientX, e.clientY)
      const nodeId = addNode(
        Math.round(world.x / 10) * 10 - NODE_WIDTH / 2,
        Math.round(world.y / 10) * 10 - 40
      )
      selectNode(nodeId)
    }
  }, [screenToWorld, addNode, selectNode])

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (spacePressed) return
    e.stopPropagation()

    selectNode(nodeId)

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    const world = screenToWorld(e.clientX, e.clientY)
    setDraggingNode(nodeId)
    setDragStart({ x: world.x, y: world.y })
    setNodeStartPos({ x: node.x, y: node.y })
  }, [spacePressed, nodes, screenToWorld, selectNode])

  const handlePortMouseDown = useCallback((e: React.MouseEvent, nodeId: string, optionId?: string) => {
    e.stopPropagation()

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return

    const startX = node.x + NODE_WIDTH
    const startY = node.y + 60

    setConnecting({
      fromNodeId: nodeId,
      fromOptionId: optionId || null,
      startX,
      startY,
      mouseX: startX,
      mouseY: startY,
    })
  }, [nodes])

  const handleNodeMouseUp = useCallback((_e: React.MouseEvent, nodeId: string) => {
    if (connecting && connecting.fromNodeId !== nodeId) {
      addConnection(connecting.fromNodeId, nodeId, connecting.fromOptionId)
      setConnecting(null)
    }
  }, [connecting, addConnection])

  const handleConnectionContextMenu = useCallback((e: React.MouseEvent, connId: string) => {
    e.preventDefault()
    e.stopPropagation()
    deleteConnection(connId)
  }, [deleteConnection])

  const getConnectionPath = useCallback((fromNodeId: string, toNodeId: string) => {
    const fromNode = nodes.find((n) => n.id === fromNodeId)
    const toNode = nodes.find((n) => n.id === toNodeId)
    if (!fromNode || !toNode) return ''

    const startX = fromNode.x + NODE_WIDTH
    const startY = fromNode.y + 60
    const endX = toNode.x
    const endY = toNode.y + 60

    const dx = Math.abs(endX - startX)
    const controlOffset = Math.max(50, dx * 0.5)

    return `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`
  }, [nodes])

  const getSnapLines = useCallback(() => {
    if (!draggingNode) return null
    const draggingNodeData = nodes.find((n) => n.id === draggingNode)
    if (!draggingNodeData) return null

    const centerX = draggingNodeData.x + NODE_WIDTH / 2
    const centerY = draggingNodeData.y + 80

    let nearestX = Infinity
    let nearestY = Infinity
    let snapX: number | null = null
    let snapY: number | null = null

    nodes.forEach((node) => {
      if (node.id === draggingNode) return
      const nodeCenterX = node.x + NODE_WIDTH / 2
      const nodeCenterY = node.y + 80

      const distX = Math.abs(centerX - nodeCenterX)
      if (distX < nearestX && distX < 100) {
        nearestX = distX
        snapX = nodeCenterX
      }

      const distY = Math.abs(centerY - nodeCenterY)
      if (distY < nearestY && distY < 100) {
        nearestY = distY
        snapY = nodeCenterY
      }
    })

    return { snapX, snapY }
  }, [draggingNode, nodes])

  const snapLines = getSnapLines()

  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; isMajor: boolean }[] = []
    
    const startX = Math.floor(viewport.x / GRID_SIZE) * GRID_SIZE
    const startY = Math.floor(viewport.y / GRID_SIZE) * GRID_SIZE
    const endX = viewport.x + viewport.width + GRID_SIZE
    const endY = viewport.y + viewport.height + GRID_SIZE

    for (let x = startX; x <= endX; x += GRID_SIZE) {
      lines.push({ x1: x, y1: viewport.y - 50, x2: x, y2: endY + 50, isMajor: x % (GRID_SIZE * 5) === 0 })
    }
    for (let y = startY; y <= endY; y += GRID_SIZE) {
      lines.push({ x1: viewport.x - 50, y1: y, x2: endX + 50, y2: y, isMajor: y % (GRID_SIZE * 5) === 0 })
    }

    return lines
  }, [viewport])

  return (
    <div
      ref={canvasRef}
      style={{
        flex: 1,
        position: 'relative',
        backgroundColor: '#1e1e1e',
        overflow: 'hidden',
        cursor: spacePressed ? 'grab' : 'default',
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
    >
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
          {gridLines.map((line, i) => (
            <line
              key={i}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={line.isMajor ? '#2a2a2a' : '#333333'}
              strokeWidth={line.isMajor ? 1 : 0.5}
            />
          ))}

          {snapLines && snapLines.snapX && (
            <line
              x1={snapLines.snapX}
              y1={viewport.y - 100}
              x2={snapLines.snapX}
              y2={viewport.y + viewport.height + 100}
              stroke="#4fc3f7"
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.6}
            />
          )}
          {snapLines && snapLines.snapY && (
            <line
              x1={viewport.x - 100}
              y1={snapLines.snapY}
              x2={viewport.x + viewport.width + 100}
              y2={snapLines.snapY}
              stroke="#4fc3f7"
              strokeWidth={1}
              strokeDasharray="5,5"
              opacity={0.6}
            />
          )}

          <g style={{ pointerEvents: 'stroke' }}>
            {connections.map((conn) => {
              const path = getConnectionPath(conn.fromNodeId, conn.toNodeId)
              const isHovered = hoveredConnection === conn.id
              const isSelected = selectedConnectionId === conn.id
              return (
                <g key={conn.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={15 / scale}
                    style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredConnection(conn.id)}
                    onMouseLeave={() => setHoveredConnection(null)}
                    onContextMenu={(e) => handleConnectionContextMenu(e, conn.id)}
                    onClick={(e) => {
                      e.stopPropagation()
                      selectConnection(conn.id)
                    }}
                  />
                  <path
                    d={path}
                    fill="none"
                    stroke={isHovered || isSelected ? '#4fc3f7' : '#888888'}
                    strokeWidth={2}
                    strokeDasharray={isSelected ? '8,4' : undefined}
                    style={{
                      pointerEvents: 'none',
                      transition: 'stroke 0.2s ease',
                    }}
                  />
                </g>
              )
            })}

            {connecting && (
              <path
                d={`M ${connecting.startX} ${connecting.startY} C ${connecting.startX + 80} ${connecting.startY}, ${connecting.mouseX - 80} ${connecting.mouseY}, ${connecting.mouseX} ${connecting.mouseY}`}
                fill="none"
                stroke="#4fc3f7"
                strokeWidth={2}
                strokeDasharray="6,4"
                style={{ pointerEvents: 'none' }}
              />
            )}
          </g>
        </g>
      </svg>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            pointerEvents: 'none',
          }}
        >
          {visibleNodes.map((node) => (
            <div
              key={node.id}
              style={{ pointerEvents: 'auto' }}
              onMouseUp={(e) => handleNodeMouseUp(e, node.id)}
            >
              <NodeComponent
                node={node}
                isSelected={selectedNodeId === node.id}
                scale={scale}
                isDragging={draggingNode === node.id}
                onMouseDown={handleNodeMouseDown}
                onPortMouseDown={handlePortMouseDown}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          backgroundColor: 'rgba(45, 45, 45, 0.9)',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#aaa',
          border: '1px solid #444',
        }}
      >
        缩放: {Math.round(scale * 100)}%
        <span style={{ marginLeft: '12px', color: '#666' }}>|</span>
        <span style={{ marginLeft: '12px' }}>节点: {nodes.length}</span>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          backgroundColor: 'rgba(45, 45, 45, 0.9)',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#888',
          border: '1px solid #444',
          lineHeight: 1.6,
        }}
      >
        <div>双击画布创建节点</div>
        <div>空格键 + 拖拽平移画布</div>
        <div>滚轮缩放</div>
        <div>拖拽端口创建连线</div>
        <div>右键连线删除</div>
      </div>
    </div>
  )
}
