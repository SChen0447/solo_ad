import { useState } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import Canvas from './components/Canvas'
import { useCanvasStore } from './store'

function MeetingList() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [joinId, setJoinId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setUserName = useCanvasStore((s) => s.setUserName)
  const setMeetingId = useCanvasStore((s) => s.setMeetingId)

  const handleCreate = async () => {
    if (!nickname.trim()) {
      setError('请输入昵称')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/meetings', { method: 'POST' })
      const data = await res.json()
      setUserName(nickname.trim())
      setMeetingId(data.meetingId)
      navigate(`/canvas/${data.meetingId}`)
    } catch {
      setError('创建会议失败')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!nickname.trim()) {
      setError('请输入昵称')
      return
    }
    if (!joinId.trim()) {
      setError('请输入会议ID')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/meetings/${joinId.trim().toUpperCase()}`)
      if (!res.ok) {
        throw new Error('会议不存在')
      }
      setUserName(nickname.trim())
      setMeetingId(joinId.trim().toUpperCase())
      navigate(`/canvas/${joinId.trim().toUpperCase()}`)
    } catch {
      setError('加入会议失败，请检查会议ID')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 40,
        width: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: 8, color: '#2C3E50' }}>
          虚拟研讨会白板
        </h1>
        <p style={{ textAlign: 'center', color: '#7F8C8D', marginBottom: 30, fontSize: 14 }}>
          实时协作，自由绘制
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#34495E', fontWeight: 600 }}>
            昵称
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="请输入您的昵称"
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid #BDC3C7',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: 10,
          marginTop: 20,
        }}>
          <button
            onClick={handleCreate}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: '#3498DB',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            创建会议
          </button>
        </div>

        <div style={{ textAlign: 'center', color: '#95A5A6', margin: '20px 0', fontSize: 13 }}>
          —— 或 ——
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#34495E', fontWeight: 600 }}>
            会议ID
          </label>
          <input
            type="text"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value.toUpperCase())}
            placeholder="输入6位会议ID"
            maxLength={6}
            style={{
              width: '100%',
              padding: '12px 14px',
              border: '1px solid #BDC3C7',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          />
        </div>

        <button
          onClick={handleJoin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#2ECC71',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          加入会议
        </button>

        {error && (
          <p style={{ color: '#E74C3C', textAlign: 'center', marginTop: 16, fontSize: 13 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

function CanvasPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  return <Canvas meetingId={meetingId || ''} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MeetingList />} />
      <Route path="/canvas/:meetingId" element={<CanvasPage />} />
    </Routes>
  )
}
