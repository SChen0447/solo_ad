import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Song, Room, RoomSong } from '../types'
import { getUserId, getUserName, formatDuration } from '../utils'

interface RoomData extends Room {
  songs: RoomSong[]
}

function AddSongs() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Song[]>([])
  const [roomData, setRoomData] = useState<RoomData | null>(null)
  const [addingSong, setAddingSong] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [mySongCount, setMySongCount] = useState(0)
  const [newSongIds, setNewSongIds] = useState<Set<string>>(new Set())
  const searchTimeoutRef = useRef<number | null>(null)
  const userId = getUserId()

  const fetchRoom = useCallback(async () => {
    if (!code) return
    
    try {
      const response = await fetch(`/api/rooms/${code}`)
      if (!response.ok) {
        throw new Error('房间不存在')
      }
      const data = await response.json()
      setRoomData(data)
      const myCount = data.songs.filter((s: RoomSong) => s.userId === userId).length
      setMySongCount(myCount)
    } catch (err: any) {
      setError(err.message || '获取房间信息失败')
    }
  }, [code, userId])

  const searchSongs = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(`/api/songs/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setSearchResults(data)
    } catch (err) {
      console.error('搜索失败', err)
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    fetchRoom()
  }, [fetchRoom])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    if (searchQuery.trim()) {
      searchTimeoutRef.current = window.setTimeout(() => {
        searchSongs(searchQuery)
      }, 300)
    } else {
      setSearchResults([])
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, searchSongs])

  const addSong = async (song: Song) => {
    if (!code) return
    if (mySongCount >= 3) {
      setError('每人最多添加3首歌曲')
      return
    }

    const userName = getUserName() || '匿名用户'

    if (roomData?.songs.some(s => s.songId === song.id)) {
      setError('该歌曲已在房间中')
      return
    }

    setAddingSong(true)
    setError('')

    try {
      const response = await fetch(`/api/rooms/${code}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songId: song.id,
          userId,
          userName,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '添加失败')
      }

      const newSong = await response.json()
      
      setRoomData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          songs: [newSong, ...prev.songs],
        }
      })
      
      setMySongCount(prev => prev + 1)
      
      setNewSongIds(prev => {
        const newSet = new Set(prev)
        newSet.add(newSong.id)
        return newSet
      })

      setTimeout(() => {
        setNewSongIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(newSong.id)
          return newSet
        })
      }, 500)

    } catch (err: any) {
      setError(err.message || '添加失败')
    } finally {
      setAddingSong(false)
    }
  }

  const goToAnalytics = () => {
    if (code) {
      navigate(`/room/${code}/analytics`)
    }
  }

  const isSongAdded = (songId: string) => {
    return roomData?.songs.some(s => s.songId === songId) || false
  }

  if (error && !roomData) {
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
                {roomData?.theme || '加载中...'}
              </h1>
              <p className="page-subtitle">
                房间码：<span style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>{code}</span>
                {' · '}
                您已添加 {mySongCount}/3 首
              </p>
            </div>
            <button 
              className="btn btn-primary"
              onClick={goToAnalytics}
              disabled={!roomData || roomData.songs.length === 0}
            >
              查看分析
            </button>
          </div>
        </div>

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

        <div className="split-layout">
          <div className="split-left">
            <div className="search-section">
              <h2 className="section-title">搜索歌曲</h2>
              <input
                type="text"
                className="input"
                placeholder="搜索歌曲名、歌手或标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="search-results">
              {searching ? (
                <div className="loading">
                  <div className="spinner"></div>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((song) => (
                  <div 
                    key={song.id}
                    className="song-card"
                    onClick={() => !isSongAdded(song.id) && mySongCount < 3 && addSong(song)}
                    style={{ 
                      opacity: isSongAdded(song.id) ? 0.5 : 1,
                      cursor: isSongAdded(song.id) || mySongCount >= 3 ? 'not-allowed' : 'pointer'
                    }}
                  >
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
                    {isSongAdded(song.id) && (
                      <span style={{ color: 'var(--success)', fontSize: '12px', fontWeight: '600' }}>
                        已添加
                      </span>
                    )}
                  </div>
                ))
              ) : searchQuery.trim() ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🔍</div>
                  <div className="empty-state-text">未找到相关歌曲</div>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">🎵</div>
                  <div className="empty-state-text">输入关键词搜索歌曲</div>
                </div>
              )}
            </div>
          </div>

          <div className="split-right">
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div className="section-header">
                <h3 className="section-title" style={{ marginBottom: 0 }}>房间歌单</h3>
                <span className="section-count">
                  {roomData?.songs.length || 0} 首
                </span>
              </div>

              <div className="selected-list" style={{ marginTop: '16px' }}>
                {!roomData ? (
                  <div className="loading">
                    <div className="spinner"></div>
                  </div>
                ) : roomData.songs.length > 0 ? (
                  roomData.songs.map((song) => (
                    <div 
                      key={song.id}
                      className={`song-card ${newSongIds.has(song.id) ? 'slide-in' : ''}`}
                      style={{ cursor: 'default' }}
                    >
                      <img src={song.songCover} alt={song.songTitle} className="song-cover" />
                      <div className="song-info">
                        <div className="song-title">{song.songTitle}</div>
                        <div className="song-artist">{song.songArtist}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          by {song.userName}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">🎶</div>
                    <div className="empty-state-text">还没有歌曲，快去添加吧</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddSongs
