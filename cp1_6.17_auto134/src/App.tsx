import { useState, useEffect, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import axios from 'axios'
import RoomBoard from './components/RoomBoard'
import VotePanel from './components/VotePanel'
import { RoomState, MindNode, Comment, User } from './types'
import { generateId, getAvatarColor, getInitials } from './utils'

type View = 'lobby' | 'room'

function App() {
  const [view, setView] = useState<View>('lobby')
  const [roomCode, setRoomCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null)
  const [conclusionText, setConclusionText] = useState('')
  const [remainingTime, setRemainingTime] = useState(0)
  const [showResult, setShowResult] = useState(false)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!roomState?.countdown_started_at || roomState.countdown_duration === 0) {
      setRemainingTime(0)
      return
    }
    const updateTimer = () => {
      const elapsed = (Date.now() / 1000) - roomState.countdown_started_at!
      const remaining = Math.max(0, roomState.countdown_duration * 60 - elapsed)
      setRemainingTime(remaining)
      if (remaining <= 0 && !roomState.voting_locked) {
      }
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [roomState?.countdown_started_at, roomState?.countdown_duration, roomState?.voting_locked])

  const initSocket = useCallback((code: string, uid: string, uname: string) => {
    const newSocket = io('/', { path: '/socket.io', transports: ['websocket', 'polling'] })
    socketRef.current = newSocket
    setSocket(newSocket)

    newSocket.on('connect', () => {
      newSocket.emit('join_room', { room_code: code, user_id: uid, user_name: uname })
    })

    newSocket.on('room_state', (state: RoomState) => {
      setRoomState(state)
      setShowResult(state.voting_locked && !!state.final_result)
    })

    newSocket.on('user_joined', (data: { user_id: string; user_name: string; users: Record<string, User> }) => {
      setRoomState((prev) => prev ? { ...prev, users: data.users } : prev)
    })

    newSocket.on('node_created', (data: { node: MindNode }) => {
      setRoomState((prev) => {
        if (!prev) return prev
        return { ...prev, nodes: { ...prev.nodes, [data.node.id]: data.node } }
      })
    })

    newSocket.on('node_updated', (data: { node_id: string; updates: Partial<MindNode> }) => {
      setRoomState((prev) => {
        if (!prev || !prev.nodes[data.node_id]) return prev
        return {
          ...prev,
          nodes: {
            ...prev.nodes,
            [data.node_id]: { ...prev.nodes[data.node_id], ...data.updates },
          },
        }
      })
    })

    newSocket.on('vote_updated', (data: { node_id: string; total: number; user_vote: number; user_id: string }) => {
      setRoomState((prev) => {
        if (!prev) return prev
        const newVotes = { ...prev.votes }
        if (!newVotes[data.node_id]) newVotes[data.node_id] = {}
        if (data.user_vote === 0) {
          delete newVotes[data.node_id][data.user_id]
        } else {
          newVotes[data.node_id][data.user_id] = data.user_vote
        }
        const newNodes = { ...prev.nodes }
        if (newNodes[data.node_id]) {
          newNodes[data.node_id] = { ...newNodes[data.node_id], votes: data.total }
        }
        return { ...prev, votes: newVotes, nodes: newNodes }
      })
    })

    newSocket.on('comment_added', (data: { node_id: string; comment: Comment }) => {
      setRoomState((prev) => {
        if (!prev) return prev
        const newComments = { ...prev.comments }
        if (!newComments[data.node_id]) newComments[data.node_id] = []
        newComments[data.node_id] = [...newComments[data.node_id], data.comment]
        return { ...prev, comments: newComments }
      })
    })

    newSocket.on('countdown_set', (data: { minutes: number; started_at: number | null; voting_locked: boolean }) => {
      setRoomState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          countdown_duration: data.minutes,
          countdown_started_at: data.started_at,
          voting_locked: data.voting_locked,
          final_result: null,
        }
      })
      setShowResult(false)
    })

    newSocket.on('voting_locked', (data: { final_result: Array<{ id: string; title: string; votes: number }> }) => {
      setRoomState((prev) => prev ? { ...prev, voting_locked: true, final_result: data.final_result } : prev)
      setShowResult(true)
    })

    newSocket.on('error', (err: { message: string }) => {
      alert(err.message)
      setView('lobby')
    })

    return newSocket
  }, [])

  const createRoom = async () => {
    try {
      const uid = localStorage.getItem('brainstorm_user_id') || generateId()
      localStorage.setItem('brainstorm_user_id', uid)
      const uname = userName || '用户' + uid.slice(0, 4)
      const res = await axios.post('/api/room/create', { user_id: uid, user_name: uname })
      setRoomCode(res.data.room_code)
      setUserId(uid)
      setIsHost(true)
      setView('room')
      initSocket(res.data.room_code, uid, uname)
    } catch (e) {
      alert('创建房间失败')
    }
  }

  const joinRoom = async () => {
    const code = joinCode.trim().toUpperCase()
    if (!code || code.length !== 6) {
      alert('请输入6位房间码')
      return
    }
    try {
      await axios.get(`/api/room/${code}`)
      const uid = localStorage.getItem('brainstorm_user_id') || generateId()
      localStorage.setItem('brainstorm_user_id', uid)
      const uname = userName || '用户' + uid.slice(0, 4)
      setRoomCode(code)
      setUserId(uid)
      setView('room')
      initSocket(code, uid, uname)
    } catch (e) {
      alert('房间不存在')
    }
  }

  const createNode = (node: Omit<MindNode, 'votes' | 'created_at'>) => {
    socketRef.current?.emit('create_node', { room_code: roomCode, node })
  }

  const updateNode = (nodeId: string, updates: Partial<MindNode>) => {
    socketRef.current?.emit('update_node', { room_code: roomCode, node_id: nodeId, updates })
  }

  const handleVote = (nodeId: string, value: number) => {
    socketRef.current?.emit('vote', { room_code: roomCode, node_id: nodeId, user_id: userId, value })
  }

  const addComment = (nodeId: string, content: string) => {
    const comment: Comment = {
      id: generateId(),
      user_id: userId,
      user_name: userName || '用户' + userId.slice(0, 4),
      content,
      created_at: Date.now() / 1000,
    }
    socketRef.current?.emit('add_comment', { room_code: roomCode, node_id: nodeId, comment })
  }

  const setCountdown = (minutes: number) => {
    socketRef.current?.emit('set_countdown', { room_code: roomCode, user_id: userId, minutes })
  }

  const saveConclusion = () => {
    if (!detailNodeId) return
    socketRef.current?.emit('save_conclusion', {
      room_code: roomCode,
      user_id: userId,
      node_id: detailNodeId,
      conclusion: conclusionText,
    })
    alert('结论已保存')
  }

  const exportText = () => {
    if (!roomState) return
    let text = `头脑风暴结果 - 房间 ${roomCode}\n`
    text += `生成时间: ${new Date().toLocaleString()}\n\n`
    const sorted = Object.values(roomState.nodes).sort((a, b) => b.votes - a.votes)
    sorted.forEach((n, i) => {
      text += `${i + 1}. ${n.title} (票数: ${n.votes})\n`
      if (n.description) text += `   结论: ${n.description}\n`
      if (n.tags.length) text += `   标签: ${n.tags.join(' ')}\n`
      text += '\n'
    })
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `brainstorm-${roomCode}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

  if (view === 'lobby') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <div style={{ background: '#16213e', padding: 40, borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', width: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💡</div>
          <h1 style={{ fontSize: 28, marginBottom: 8, color: '#fff' }}>头脑风暴</h1>
          <p style={{ color: '#8892b0', marginBottom: 32 }}>创意投票 · 实时协作</p>
          <div style={{ marginBottom: 20 }}>
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="输入昵称（可选）"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #0f3460', background: '#1a1a2e', color: '#e0e0e0', fontSize: 14, outline: 'none' }}
            />
          </div>
          <button
            onClick={createRoom}
            className="bounce-btn"
            style={{ width: '100%', padding: '14px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #0f3460 0%, #533483 100%)', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginBottom: 24 }}
          >
            🚀 创建新房间
          </button>
          <div style={{ borderTop: '1px solid #0f3460', paddingTop: 24 }}>
            <p style={{ color: '#8892b0', marginBottom: 12 }}>或加入已有房间</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="输入6位房间码"
                maxLength={6}
                style={{ flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #0f3460', background: '#1a1a2e', color: '#e0e0e0', fontSize: 14, letterSpacing: 4, textAlign: 'center', outline: 'none' }}
              />
              <button
                onClick={joinRoom}
                className="bounce-btn"
                style={{ padding: '12px 24px', borderRadius: 8, border: '1px solid #533483', background: 'transparent', color: '#e0e0e0', cursor: 'pointer', fontSize: 14 }}
              >
                加入
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!roomState) {
    return <div style={{ color: '#fff', padding: 40 }}>连接中...</div>
  }

  const isMobile = windowWidth < 768
  const onlineCount = Object.keys(roomState.users).length

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#1a1a2e', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#16213e', borderBottom: '1px solid #0f3460', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div>
              <div style={{ fontSize: 11, color: '#8892b0' }}>房间码</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: 3 }}>{roomCode}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#1a1a2e', borderRadius: 20 }}>
            <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#6bcf7f', display: 'inline-block' }} />
            <span style={{ fontSize: 13, color: '#e0e0e0' }}>{onlineCount} 在线</span>
          </div>
          {remainingTime > 0 && (
            <div style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #0f3460 0%, #533483 100%)', borderRadius: 20, fontSize: 14, fontWeight: 600 }}>
              ⏱ {formatTimer(remainingTime)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isHost && !roomState.voting_locked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#8892b0' }}>投票倒计时:</span>
              {[5, 10, 15].map((m) => (
                <button
                  key={m}
                  onClick={() => setCountdown(m)}
                  className="bounce-btn"
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: 'none',
                    background: roomState.countdown_duration === m ? 'linear-gradient(135deg, #0f3460 0%, #533483 100%)' : '#1a1a2e',
                    color: '#e0e0e0',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  {m}分钟
                </button>
              ))}
              {roomState.countdown_duration > 0 && (
                <button
                  onClick={() => setCountdown(0)}
                  className="bounce-btn"
                  style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e94560', background: 'transparent', color: '#e94560', cursor: 'pointer', fontSize: 12 }}
                >
                  取消
                </button>
              )}
            </div>
          )}
          <button
            onClick={() => {
              socketRef.current?.disconnect()
              setView('lobby')
              setRoomState(null)
              setShowResult(false)
            }}
            className="bounce-btn"
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #0f3460', background: 'transparent', color: '#8892b0', cursor: 'pointer', fontSize: 12 }}
          >
            退出
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <RoomBoard
            roomState={roomState}
            userId={userId}
            isHost={isHost}
            onCreateNode={createNode}
            onUpdateNode={updateNode}
            onVote={handleVote}
            onAddComment={addComment}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => {
              setSelectedNodeId(id)
              if (id && roomState.final_result && roomState.voting_locked) {
                setDetailNodeId(id)
                setConclusionText(roomState.nodes[id]?.description || '')
              }
            }}
            votingLocked={roomState.voting_locked}
          />
        </div>

        {!isMobile && (
          <div style={{ width: 280, background: '#16213e', borderLeft: '1px solid #0f3460', padding: 16, overflowY: 'auto' }}>
            <VotePanel
              nodes={roomState.nodes}
              votes={roomState.votes}
              userId={userId}
              votingLocked={roomState.voting_locked}
              onVote={handleVote}
              onSelectNode={(id) => setSelectedNodeId(id)}
            />
          </div>
        )}
      </div>

      {isMobile && (
        <div style={{ background: '#16213e', borderTop: '1px solid #0f3460', padding: '12px 16px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          {Object.values(roomState.nodes)
            .filter((n) => n.parent_id !== null)
            .sort((a, b) => b.votes - a.votes)
            .map((node, i) => (
              <div
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                style={{
                  display: 'inline-block',
                  width: 160,
                  padding: 12,
                  marginRight: 12,
                  background: '#1a1a2e',
                  borderRadius: 8,
                  border: selectedNodeId === node.id ? '2px solid #533483' : '1px solid #0f3460',
                  verticalAlign: 'top',
                  cursor: 'pointer',
                  whiteSpace: 'normal',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
                  {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`} {node.title}
                </div>
                <div style={{ fontSize: 12, color: node.votes >= 0 ? '#6bcf7f' : '#e94560', fontWeight: 600 }}>
                  {node.votes >= 0 ? '+' : ''}{node.votes} 票
                </div>
              </div>
            ))}
        </div>
      )}

      {showResult && roomState.final_result && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', width: '100%', maxWidth: 420 }}>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>🏆 投票结果</div>
            {roomState.final_result.map((item, i) => {
              const sizes = [{ w: 380, pad: 28, fs: 20 }, { w: 340, pad: 22, fs: 17 }, { w: 300, pad: 18, fs: 15 }]
              const s = sizes[i] || sizes[2]
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (isHost) {
                      setDetailNodeId(item.id)
                      setConclusionText(roomState.nodes[item.id]?.description || '')
                    }
                  }}
                  className="fade-in"
                  style={{
                    width: s.w,
                    padding: s.pad,
                    background: '#fff',
                    borderRadius: 16,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
                    cursor: isHost ? 'pointer' : 'default',
                    textAlign: 'center',
                    position: 'relative',
                    animationDelay: `${i * 0.1}s`,
                  }}
                >
                  {i === 0 && <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 36 }}>👑</div>}
                  <div style={{ fontSize: s.fs + 8, marginBottom: 8 }}>{['🥇', '🥈', '🥉'][i]}</div>
                  <div style={{ fontSize: s.fs, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>{item.title || '（无标题）'}</div>
                  <div style={{ fontSize: s.fs - 3, color: item.votes >= 0 ? '#6bcf7f' : '#e94560', fontWeight: 700 }}>
                    {item.votes >= 0 ? '+' : ''}{item.votes} 票
                  </div>
                  {isHost && <div style={{ marginTop: 8, fontSize: 11, color: '#8892b0' }}>点击查看详情 →</div>}
                </div>
              )
            })}
            <button
              onClick={() => setShowResult(false)}
              className="bounce-btn"
              style={{ marginTop: 16, padding: '10px 32px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #0f3460 0%, #533483 100%)', color: '#fff', cursor: 'pointer', fontSize: 14 }}
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {detailNodeId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
          <div className="fade-in" style={{ width: '100%', maxWidth: 560, background: '#16213e', borderRadius: 16, padding: 28, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ color: '#fff', fontSize: 22 }}>{roomState.nodes[detailNodeId]?.title || '节点详情'}</h2>
              <button onClick={() => setDetailNodeId(null)} style={{ background: 'none', border: 'none', color: '#8892b0', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#8892b0', fontSize: 12, marginBottom: 8 }}>当前票数</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: (roomState.nodes[detailNodeId]?.votes || 0) >= 0 ? '#6bcf7f' : '#e94560' }}>
                {(roomState.nodes[detailNodeId]?.votes || 0) >= 0 ? '+' : ''}{roomState.nodes[detailNodeId]?.votes || 0}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#8892b0', fontSize: 12, marginBottom: 8 }}>标签</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(roomState.nodes[detailNodeId]?.tags || []).map((t) => (
                  <span key={t} style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, background: '#0f3460', color: '#fff' }}>{t}</span>
                ))}
                {(roomState.nodes[detailNodeId]?.tags || []).length === 0 && <span style={{ color: '#555', fontSize: 12 }}>无标签</span>}
              </div>
            </div>
            {isHost ? (
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#8892b0', fontSize: 12, marginBottom: 8 }}>汇总结论（主持人可编辑）</div>
                <textarea
                  value={conclusionText}
                  onChange={(e) => setConclusionText(e.target.value)}
                  placeholder="输入最终结论..."
                  style={{ width: '100%', minHeight: 120, padding: 12, borderRadius: 8, border: '1px solid #0f3460', background: '#1a1a2e', color: '#e0e0e0', fontSize: 14, outline: 'none', resize: 'vertical' }}
                />
              </div>
            ) : (
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: '#8892b0', fontSize: 12, marginBottom: 8 }}>结论</div>
                <div style={{ padding: 12, borderRadius: 8, background: '#1a1a2e', color: '#e0e0e0', minHeight: 80, whiteSpace: 'pre-wrap' }}>
                  {roomState.nodes[detailNodeId]?.description || '暂无结论'}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: '#8892b0', fontSize: 12, marginBottom: 8 }}>历史评论</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                {(roomState.comments[detailNodeId] || [])
                  .sort((a, b) => b.created_at - a.created_at)
                  .slice(0, 5)
                  .map((c) => (
                    <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: getAvatarColor(c.user_id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                        {getInitials(c.user_name)}
                      </div>
                      <div style={{ flex: 1, padding: '8px 12px', borderRadius: 12, background: '#1a1a2e', borderBottomLeftRadius: 4 }}>
                        <div style={{ fontSize: 11, color: '#8892b0', marginBottom: 2 }}>{c.user_name}</div>
                        <div style={{ fontSize: 13, color: '#e0e0e0' }}>{c.content}</div>
                      </div>
                    </div>
                  ))}
                {(roomState.comments[detailNodeId] || []).length === 0 && <div style={{ color: '#555', fontSize: 12, padding: 12 }}>暂无评论</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {isHost && (
                <>
                  <button onClick={saveConclusion} className="bounce-btn" style={{ flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #0f3460 0%, #533483 100%)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                    💾 保存结论
                  </button>
                  <button onClick={exportText} className="bounce-btn" style={{ padding: '12px 20px', borderRadius: 8, border: '1px solid #533483', background: 'transparent', color: '#e0e0e0', cursor: 'pointer', fontSize: 14 }}>
                    📄 导出文本
                  </button>
                </>
              )}
              <button onClick={() => setDetailNodeId(null)} className="bounce-btn" style={{ padding: '12px 20px', borderRadius: 8, border: '1px solid #0f3460', background: 'transparent', color: '#8892b0', cursor: 'pointer', fontSize: 14 }}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
