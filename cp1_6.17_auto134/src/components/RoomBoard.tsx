import { useState, useEffect, useRef, useCallback } from 'react'
import { RoomBoardProps, MindNode, Comment } from '../types'
import { getRandomColor, getTagColor, parseTags, generateId, getAvatarColor, getInitials, formatTime } from '../utils'

const NODE_W = 160
const NODE_H = 56
const ROOT_R = 50

function bezierPath(x1: number, y1: number, x2: number, y2: number, isRoot: boolean) {
  const dx = Math.abs(x2 - x1) * 0.5
  const cx1 = x1 + (x2 > x1 ? dx : -dx)
  const cy1 = y1
  const cx2 = x2 - (x2 > x1 ? dx : -dx)
  const cy2 = y2
  const sx = isRoot ? x1 : (x2 > x1 ? x1 + NODE_W / 2 : x1 - NODE_W / 2)
  const sy = y1
  const ex = isRoot ? x2 : (x2 > x1 ? x2 - NODE_W / 2 : x2 + NODE_W / 2)
  const ey = y2
  return `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`
}

function RoomBoard({
  roomState,
  userId,
  isHost,
  onCreateNode,
  onUpdateNode,
  onVote,
  onAddComment,
  selectedNodeId,
  onSelectNode,
  votingLocked,
}: RoomBoardProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 })
  const [dragging, setDragging] = useState<{ type: 'canvas' | 'node'; nodeId?: string; startX: number; startY: number; origX?: number; origY?: number; origVX?: number; origVY?: number } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [showVotePanel, setShowVotePanel] = useState<string | null>(null)
  const [showComments, setShowComments] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const animRef = useRef<number>(0)
  const [hoverNode, setHoverNode] = useState<string | null>(null)

  const toScreen = (cx: number, cy: number) => ({
    x: cx * view.scale + view.x,
    y: cy * view.scale + view.y,
  })

  const toCanvas = (sx: number, sy: number) => ({
    x: (sx - view.x) / view.scale,
    y: (sy - view.y) / view.scale,
  })

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.5, Math.min(3, view.scale * delta))
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const { x: cx, y: cy } = toCanvas(mx, my)
    setView({ scale: newScale, x: mx - cx * newScale, y: my - cy * newScale })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (
      target.closest('.mind-node') ||
      target.closest('.vote-btn') ||
      target.closest('.vote-panel') ||
      target.closest('.comment-area') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('button')
    ) {
      return
    }
    setDragging({ type: 'canvas', startX: e.clientX, startY: e.clientY, origVX: view.x, origVY: view.y })
  }

  const handleNodeMouseDown = (e: React.MouseEvent, node: MindNode) => {
    e.stopPropagation()
    if (node.parent_id === null) return
    if (votingLocked) return
    setDragging({ type: 'node', nodeId: node.id, startX: e.clientX, startY: e.clientY, origX: node.x, origY: node.y })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return
    if (dragging.type === 'canvas') {
      setView((v) => ({ ...v, x: dragging.origVX! + (e.clientX - dragging.startX), y: dragging.origVY! + (e.clientY - dragging.startY) }))
    } else if (dragging.type === 'node' && dragging.nodeId) {
      const dx = (e.clientX - dragging.startX) / view.scale
      const dy = (e.clientY - dragging.startY) / view.scale
      const newX = dragging.origX! + dx
      const newY = dragging.origY! + dy
      cancelAnimationFrame(animRef.current)
      animRef.current = requestAnimationFrame(() => {
        onUpdateNode(dragging.nodeId!, { x: newX, y: newY })
      })
    }
  }, [dragging, view.scale, onUpdateNode])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      cancelAnimationFrame(animRef.current)
    }
  }, [handleMouseMove, handleMouseUp])

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (votingLocked) return
    const target = e.target as HTMLElement
    if (target.closest('.mind-node')) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const { x: cx, y: cy } = toCanvas(mx, my)
    const nodes = Object.values(roomState.nodes)
    const rootNode = nodes.find((n) => n.parent_id === null)
    let parentId = rootNode?.id || ''
    let minDist = Infinity
    nodes.forEach((n) => {
      if (n.parent_id !== null) {
        const d = Math.sqrt((n.x - cx) ** 2 + (n.y - cy) ** 2)
        if (d < minDist) {
          minDist = d
          parentId = n.id
        }
      }
    })
    if (rootNode) {
      const d = Math.sqrt((rootNode.x - cx) ** 2 + (rootNode.y - cy) ** 2)
      if (d < minDist) parentId = rootNode.id
    }
    const newNode: Omit<MindNode, 'votes' | 'created_at'> = {
      id: generateId(),
      parent_id: parentId,
      title: '新想法',
      description: '',
      tags: [],
      x: cx,
      y: cy,
      color: getRandomColor(),
    }
    onCreateNode(newNode)
    setEditingId(newNode.id)
    setEditText('新想法')
  }

  const saveEdit = () => {
    if (!editingId) return
    const text = editText.slice(0, 80)
    const tags = parseTags(text)
    const title = text.replace(/#[\u4e00-\u9fa5a-zA-Z0-9]+/g, '').trim() || '新想法'
    onUpdateNode(editingId, { title, description: text, tags })
    setEditingId(null)
  }

  const startEdit = (node: MindNode) => {
    if (votingLocked && !isHost) return
    setEditingId(node.id)
    setEditText(node.description || node.title)
  }

  const getUserVote = (nodeId: string) => {
    return roomState.votes[nodeId]?.[userId] || 0
  }

  const getTopVotes = () => {
    const nonRoot = Object.values(roomState.nodes).filter((n) => n.parent_id !== null)
    if (nonRoot.length === 0) return 0
    return Math.max(...nonRoot.map((n) => n.votes))
  }

  const topVotes = getTopVotes()

  const handleAddComment = (nodeId: string) => {
    if (!newComment.trim()) return
    onAddComment(nodeId, newComment.trim())
    setNewComment('')
  }

  const nodes = Object.values(roomState.nodes)
  const rootNode = nodes.find((n) => n.parent_id === null)

  return (
    <div
      ref={canvasRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{
        width: '100%',
        height: '100%',
        background: '#1a1a2e',
        backgroundImage:
          'radial-gradient(circle, #252547 1px, transparent 1px)',
        backgroundSize: `${30 * view.scale}px ${30 * view.scale}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
        overflow: 'hidden',
        position: 'relative',
        cursor: dragging?.type === 'canvas' ? 'grabbing' : 'default',
      }}
    >
      <svg
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {nodes.map((node) => {
          if (!node.parent_id || !roomState.nodes[node.parent_id]) return null
          const parent = roomState.nodes[node.parent_id]
          const p = toScreen(parent.x, parent.y)
          const c = toScreen(node.x, node.y)
          const isRoot = parent.parent_id === null
          return (
            <path
              key={`edge-${node.id}`}
              d={bezierPath(p.x, p.y, c.x, c.y, isRoot)}
              stroke={node.color}
              strokeWidth={2 * view.scale}
              fill="none"
              strokeLinecap="round"
              opacity={0.7}
            />
          )
        })}
      </svg>

      {nodes.map((node) => {
        const pos = toScreen(node.x, node.y)
        const isRoot = node.parent_id === null
        const userVote = getUserVote(node.id)
        const totalVotes = node.votes
        const isTop = !isRoot && totalVotes > 0 && totalVotes === topVotes
        const isEditing = editingId === node.id
        const isHover = hoverNode === node.id
        const showVP = showVotePanel === node.id
        const showCM = showComments === node.id
        const scale = isHover && !isRoot ? 1.05 : 1

        if (isRoot) {
          return (
            <div
              key={node.id}
              className="mind-node fade-in"
              style={{
                position: 'absolute',
                left: pos.x - ROOT_R * view.scale,
                top: pos.y - ROOT_R * view.scale,
                width: ROOT_R * 2 * view.scale,
                height: ROOT_R * 2 * view.scale,
                borderRadius: '50%',
                background: `linear-gradient(135deg, #0f3460 0%, #533483 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 16 * view.scale,
                boxShadow: `0 4px 20px rgba(83, 52, 131, 0.5)`,
                border: isTop ? `${3 * view.scale}px solid gold` : 'none',
                cursor: 'pointer',
                userSelect: 'none',
                zIndex: 10,
              }}
              onMouseEnter={() => setHoverNode(node.id)}
              onMouseLeave={() => setHoverNode(null)}
              onDoubleClick={(e) => {
                e.stopPropagation()
                if (!votingLocked || isHost) startEdit(node)
              }}
            >
              {isEditing ? (
                <input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    width: '80%',
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    textAlign: 'center',
                    fontSize: 14 * view.scale,
                    borderRadius: 4,
                    padding: 4,
                  }}
                />
              ) : (
                <span style={{ maxWidth: '85%', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {node.title}
                </span>
              )}
            </div>
          )
        }

        const nodeW = NODE_W * view.scale
        const nodeH = NODE_H * view.scale

        return (
          <div
            key={node.id}
            className="mind-node fade-in"
            style={{
              position: 'absolute',
              left: pos.x - nodeW / 2,
              top: pos.y - nodeH / 2,
              width: nodeW,
              zIndex: selectedNodeId === node.id ? 20 : 10,
              transform: `scale(${scale})`,
              transformOrigin: 'center',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={() => setHoverNode(node.id)}
            onMouseLeave={() => setHoverNode(null)}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            onDoubleClick={(e) => {
              e.stopPropagation()
              if (!votingLocked || isHost) startEdit(node)
            }}
            onClick={(e) => {
              e.stopPropagation()
              onSelectNode(node.id)
            }}
          >
            <div
              style={{
                padding: `${8 * view.scale}px ${12 * view.scale}px`,
                borderRadius: 10 * view.scale,
                background: node.color,
                color: '#fff',
                fontSize: 13 * view.scale,
                lineHeight: 1.3,
                boxShadow: isHover ? `0 6px 20px rgba(0,0,0,0.4)` : `0 2px 10px rgba(0,0,0,0.2)`,
                border: isTop ? `${3 * view.scale}px solid` : `${1 * view.scale}px solid rgba(255,255,255,0.2)`,
                borderImage: isTop ? 'linear-gradient(135deg, #ffd700, #ffb347) 1' : undefined,
                cursor: dragging?.nodeId === node.id ? 'grabbing' : 'grab',
                position: 'relative',
              }}
            >
              {isEditing ? (
                <textarea
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={saveEdit}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  maxLength={80}
                  style={{
                    width: '100%',
                    minHeight: nodeH - 16 * view.scale,
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontSize: 13 * view.scale,
                    borderRadius: 4,
                    padding: 4,
                    resize: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              ) : (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.title}
                  </div>
                  {node.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
                      {node.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: 10 * view.scale,
                            padding: `${1 * view.scale}px ${6 * view.scale}px`,
                            borderRadius: 8 * view.scale,
                            background: getTagColor(t),
                            color: '#fff',
                            fontWeight: 500,
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div
                style={{
                  position: 'absolute',
                  right: -6 * view.scale,
                  bottom: -6 * view.scale,
                  minWidth: 28 * view.scale,
                  height: 22 * view.scale,
                  padding: `0 ${6 * view.scale}px`,
                  borderRadius: 11 * view.scale,
                  background: totalVotes >= 0 ? '#1a5f3c' : '#7a1f2d',
                  color: totalVotes >= 0 ? '#6bcf7f' : '#ff6b6b',
                  fontSize: 11 * view.scale,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `${1 * view.scale}px solid rgba(255,255,255,0.15)`,
                }}
              >
                {totalVotes >= 0 ? '+' : ''}{totalVotes}
              </div>

              {!votingLocked && (
                <button
                  className="vote-btn bounce-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowVotePanel(showVP ? null : node.id)
                    setShowComments(null)
                  }}
                  style={{
                    position: 'absolute',
                    right: -16 * view.scale,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 32 * view.scale,
                    height: 32 * view.scale,
                    borderRadius: '50%',
                    border: 'none',
                    background: userVote !== 0
                      ? (userVote === 1 ? 'linear-gradient(135deg, #1a5f3c, #6bcf7f)' : 'linear-gradient(135deg, #7a1f2d, #e94560)')
                      : 'linear-gradient(135deg, #0f3460, #533483)',
                    color: '#fff',
                    fontSize: 14 * view.scale,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    padding: 0,
                  }}
                >
                  🗳
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowComments(showCM ? null : node.id)
                  setShowVotePanel(null)
                }}
                style={{
                  position: 'absolute',
                  left: -16 * view.scale,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 28 * view.scale,
                  height: 28 * view.scale,
                  borderRadius: '50%',
                  border: 'none',
                  background: '#16213e',
                  color: '#fff',
                  fontSize: 13 * view.scale,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                💬
              </button>
            </div>

            {showVP && !votingLocked && (
              <div
                className="vote-panel fade-in"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  right: -120 * view.scale,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#16213e',
                  borderRadius: 10 * view.scale,
                  padding: 10 * view.scale,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8 * view.scale,
                  boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
                  border: `${1 * view.scale}px solid #0f3460`,
                  zIndex: 100,
                }}
              >
                <button
                  className="bounce-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    onVote(node.id, 1)
                  }}
                  style={{
                    width: 36 * view.scale,
                    height: 36 * view.scale,
                    borderRadius: 8 * view.scale,
                    border: 'none',
                    background: userVote === 1 ? '#1a5f3c' : '#1a1a2e',
                    color: userVote === 1 ? '#6bcf7f' : '#e0e0e0',
                    fontSize: 18 * view.scale,
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  +1
                </button>
                <div style={{ fontSize: 16 * view.scale, fontWeight: 700, color: totalVotes >= 0 ? '#6bcf7f' : '#e94560', minWidth: 36 * view.scale, textAlign: 'center' }}>
                  {totalVotes >= 0 ? '+' : ''}{totalVotes}
                </div>
                <button
                  className="bounce-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    onVote(node.id, -1)
                  }}
                  style={{
                    width: 36 * view.scale,
                    height: 36 * view.scale,
                    borderRadius: 8 * view.scale,
                    border: 'none',
                    background: userVote === -1 ? '#7a1f2d' : '#1a1a2e',
                    color: userVote === -1 ? '#e94560' : '#e0e0e0',
                    fontSize: 18 * view.scale,
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  -1
                </button>
              </div>
            )}

            {showCM && (
              <div
                className="comment-area fade-in"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  left: -4 * view.scale,
                  top: nodeH + 8 * view.scale,
                  width: 240 * view.scale,
                  background: '#16213e',
                  borderRadius: 10 * view.scale,
                  padding: 12 * view.scale,
                  boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
                  border: `${1 * view.scale}px solid #0f3460`,
                  zIndex: 100,
                }}
              >
                <div style={{ fontSize: 12 * view.scale, color: '#8892b0', marginBottom: 8 * view.scale, fontWeight: 600 }}>
                  💬 评论 ({Math.min((roomState.comments[node.id] || []).length, 5)})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 * view.scale, marginBottom: 10 * view.scale, maxHeight: 160 * view.scale, overflowY: 'auto' }}>
                  {(roomState.comments[node.id] || [])
                    .sort((a, b) => b.created_at - a.created_at)
                    .slice(0, 5)
                    .map((c: Comment) => (
                      <div key={c.id} style={{ display: 'flex', gap: 8 * view.scale, alignItems: 'flex-start' }}>
                        <div style={{
                          width: 24 * view.scale,
                          height: 24 * view.scale,
                          borderRadius: '50%',
                          background: getAvatarColor(c.user_id),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 10 * view.scale,
                          fontWeight: 600,
                          flexShrink: 0,
                        }}>
                          {getInitials(c.user_name)}
                        </div>
                        <div style={{ flex: 1, padding: `${6 * view.scale}px ${10 * view.scale}px`, borderRadius: 10 * view.scale, background: 'rgba(255,255,255,0.06)', borderBottomLeftRadius: 2 * view.scale }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 * view.scale }}>
                            <span style={{ fontSize: 10 * view.scale, color: '#8892b0', fontWeight: 600 }}>{c.user_name}</span>
                            <span style={{ fontSize: 9 * view.scale, color: '#555' }}>{formatTime(c.created_at)}</span>
                          </div>
                          <div style={{ fontSize: 12 * view.scale, color: '#e0e0e0' }}>{c.content}</div>
                        </div>
                      </div>
                    ))}
                  {(roomState.comments[node.id] || []).length === 0 && (
                    <div style={{ fontSize: 11 * view.scale, color: '#555', textAlign: 'center', padding: 8 * view.scale }}>暂无评论</div>
                  )}
                </div>
                {!votingLocked && (
                  <div style={{ display: 'flex', gap: 6 * view.scale }}>
                    <input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(node.id)}
                      placeholder="写评论..."
                      style={{
                        flex: 1,
                        padding: `${6 * view.scale}px ${10 * view.scale}px`,
                        borderRadius: 6 * view.scale,
                        border: `${1 * view.scale}px solid #0f3460`,
                        background: '#1a1a2e',
                        color: '#e0e0e0',
                        fontSize: 12 * view.scale,
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAddComment(node.id)
                      }}
                      className="bounce-btn"
                      style={{
                        padding: `${6 * view.scale}px ${12 * view.scale}px`,
                        borderRadius: 6 * view.scale,
                        border: 'none',
                        background: 'linear-gradient(135deg, #0f3460 0%, #533483 100%)',
                        color: '#fff',
                        fontSize: 12 * view.scale,
                        cursor: 'pointer',
                      }}
                    >
                      发送
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => setView((v) => ({ ...v, scale: Math.min(3, v.scale * 1.2) }))}
          className="bounce-btn"
          style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: '#16213e', color: '#fff', fontSize: 18, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
        >
          +
        </button>
        <button
          onClick={() => setView((v) => ({ ...v, scale: Math.max(0.5, v.scale / 1.2) }))}
          className="bounce-btn"
          style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: '#16213e', color: '#fff', fontSize: 18, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
        >
          −
        </button>
        <button
          onClick={() => setView({ x: 0, y: 0, scale: 1 })}
          className="bounce-btn"
          style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: '#16213e', color: '#fff', fontSize: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
        >
          ⟳
        </button>
      </div>

      {!votingLocked && (
        <div style={{ position: 'absolute', bottom: 16, left: 16, padding: '8px 14px', background: 'rgba(22, 33, 62, 0.9)', borderRadius: 8, fontSize: 12, color: '#8892b0', pointerEvents: 'none' }}>
          💡 双击画布空白处创建新节点 · 拖拽节点移动位置 · 滚轮缩放 · 拖拽空白平移
        </div>
      )}
    </div>
  )
}

export default RoomBoard
