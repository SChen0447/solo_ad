import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUserId, getUserName, formatDate } from '../utils'
import { UserHistory } from '../types'

function Profile() {
  const navigate = useNavigate()
  const [data, setData] = useState<UserHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'songs' | 'rooms'>('songs')

  useEffect(() => {
    const fetchHistory = async () => {
      const userId = getUserId()
      
      try {
        const response = await fetch(`/api/users/${userId}/history`)
        if (response.status === 404) {
          setData(null)
          return
        }
        if (!response.ok) {
          throw new Error('获取历史记录失败')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [])

  const goToRoom = (code: string) => {
    navigate(`/room/${code}`)
  }

  const userName = getUserName() || '音乐爱好者'
  const userInitial = userName.charAt(0).toUpperCase()

  if (loading) {
    return (
      <div className="page">
        <div className="loading" style={{ height: '60vh' }}>
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">我的主页</h1>
        </div>

        <div className="user-info card" style={{ marginBottom: '24px' }}>
          <div className="user-avatar">{userInitial}</div>
          <div>
            <div className="user-name">{userName}</div>
            <div className="user-meta">
              共添加 {data?.history.length || 0} 首歌曲 · 参与 {data?.rooms.length || 0} 个房间
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            className={`btn ${activeTab === 'songs' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('songs')}
          >
            添加的歌曲
          </button>
          <button
            className={`btn ${activeTab === 'rooms' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('rooms')}
          >
            参与的房间
          </button>
        </div>

        {activeTab === 'songs' && (
          <div>
            <div className="section-header">
              <h3>歌曲历史</h3>
              <span className="section-count">{data?.history.length || 0} 首</span>
            </div>
            
            {data && data.history.length > 0 ? (
              <div className="grid-3">
                {data.history.map((item, index) => (
                  <div
                    key={item.id}
                    className="history-card"
                    onClick={() => goToRoom(item.room_code)}
                    style={{ animation: `floatUp 0.3s ease-out ${index * 0.05}s both` }}
                  >
                    <div className="history-card-title">{item.songTitle}</div>
                    <div className="history-card-meta">
                      {item.songArtist}
                    </div>
                    <div style={{ fontSize: '12px', marginBottom: '12px', opacity: 0.7 }}>
                      房间：{item.roomTheme}
                    </div>
                    <div className="history-card-tags">
                      {item.songTags.slice(0, 3).map((tag: string) => (
                        <span key={tag} className="history-card-tag">{tag}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '12px', opacity: 0.6 }}>
                      {formatDate(item.addedAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state card">
                <div className="empty-state-icon">🎵</div>
                <div className="empty-state-text">还没有添加过歌曲</div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rooms' && (
          <div>
            <div className="section-header">
              <h3>房间历史</h3>
              <span className="section-count">{data?.rooms.length || 0} 个</span>
            </div>
            
            {data && data.rooms.length > 0 ? (
              <div className="grid-3">
                {data.rooms.map((room, index) => (
                  <div
                    key={room.id}
                    className="history-card"
                    onClick={() => goToRoom(room.code)}
                    style={{ animation: `floatUp 0.3s ease-out ${index * 0.05}s both` }}
                  >
                    <div className="history-card-title">{room.theme}</div>
                    <div className="history-card-meta">
                      房间码：{room.code}
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: '12px' }}>
                      🎶 {room.songCount || 0} 首歌曲
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>
                      {formatDate(room.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state card">
                <div className="empty-state-icon">🏠</div>
                <div className="empty-state-text">还没有参与过房间</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
