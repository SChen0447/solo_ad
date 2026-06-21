import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import TagCloud from '../components/TagCloud'
import { AnalyticsData, Song } from '../types'
import { formatDuration, audioManager } from '../utils'

function Analytics() {
  const { code } = useParams<{ code: string }>()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [playingSongId, setPlayingSongId] = useState<string | null>(null)

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!code) return
      
      try {
        const response = await fetch(`/api/rooms/${code}/analytics`)
        if (!response.ok) {
          throw new Error('获取分析数据失败')
        }
        const result = await response.json()
        setData(result)
      } catch (err: any) {
        setError(err.message || '加载失败')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [code])

  const handlePlay = (song: Song) => {
    if (playingSongId === song.id) {
      audioManager.stop()
      setPlayingSongId(null)
    } else {
      audioManager.play(song.id)
      setPlayingSongId(song.id)
      
      setTimeout(() => {
        setPlayingSongId(current => current === song.id ? null : current)
      }, 30000)
    }
  }

  useEffect(() => {
    return () => {
      audioManager.stop()
    }
  }, [])

  if (loading) {
    return (
      <div className="page">
        <div className="loading" style={{ height: '60vh' }}>
          <div className="spinner"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--error)', marginBottom: '20px' }}>{error}</p>
          <Link to="/" className="btn btn-primary">返回首页</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 className="page-title">
                🎵 {data?.room.theme}
              </h1>
              <p className="page-subtitle">
                房间码：<span style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>{code}</span>
              </p>
            </div>
            <Link to={`/room/${code}`} className="btn btn-secondary">
              返回房间
            </Link>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{data?.totalSongs || 0}</div>
            <div className="stat-label">歌曲总数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data?.uniqueUsers || 0}</div>
            <div className="stat-label">参与人数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{data?.tags.length || 0}</div>
            <div className="stat-label">标签数量</div>
          </div>
        </div>

        <div>
          <h2 className="section-title">共同品味标签云</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
            标签越大、颜色越暖，表示越受大家欢迎
          </p>
          {data && data.tags.length > 0 ? (
            <TagCloud tags={data.tags} />
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ color: 'var(--text-muted)' }}>暂无标签数据</p>
            </div>
          )}
        </div>

        <div className="recommend-section">
          <h2 className="recommend-title">
            <span className="recommend-icon">✨</span>
            融合推荐歌单
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
            基于大家的音乐品味，为你们推荐以下歌曲
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data?.recommendedSongs.map((song, index) => (
              <div 
                key={song.id}
                className="song-card"
                style={{ animation: `floatUp 0.3s ease-out ${index * 0.1}s both` }}
              >
                <div style={{ 
                  width: '32px', 
                  textAlign: 'center', 
                  fontWeight: '800',
                  color: index < 3 ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: '18px'
                }}>
                  {index + 1}
                </div>
                <img src={song.cover} alt={song.title} className="song-cover" />
                <div className="song-info">
                  <div className="song-title">{song.title}</div>
                  <div className="song-artist">{song.artist}</div>
                  <div className="song-tags">
                    {song.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="song-duration">{formatDuration(song.duration)}</div>
                <button 
                  className={`play-btn ${playingSongId === song.id ? 'playing' : ''}`}
                  onClick={() => handlePlay(song)}
                  title={playingSongId === song.id ? '暂停' : '播放30秒预览'}
                >
                  {playingSongId === song.id ? '⏸' : '▶'}
                </button>
              </div>
            ))}
          </div>
          
          {(!data?.recommendedSongs || data.recommendedSongs.length === 0) && (
            <div className="empty-state">
              <div className="empty-state-icon">🎶</div>
              <div className="empty-state-text">暂无推荐歌曲</div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <Link to="/" className="btn btn-outline">
            创建新房间
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Analytics
