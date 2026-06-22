import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import type { Song, LyricLine, FillBlankChallenge, ScoreRecord } from './types'
import LyricVisualizer from './components/LyricVisualizer'
import FillBlankGame from './components/FillBlankGame'

interface AppContextType {
  currentSongId: string | null
  setCurrentSongId: (id: string | null) => void
  totalScore: number
  records: ScoreRecord[]
  addRecord: (record: Omit<ScoreRecord, 'id' | 'timestamp'>) => void
}

const AppContext = createContext<AppContextType | null>(null)

export const useAppContext = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}

function Navbar() {
  const navigate = useNavigate()
  const { totalScore, records } = useAppContext()

  return (
    <nav className="navbar">
      <div className="navbar-title" onClick={() => navigate('/')}>
        歌词工坊
      </div>
      <div className="navbar-links">
        <span className="navbar-link" onClick={() => navigate('/leaderboard')}>
          我的记录
        </span>
        <div className="navbar-score">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {totalScore.toFixed(0)}
        </div>
      </div>
    </nav>
  )
}

function HomePage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { setCurrentSongId } = useAppContext()

  useEffect(() => {
    fetch('/api/songs')
      .then(res => res.json())
      .then((data: Song[]) => {
        setSongs(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSongClick = (song: Song) => {
    setCurrentSongId(song.id)
    navigate(`/lyrics/${song.id}`)
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">热门歌曲榜单</h1>
      </div>
      <div className="songs-grid">
        {songs.map(song => (
          <div
            key={song.id}
            className="song-card"
            onClick={() => handleSongClick(song)}
          >
            <div className="rank-badge">{song.rank}</div>
            <img className="song-cover" src={song.cover} alt={song.title} />
            <div className="song-info">
              <div className="song-title">{song.title}</div>
              <div className="song-artist">{song.artist}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LyricsPage() {
  const { id } = useParams<{ id: string }>()
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [song, setSong] = useState<Song | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { setCurrentSongId } = useAppContext()

  useEffect(() => {
    if (!id) return
    setCurrentSongId(id)
    fetch(`/api/lyrics/${id}`)
      .then(res => res.json())
      .then(data => {
        setLyrics(data.lyrics)
        setSong(data.song)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id, setCurrentSongId])

  if (loading || !song) {
    return (
      <div className="page-container">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="lyric-page">
      <button className="back-button" onClick={() => navigate('/')}>
        ← 返回榜单
      </button>
      <div className="song-header">
        <h2>{song.title}</h2>
        <p>{song.artist}</p>
      </div>
      <LyricVisualizer lyrics={lyrics} />
      <button
        className="action-button"
        onClick={() => navigate(`/challenge/${id}`)}
      >
        开始填空挑战
      </button>
    </div>
  )
}

function ChallengePage() {
  const { id } = useParams<{ id: string }>()
  const [challenge, setChallenge] = useState<FillBlankChallenge | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { addRecord } = useAppContext()

  useEffect(() => {
    if (!id) return
    fetch(`/api/lyrics/${id}`)
      .then(res => res.json())
      .then(data => {
        setChallenge(data.challenge)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  if (loading || !challenge) {
    return (
      <div className="page-container">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="game-page">
      <button className="back-button" onClick={() => navigate(`/lyrics/${id}`)}>
        ← 返回歌词
      </button>
      <div className="song-header">
        <h2>{challenge.songTitle}</h2>
        <p>歌词填空挑战</p>
      </div>
      <FillBlankGame
        challenge={challenge}
        onComplete={(score, maxScore) => {
          addRecord({
            songId: challenge.songId,
            songTitle: challenge.songTitle,
            score,
            maxScore
          })
        }}
      />
    </div>
  )
}

function LeaderboardPage() {
  const { records, totalScore } = useAppContext()
  const navigate = useNavigate()

  const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp)

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="leaderboard-page">
      <button className="back-button" onClick={() => navigate('/')}>
        ← 返回榜单
      </button>
      <h1 className="leaderboard-title">闯关记录</h1>
      <div className="total-score-card">
        <h3>累计积分</h3>
        <div className="total-score-value">{totalScore.toFixed(0)}</div>
      </div>
      {sortedRecords.length === 0 ? (
        <div className="empty-state">还没有闯关记录，快去挑战吧！</div>
      ) : (
        <div className="record-list">
          {sortedRecords.map(record => (
            <div key={record.id} className="record-item">
              <div>
                <div className="record-song">{record.songTitle}</div>
                <div className="record-time">{formatTime(record.timestamp)}</div>
              </div>
              <div className="record-score">
                {record.score.toFixed(0)} / {record.maxScore.toFixed(0)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [currentSongId, setCurrentSongId] = useState<string | null>(null)
  const [records, setRecords] = useState<ScoreRecord[]>([])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('lyric_workshop_records')
      if (saved) {
        setRecords(JSON.parse(saved))
      }
    } catch (e) {
      console.error('Failed to load records', e)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('lyric_workshop_records', JSON.stringify(records))
    } catch (e) {
      console.error('Failed to save records', e)
    }
  }, [records])

  const totalScore = records.reduce((sum, r) => sum + r.score, 0)

  const addRecord = (record: Omit<ScoreRecord, 'id' | 'timestamp'>) => {
    const newRecord: ScoreRecord = {
      ...record,
      id: uuidv4(),
      timestamp: Date.now()
    }
    setRecords(prev => [...prev, newRecord])
  }

  return (
    <AppContext.Provider
      value={{
        currentSongId,
        setCurrentSongId,
        totalScore,
        records,
        addRecord
      }}
    >
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/lyrics/:id" element={<LyricsPage />} />
        <Route path="/challenge/:id" element={<ChallengePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </AppContext.Provider>
  )
}
