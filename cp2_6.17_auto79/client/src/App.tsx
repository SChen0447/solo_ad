import React, { useState, useEffect, useRef, useCallback } from 'react'

interface RoomData {
  roomId: string
  userId: string
  isHost: boolean
  nickname: string
}

interface ChoiceOption {
  id: string
  text: string
}

interface CurrentTopic {
  id: string
  type: 'choice' | 'open'
  title: string
  status: 'active' | 'ended'
  options?: ChoiceOption[]
  votedCount: number
}

interface ChoiceResult {
  id: string
  text: string
  votes: number
  percentage: number
}

interface WordItem {
  word: string
  count: number
  texts: string[]
}

interface PollResult {
  type: 'choice' | 'open'
  total: number
  results?: ChoiceResult[]
  words?: WordItem[]
  allSubmissions?: { id: string; nickname: string; text: string }[]
}

const App: React.FC = () => {
  const [room, setRoom] = useState<RoomData | null>(null)
  const [nicknameInput, setNicknameInput] = useState('')
  const [roomIdInput, setRoomIdInput] = useState('')
  const [showWelcome, setShowWelcome] = useState(true)
  const [entered, setEntered] = useState(false)
  const [currentTopic, setCurrentTopic] = useState<CurrentTopic | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [openInput, setOpenInput] = useState('')
  const [pollResult, setPollResult] = useState<PollResult | null>(null)
  const [selectedWord, setSelectedWord] = useState<WordItem | null>(null)
  const [votedCount, setVotedCount] = useState(0)
  const [animatingCount, setAnimatingCount] = useState(false)
  const [newTopicType, setNewTopicType] = useState<'choice' | 'open'>('choice')
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [newOptions, setNewOptions] = useState<string[]>(['', ''])
  const [showCreateTopic, setShowCreateTopic] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [barHeights, setBarHeights] = useState<number[]>([])
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const pollingRef = useRef<number | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  const joinRoom = async () => {
    if (!nicknameInput.trim()) {
      setError('请输入昵称')
      return
    }
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nicknameInput.trim(),
          roomId: roomIdInput.trim()
        })
      })
      const data = await res.json()
      if (res.ok) {
        setRoom(data)
        setEntered(true)
      } else {
        setError(data.error || '加入房间失败')
      }
    } catch {
      setError('连接服务器失败')
    }
  }

  const fetchRoomStatus = useCallback(async () => {
    if (!room) return
    try {
      const res = await fetch(`/api/rooms/${room.roomId}/status`)
      if (res.ok) {
        const data = await res.json()
        if (data.hasTopic) {
          if (!currentTopic || currentTopic.id !== data.topic.id) {
            setCurrentTopic(data.topic)
            setHasVoted(false)
            setSelectedOption(null)
            setOpenInput('')
            setPollResult(null)
            setSelectedWord(null)
          }
          setVotedCount(data.topic.votedCount)
          if (data.topic.status === 'ended' && !pollResult) {
            await fetchResult()
          }
        } else {
          setCurrentTopic(null)
          setPollResult(null)
          setHasVoted(false)
        }
      }
    } catch {}
  }, [room, currentTopic, pollResult])

  useEffect(() => {
    if (room) {
      fetchRoomStatus()
      pollingRef.current = window.setInterval(fetchRoomStatus, 2000)
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    }
  }, [room, fetchRoomStatus])

  useEffect(() => {
    if (votedCount >= 0) {
      setAnimatingCount(true)
      const t = setTimeout(() => setAnimatingCount(false), 300)
      return () => clearTimeout(t)
    }
  }, [votedCount])

  const createTopic = async () => {
    if (!room?.isHost) return
    if (!newTopicTitle.trim()) {
      setError('请输入议题标题')
      return
    }
    if (newTopicType === 'choice') {
      const validOptions = newOptions.filter(o => o.trim())
      if (validOptions.length < 2) {
        setError('至少需要2个有效选项')
        return
      }
      if (validOptions.length > 6) {
        setError('最多6个选项')
        return
      }
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/rooms/${room.roomId}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: room.userId,
          type: newTopicType,
          title: newTopicTitle.trim(),
          options: newTopicType === 'choice' ? newOptions.filter(o => o.trim()) : undefined
        })
      })
      const data = await res.json()
      if (res.ok) {
        setShowCreateTopic(false)
        setNewTopicTitle('')
        setNewOptions(['', ''])
        setError('')
        await fetchRoomStatus()
      } else {
        setError(data.error || '创建议题失败')
      }
    } catch {
      setError('请求失败')
    }
    setLoading(false)
  }

  const submitVote = async (optionId?: string) => {
    if (!room || !currentTopic || hasVoted) return
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        userId: room.userId,
        nickname: room.nickname
      }
      if (currentTopic.type === 'choice') {
        if (!optionId) return
        body.optionId = optionId
        setSelectedOption(optionId)
      } else {
        if (!openInput.trim()) {
          setError('请输入观点内容')
          setLoading(false)
          return
        }
        body.text = openInput.trim()
      }
      const res = await fetch(`/api/rooms/${room.roomId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (res.ok) {
        setHasVoted(true)
        setVotedCount(data.votedCount)
      } else {
        setSelectedOption(null)
        setError(data.error || '提交失败')
      }
    } catch {
      setSelectedOption(null)
      setError('提交失败')
    }
    setLoading(false)
  }

  const fetchResult = async () => {
    if (!room?.isHost || !currentTopic) return
    try {
      const res = await fetch(`/api/rooms/${room.roomId}/end-topic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: room.userId })
      })
      if (res.ok) {
        const data = await res.json()
        setPollResult(data)
        if (data.type === 'choice' && data.results) {
          const maxPct = Math.max(...data.results.map((r: ChoiceResult) => r.percentage), 1)
          const heights = data.results.map((r: ChoiceResult) => (r.percentage / maxPct) * 200)
          requestAnimationFrame(() => setBarHeights(heights))
        }
      }
    } catch {}
  }

  const endTopic = async () => {
    if (!room?.isHost || !currentTopic || currentTopic.status === 'ended') return
    setLoading(true)
    await fetchResult()
    await fetchRoomStatus()
    setLoading(false)
  }

  const addOption = () => {
    if (newOptions.length < 6) {
      setNewOptions([...newOptions, ''])
    }
  }

  const removeOption = (idx: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== idx))
    }
  }

  const updateOption = (idx: number, val: string) => {
    const next = [...newOptions]
    next[idx] = val
    setNewOptions(next)
  }

  const generateWordCloud = () => {
    if (!pollResult?.words || pollResult.words.length === 0) return null
    const colors = ['#a5b4fc', '#c7d2fe', '#e0e7ff', '#f5f3ff']
    const maxCount = Math.max(...pollResult.words.map(w => w.count), 1)

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', padding: '10px 0' }}>
        {pollResult.words.map((w, i) => {
          const ratio = w.count / maxCount
          const fontSize = Math.round(14 + ratio * 26)
          const color = colors[i % colors.length]
          return (
            <span
              key={w.word}
              onClick={() => setSelectedWord(selectedWord?.word === w.word ? null : w)}
              style={{
                fontSize: `${fontSize}px`,
                color,
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                userSelect: 'none',
                fontWeight: selectedWord?.word === w.word ? 700 : 400,
                background: selectedWord?.word === w.word ? 'rgba(99,102,241,0.2)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'
                ;(e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)'
                ;(e.currentTarget as HTMLElement).style.filter = 'brightness(1)'
              }}
            >
              {w.word}
            </span>
          )
        })}
      </div>
    )
  }

  const buttonBase = {
    borderRadius: '8px',
    border: 'none',
    padding: '10px 20px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    color: '#fff' as const,
    outline: 'none' as const
  }

  const primaryBtn = {
    ...buttonBase,
    background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    fontWeight: 600
  }

  const ghostBtn = {
    ...buttonBase,
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.3)',
    fontWeight: 500
  }

  if (!room) {
    return (
      <div style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        {showWelcome && (
          <div style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 100,
            animation: 'fadeInOut 3s ease forwards'
          }}>
            <div style={{
              fontSize: '2rem',
              color: '#fff',
              textShadow: '0 0 20px #3b82f6, 0 0 40px #3b82f6',
              fontWeight: 700,
              letterSpacing: '2px'
            }}>
              ✨ 欢迎来到实时投票看板 ✨
            </div>
          </div>
        )}
        <div
          style={{
            background: 'rgba(20,20,40,0.6)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '48px 40px',
            width: '100%',
            maxWidth: '440px',
            border: '1px solid rgba(99,102,241,0.2)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
            animation: entered ? 'none' : 'fadeInScale 0.4s ease'
          }}
        >
          <h1 style={{
            fontSize: '28px',
            color: '#ffffff',
            textShadow: '0 0 8px #3b82f6',
            textAlign: 'center',
            marginBottom: '12px',
            fontWeight: 700,
            letterSpacing: '0.5px'
          }}>
            实时投票与观点看板
          </h1>
          <p style={{ textAlign: 'center', color: '#a5b4fc', marginBottom: '36px', fontSize: '14px' }}>
            多人协作 · 实时汇总 · 可视化分析
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', color: '#c7d2fe', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>昵称</label>
              <input
                type="text"
                value={nicknameInput}
                onChange={e => setNicknameInput(e.target.value)}
                placeholder="请输入您的昵称"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid rgba(79,70,229,0.3)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  fontFamily: 'inherit'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = '#6366f1'
                  e.currentTarget.style.background = 'rgba(99,102,241,0.08)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(79,70,229,0.3)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: '#c7d2fe', marginBottom: '8px', fontSize: '13px', fontWeight: 500 }}>房间号（留空自动生成）</label>
              <input
                type="text"
                value={roomIdInput}
                onChange={e => setRoomIdInput(e.target.value.toUpperCase())}
                placeholder="如：ABC123"
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid rgba(79,70,229,0.3)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '15px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  fontFamily: 'inherit'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = '#6366f1'
                  e.currentTarget.style.background = 'rgba(99,102,241,0.08)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'rgba(79,70,229,0.3)'
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                }}
              />
            </div>
            {error && <div style={{ color: '#f87171', fontSize: '13px', marginTop: '-8px' }}>{error}</div>}
            <button
              onClick={joinRoom}
              style={primaryBtn}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'}
            >
              {roomIdInput.trim() ? '加入房间' : '创建房间'}
            </button>
          </div>
        </div>
        <style>{`
          @keyframes fadeInOut {
            0% { opacity: 0; }
            30% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
          }
          @keyframes fadeInScale {
            0% { opacity: 0; transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      padding: '24px',
      animation: 'fadeInScale 0.4s ease'
    }}>
      <header style={{
        maxWidth: '1200px',
        margin: '0 auto 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{
            fontSize: '26px',
            color: '#ffffff',
            textShadow: '0 0 8px #3b82f6',
            fontWeight: 700
          }}>
            实时投票与观点看板
          </h1>
          <div style={{ display: 'flex', gap: '16px', marginTop: '6px', alignItems: 'center' }}>
            <span style={{
              background: 'rgba(99,102,241,0.15)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '13px',
              color: '#a5b4fc',
              letterSpacing: '1px',
              border: '1px solid rgba(99,102,241,0.2)'
            }}>
              房间号：{room.roomId}
            </span>
            <span style={{ color: '#c7d2fe', fontSize: '13px' }}>
              👤 {room.nickname}
              {room.isHost && <span style={{ marginLeft: '6px', color: '#fbbf24' }}>（主持人）</span>}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {room.isHost && (
            <button
              onClick={() => setShowCreateTopic(true)}
              style={primaryBtn}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'}
            >
              + 发起新议题
            </button>
          )}
          <button
            onClick={() => { setRoom(null); setCurrentTopic(null); setEntered(false); }}
            style={ghostBtn}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'}
          >
            退出
          </button>
        </div>
      </header>

      {showCreateTopic && room.isHost && (
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto 24px',
          background: 'rgba(20,20,40,0.7)',
          borderRadius: '16px',
          padding: '28px',
          border: '1px solid rgba(99,102,241,0.2)'
        }}>
          <h3 style={{ color: '#fff', marginBottom: '20px', fontSize: '18px' }}>发起新议题</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setNewTopicType('choice')}
                style={{
                  ...ghostBtn,
                  background: newTopicType === 'choice' ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.08)',
                  border: newTopicType === 'choice' ? '1px solid #6366f1' : '1px solid rgba(99,102,241,0.2)',
                  flex: 1
                }}
              >📊 选择题投票</button>
              <button
                onClick={() => setNewTopicType('open')}
                style={{
                  ...ghostBtn,
                  background: newTopicType === 'open' ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.08)',
                  border: newTopicType === 'open' ? '1px solid #6366f1' : '1px solid rgba(99,102,241,0.2)',
                  flex: 1
                }}
              >💬 开放式观点收集</button>
            </div>
            <input
              type="text"
              value={newTopicTitle}
              onChange={e => setNewTopicTitle(e.target.value)}
              placeholder="请输入议题标题，例如：下周团建去哪里？"
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1.5px solid rgba(79,70,229,0.3)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                transition: 'all 0.3s ease',
                fontFamily: 'inherit'
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#6366f1' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(79,70,229,0.3)' }}
            />
            {newTopicType === 'choice' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {newOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: '#a5b4fc', width: '24px' }}>{idx + 1}.</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => updateOption(idx, e.target.value)}
                      placeholder={`选项 ${idx + 1}`}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid rgba(79,70,229,0.3)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#fff',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.3s ease',
                        fontFamily: 'inherit'
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#6366f1' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(79,70,229,0.3)' }}
                    />
                    {newOptions.length > 2 && (
                      <button onClick={() => removeOption(idx)} style={ghostBtn} onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'} onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'}>删除</button>
                    )}
                  </div>
                ))}
                {newOptions.length < 6 && (
                  <button onClick={addOption} style={{ ...ghostBtn, alignSelf: 'flex-start' }} onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'} onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'}>+ 添加选项</button>
                )}
              </div>
            )}
            {error && <div style={{ color: '#f87171', fontSize: '13px' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowCreateTopic(false); setError('') }} style={ghostBtn} onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'} onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'}>取消</button>
              <button onClick={createTopic} disabled={loading} style={primaryBtn} onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)' }} onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'}>
                {loading ? '创建中...' : '发起议题'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        gap: '24px',
        flexDirection: window.innerWidth < 768 ? 'column' : 'row'
      }}>
        <div style={{
          flex: 1,
          minWidth: 0,
          background: 'rgba(20,20,40,0.6)',
          borderRadius: '16px',
          padding: '28px',
          border: '1px solid rgba(99,102,241,0.15)',
          animation: 'fadeInScale 0.4s ease'
        }}>
          {currentTopic ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      background: currentTopic.status === 'active' ? 'rgba(34,197,94,0.2)' : 'rgba(156,163,175,0.2)',
                      color: currentTopic.status === 'active' ? '#4ade80' : '#9ca3af',
                      border: `1px solid ${currentTopic.status === 'active' ? 'rgba(34,197,94,0.3)' : 'rgba(156,163,175,0.3)'}`
                    }}>
                      {currentTopic.status === 'active' ? '● 进行中' : '○ 已结束'}
                    </span>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      background: 'rgba(99,102,241,0.15)',
                      color: '#a5b4fc',
                      border: '1px solid rgba(99,102,241,0.2)'
                    }}>
                      {currentTopic.type === 'choice' ? '📊 选择题' : '💬 开放式'}
                    </span>
                  </div>
                  <h2 style={{ color: '#fff', fontSize: '22px', lineHeight: 1.4, fontWeight: 600 }}>
                    {currentTopic.title}
                  </h2>
                </div>
                {room.isHost && currentTopic.status === 'active' && (
                  <button onClick={endTopic} disabled={loading} style={{ ...primaryBtn, background: 'linear-gradient(135deg, #ef4444, #dc2626)' }} onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)' }} onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'}>
                    {loading ? '处理中...' : '结束议题'}
                  </button>
                )}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                padding: '12px 18px',
                background: 'rgba(99,102,241,0.08)',
                borderRadius: '10px',
                border: '1px solid rgba(99,102,241,0.15)'
              }}>
                <span style={{ color: '#a5b4fc', fontSize: '14px' }}>已参与人数</span>
                <span style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: '#fff',
                  transition: 'transform 0.3s ease',
                  transform: animatingCount ? 'scale(1.15)' : 'scale(1)',
                  display: 'inline-block'
                }}>
                  {votedCount}
                </span>
              </div>

              {currentTopic.type === 'choice' && currentTopic.options ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {currentTopic.options.map(opt => {
                    const isSelected = selectedOption === opt.id
                    const disabled = hasVoted || currentTopic.status === 'ended'
                    return (
                      <button
                        key={opt.id}
                        onClick={() => !disabled && submitVote(opt.id)}
                        disabled={disabled}
                        style={{
                          padding: '18px 24px',
                          borderRadius: '12px',
                          border: `2px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                          background: isSelected
                            ? 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(79,70,229,0.3))'
                            : 'rgba(255,255,255,0.06)',
                          color: '#fff',
                          fontSize: '16px',
                          textAlign: 'left',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.6 : 1,
                          transition: 'all 0.25s ease',
                          fontWeight: isSelected ? 600 : 400,
                          pointerEvents: disabled ? 'none' : 'auto',
                          fontFamily: 'inherit'
                        }}
                        onMouseEnter={(e) => { if (!disabled) { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.18)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.5)' } }}
                        onMouseLeave={(e) => { if (!disabled && !isSelected) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)' } }}
                      >
                        <span style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%', border: `2px solid ${isSelected ? '#818cf8' : 'rgba(255,255,255,0.3)'}`, textAlign: 'center', lineHeight: '20px', marginRight: '12px', fontSize: '13px', fontWeight: 700, background: isSelected ? '#6366f1' : 'transparent', verticalAlign: 'middle' }}>
                          {isSelected ? '✓' : ''}
                        </span>
                        {opt.text}
                      </button>
                    )
                  })}
                </div>
              ) : currentTopic.type === 'open' ? (
                <div>
                  <textarea
                    value={openInput}
                    onChange={e => setOpenInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey && !hasVoted && currentTopic.status === 'active') {
                        e.preventDefault()
                        submitVote()
                      }
                    }}
                    placeholder="输入您的观点，按 Enter 提交（Shift+Enter 换行）..."
                    disabled={hasVoted || currentTopic.status === 'ended'}
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      height: 'auto',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: '1.5px solid #4f46e5',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#fff',
                      fontSize: '15px',
                      lineHeight: 1.6,
                      resize: 'vertical',
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      opacity: (hasVoted || currentTopic.status === 'ended') ? 0.6 : 1,
                      pointerEvents: (hasVoted || currentTopic.status === 'ended') ? 'none' : 'auto',
                      fontFamily: 'inherit'
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.boxShadow = 'none' }}
                  />
                  {!hasVoted && currentTopic.status === 'active' && (
                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => submitVote()} disabled={!openInput.trim() || loading} style={primaryBtn} onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)' }} onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.filter = 'brightness(1)'}>
                        提交观点
                      </button>
                    </div>
                  )}
                  {hasVoted && (
                    <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(34,197,94,0.12)', borderRadius: '10px', color: '#4ade80', fontSize: '14px', border: '1px solid rgba(34,197,94,0.2)' }}>
                      ✓ 您的观点已提交
                    </div>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🗳️</div>
              <h3 style={{ color: '#fff', fontSize: '22px', marginBottom: '10px', fontWeight: 600 }}>暂无进行中的议题</h3>
              <p style={{ color: '#a5b4fc', fontSize: '14px' }}>
                {room.isHost ? '点击上方「发起新议题」按钮开始投票' : '等待主持人发起新的议题...'}
              </p>
            </div>
          )}
        </div>

        <div style={{
          width: window.innerWidth < 768 ? '100%' : '360px',
          minWidth: window.innerWidth < 768 ? 'auto' : '360px',
          background: 'rgba(20,20,40,0.85)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid rgba(99,102,241,0.15)',
          flexShrink: 0
        }}>
          <h3 style={{
            color: '#fff',
            fontSize: '18px',
            marginBottom: '20px',
            fontWeight: 600,
            paddingBottom: '14px',
            borderBottom: '1px solid rgba(99,102,241,0.2)'
          }}>📈 统计结果</h3>

          {pollResult ? (
            <div>
              {pollResult.type === 'choice' && pollResult.results ? (
                <div style={{ position: 'relative' }}>
                  <div style={{ color: '#a5b4fc', fontSize: '13px', marginBottom: '20px' }}>
                    共 <span style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>{pollResult.total}</span> 人参与投票
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '18px',
                    minHeight: '260px',
                    padding: '10px 10px 20px',
                    borderBottom: '1.5px solid rgba(79,70,229,0.4)',
                    position: 'relative'
                  }}>
                    {pollResult.results.map((r, idx) => (
                      <div
                        key={r.id}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          minWidth: 0,
                          position: 'relative'
                        }}
                      >
                        <div style={{
                          fontSize: '0.85rem',
                          color: 'rgba(255,255,255,0.75)',
                          marginBottom: '3px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease',
                          transform: hoveredBar === idx ? 'translateY(-2px)' : 'translateY(0)',
                          opacity: hoveredBar === idx ? 1 : 0.75
                        }}>
                          {r.percentage}%
                        </div>
                        <div style={{
                          fontSize: '0.85rem',
                          color: 'rgba(255,255,255,0.6)',
                          marginBottom: '10px',
                          transition: 'all 0.2s ease',
                          transform: hoveredBar === idx ? 'translateY(-2px)' : 'translateY(0)',
                          opacity: hoveredBar === idx ? 0.9 : 0.6
                        }}>
                          {r.votes}票
                        </div>
                        <div
                          onMouseEnter={(e) => {
                            setHoveredBar(idx)
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            const parentRect = (e.currentTarget as HTMLElement).parentElement!.parentElement!.parentElement!.getBoundingClientRect()
                            setTooltipPos({
                              x: rect.left + rect.width / 2 - parentRect.left,
                              y: rect.top - parentRect.top - 10
                            })
                          }}
                          onMouseMove={(e) => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                            const parentRect = (e.currentTarget as HTMLElement).parentElement!.parentElement!.parentElement!.getBoundingClientRect()
                            setTooltipPos({
                              x: rect.left + rect.width / 2 - parentRect.left,
                              y: rect.top - parentRect.top - 10
                            })
                          }}
                          onMouseLeave={() => setHoveredBar(null)}
                          style={{
                            width: '100%',
                            maxWidth: '300px',
                            height: `${barHeights[idx] || 0}px`,
                            minHeight: '4px',
                            background: 'linear-gradient(180deg, #818cf8 0%, #6366f1 100%)',
                            borderRadius: '8px 8px 4px 4px',
                            transition: 'height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
                            boxShadow: hoveredBar === idx
                              ? '0 8px 24px rgba(99,102,241,0.5), 0 0 20px rgba(129,140,248,0.3)'
                              : '0 4px 12px rgba(99,102,241,0.3)',
                            filter: hoveredBar === idx ? 'brightness(1.15)' : 'brightness(1)',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                        />
                      </div>
                    ))}
                    {hoveredBar !== null && pollResult.results[hoveredBar] && (
                      <div
                        style={{
                          position: 'absolute',
                          left: tooltipPos.x,
                          top: tooltipPos.y,
                          transform: 'translate(-50%, -100%)',
                          background: 'rgba(15,15,35,0.95)',
                          backdropFilter: 'blur(8px)',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid rgba(99,102,241,0.4)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                          pointerEvents: 'none',
                          zIndex: 10,
                          whiteSpace: 'nowrap',
                          animation: 'tooltipFadeIn 0.18s ease-out',
                          fontSize: '13px'
                        }}>
                        <div style={{
                          fontWeight: 600,
                          color: '#fff',
                          marginBottom: '5px',
                          fontSize: '13.5px'
                        }}>
                          {pollResult.results[hoveredBar].text}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', color: '#a5b4fc' }}>
                          <span>票数: <span style={{ color: '#818cf8', fontWeight: 600 }}>{pollResult.results[hoveredBar].votes}</span></span>
                          <span>占比: <span style={{ color: '#818cf8', fontWeight: 600 }}>{pollResult.results[hoveredBar].percentage}%</span></span>
                        </div>
                        <div style={{
                          position: 'absolute',
                          left: '50%',
                          bottom: '-6px',
                          transform: 'translateX(-50%) rotate(45deg)',
                          width: '10px',
                          height: '10px',
                          background: 'rgba(15,15,35,0.95)',
                          borderRight: '1px solid rgba(99,102,241,0.4)',
                          borderBottom: '1px solid rgba(99,102,241,0.4)'
                        }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', marginTop: '12px', gap: '18px' }}>
                    {pollResult.results.map((r, idx) => (
                      <div
                        key={r.id}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          fontSize: '12px',
                          color: hoveredBar === idx ? '#e0e7ff' : '#c7d2fe',
                          lineHeight: 1.4,
                          wordBreak: 'break-all',
                          paddingTop: '6px',
                          borderTop: hoveredBar === idx ? '2px solid rgba(79,70,229,0.6)' : '1px solid rgba(79,70,229,0.2)',
                          transition: 'all 0.2s ease',
                          fontWeight: hoveredBar === idx ? 500 : 400
                        }}
                      >
                        {r.text.length > 8 ? r.text.slice(0, 8) + '…' : r.text}
                      </div>
                    ))}
                  </div>
                </div>
              ) : pollResult.type === 'open' && pollResult.words ? (
                <div>
                  <div style={{ color: '#a5b4fc', fontSize: '13px', marginBottom: '16px' }}>
                    共收集 <span style={{ color: '#fff', fontWeight: 600, fontSize: '16px' }}>{pollResult.total}</span> 条观点 · 高频词Top20
                  </div>
                  {pollResult.words.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280', fontSize: '13px' }}>暂无有效词汇统计</div>
                  ) : (
                    <>
                      {generateWordCloud()}
                      {selectedWord && (
                        <div
                          key={selectedWord.word}
                          style={{
                            marginTop: '20px',
                            padding: '14px',
                            background: 'rgba(99,102,241,0.08)',
                            borderRadius: '10px',
                            border: '1px solid rgba(99,102,241,0.2)',
                            animation: 'wordDetailFadeIn 0.35s ease-out'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ color: '#818cf8', fontWeight: 600, fontSize: '14px' }}>「{selectedWord.word}」相关观点</span>
                            <span style={{ color: '#a5b4fc', fontSize: '12px' }}>出现 {selectedWord.count} 次</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {selectedWord.texts.map((t, i) => {
                              const dotColors = ['#a5b4fc', '#c7d2fe', '#e0e7ff', '#f5f3ff', '#818cf8']
                              const dotColor = dotColors[(i * 3 + selectedWord.word.length) % dotColors.length]
                              return (
                                <div
                                  key={i}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px',
                                    padding: '10px 12px',
                                    background: 'rgba(255,255,255,0.04)',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    color: '#e0e7ff',
                                    lineHeight: 1.6,
                                    animation: `viewItemFadeIn 0.4s ease-out ${i * 0.08}s both`
                                  }}
                                >
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      width: '8px',
                                      height: '8px',
                                      borderRadius: '50%',
                                      background: dotColor,
                                      marginTop: '8px',
                                      flexShrink: 0,
                                      boxShadow: `0 0 6px ${dotColor}`
                                    }}
                                  />
                                  <span style={{ flex: 1 }}>{t}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 16px' }}>
              <div style={{ fontSize: '48px', marginBottom: '14px', opacity: 0.5 }}>📊</div>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                {currentTopic?.status === 'ended' ? '加载结果中...' : '议题结束后将在此展示统计结果'}
              </p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes tooltipFadeIn {
          0% { opacity: 0; transform: translate(-50%, -90%); }
          100% { opacity: 1; transform: translate(-50%, -100%); }
        }
        @keyframes wordDetailFadeIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes viewItemFadeIn {
          0% { opacity: 0; transform: translateX(-8px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @media (max-width: 768px) {
          div[style*="max-width: 1200px"] { padding: 0 !important; }
        }
        textarea::-webkit-scrollbar, div::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        textarea::-webkit-scrollbar-thumb, div::-webkit-scrollbar-thumb {
          background: rgba(99,102,241,0.4);
          border-radius: 3px;
        }
      `}</style>
    </div>
  )
}

export default App
