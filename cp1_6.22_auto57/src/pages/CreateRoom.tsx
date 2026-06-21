import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserId, getUserName, setUserName } from '../utils'

interface CreateRoomResponse {
  id: string
  code: string
  theme: string
  createdAt: number
  userId: string
  userName: string
}

function CreateRoom() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState('')
  const [userName, setUserNameInput] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdRoom, setCreatedRoom] = useState<CreateRoomResponse | null>(null)

  useEffect(() => {
    const savedName = getUserName()
    if (savedName) {
      setUserNameInput(savedName)
    }
  }, [])

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!theme.trim()) {
      setError('请输入房间主题')
      return
    }
    
    if (!userName.trim()) {
      setError('请输入您的昵称')
      return
    }

    setLoading(true)
    setError('')
    setUserName(userName.trim())

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          theme: theme.trim(),
          userId: getUserId(),
          userName: userName.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '创建房间失败')
      }

      const data = await response.json()
      setCreatedRoom(data)
    } catch (err: any) {
      setError(err.message || '创建房间失败')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      setError('请输入房间码')
      return
    }

    if (!userName.trim()) {
      setError('请输入您的昵称')
      return
    }

    setLoading(true)
    setError('')
    setUserName(userName.trim())

    try {
      const response = await fetch(`/api/rooms/${joinCode.trim().toUpperCase()}`)
      
      if (!response.ok) {
        throw new Error('房间不存在')
      }

      navigate(`/room/${joinCode.trim().toUpperCase()}`)
    } catch (err: any) {
      setError(err.message || '加入房间失败')
    } finally {
      setLoading(false)
    }
  }

  const goToRoom = () => {
    if (createdRoom) {
      navigate(`/room/${createdRoom.code}`)
    }
  }

  if (createdRoom) {
    return (
      <div className="centered-page">
        <div className="fullscreen-card">
          <h1 style={{ fontSize: '24px', fontWeight: '700', textAlign: 'center', marginBottom: '8px' }}>
            🎉 房间创建成功！
          </h1>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            主题：{createdRoom.theme}
          </p>
          
          <div className="room-code-display">
            <div className="room-code-label">您的房间码</div>
            <div className="room-code">{createdRoom.code}</div>
            <div className="qr-placeholder">
              📱 扫描二维码<br />或输入房间码加入
            </div>
          </div>

          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            分享给朋友，每人添加3首歌曲，一起发现共同的音乐品味吧！
          </p>

          <button 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            onClick={goToRoom}
          >
            进入房间添加歌曲
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="centered-page">
        <div className="fullscreen-card">
          <h1 style={{ fontSize: '28px', fontWeight: '800', textAlign: 'center', marginBottom: '8px' }}>
            🎵 音乐品味收集器
          </h1>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '32px' }}>
            和朋友一起发现共同的音乐爱好
          </p>

          {error && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: 'rgba(229, 62, 62, 0.1)', 
              color: 'var(--error)', 
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleCreateRoom}>
            <div className="form-group">
              <label className="form-label">您的昵称</label>
              <input
                type="text"
                className="input"
                placeholder="输入您的昵称"
                value={userName}
                onChange={(e) => setUserNameInput(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="form-group">
              <label className="form-label">房间主题</label>
              <input
                type="text"
                className="input"
                placeholder="例如：周末派对歌单、通勤BGM"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                maxLength={30}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? '创建中...' : '创建房间'}
            </button>
          </form>

          <div className="join-room-section">
            <div className="join-room-title">或者加入已有房间</div>
            <div className="join-input-group">
              <input
                type="text"
                className="input"
                placeholder="输入6位房间码"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ textTransform: 'uppercase' }}
              />
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleJoinRoom}
                disabled={loading}
              >
                加入
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateRoom
