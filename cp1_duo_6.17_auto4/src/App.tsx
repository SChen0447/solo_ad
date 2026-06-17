import { useState, useEffect } from 'react'
import NoteInput from './components/NoteInput'
import NoteCard from './components/NoteCard'
import CalendarView from './components/CalendarView'
import { api } from './utils/api'
import type { Note, EmotionType } from './types'
import './styles/App.css'

type ViewMode = 'list' | 'calendar'

const MOCK_NOTES: Note[] = [
  {
    id: '1',
    content: '今天阳光真好，心情特别愉快！在公园散步时看到了一只可爱的小狗。',
    type: 'text',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    location: '北京市朝阳区',
    emotion: 'happy'
  },
  {
    id: '2',
    content: '工作上遇到了一些挫折，有点不开心。但是相信明天会更好的！',
    type: 'text',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    location: '上海市浦东新区',
    emotion: 'sad'
  },
  {
    id: '3',
    content: '突然想到一个很棒的创业点子，需要尽快整理一下！',
    type: 'text',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    location: '深圳市南山区',
    emotion: 'surprised'
  },
  {
    id: '4',
    content: '下午的咖啡时光，静静地看会儿书，享受这份宁静。',
    type: 'text',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    location: '杭州市西湖区',
    emotion: 'calm'
  },
  {
    id: '5',
    content: '今天的会议效率太低了，浪费了很多时间，有点烦躁。',
    type: 'text',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    location: '广州市天河区',
    emotion: 'angry'
  },
  {
    id: '6',
    content: '周末和家人一起去爬山，风景太美了！心情大好。',
    type: 'text',
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    location: '成都市锦江区',
    emotion: 'happy'
  }
]

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [emotionFilter, setEmotionFilter] = useState<EmotionType | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [isFlipping, setIsFlipping] = useState(false)

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    try {
      setLoading(true)
      const data = await api.getNotes()
      if (data && data.length > 0) {
        setNotes(data)
      } else {
        setNotes(MOCK_NOTES)
      }
    } catch {
      setNotes(MOCK_NOTES)
    } finally {
      setLoading(false)
    }
  }

  const handleNoteCreated = async () => {
    await loadNotes()
  }

  const handleEmotionFilter = (emotion: EmotionType | null) => {
    setIsFlipping(true)
    setTimeout(() => {
      setEmotionFilter(emotion)
      setIsFlipping(false)
    }, 200)
  }

  const filteredNotes = notes.filter(note => {
    const matchEmotion = emotionFilter ? note.emotion === emotionFilter : true
    const matchKeyword = searchKeyword
      ? note.content.toLowerCase().includes(searchKeyword.toLowerCase())
      : true
    return matchEmotion && matchKeyword
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const emotions: EmotionType[] = ['happy', 'sad', 'angry', 'calm', 'surprised']
  const emotionEmojis: Record<EmotionType, string> = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    calm: '😐',
    surprised: '😮'
  }
  const emotionLabels: Record<EmotionType, string> = {
    happy: '高兴',
    sad: '悲伤',
    angry: '愤怒',
    calm: '平静',
    surprised: '惊喜'
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <span className="logo-icon">📝</span>
            <h1 className="app-title">记忆便签</h1>
          </div>
          <div className="header-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="搜索便签内容..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
            <div className="view-toggle">
              <button
                className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="列表视图"
              >
                📋
              </button>
              <button
                className={`toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
                onClick={() => setViewMode('calendar')}
                title="日历视图"
              >
                📅
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        {viewMode === 'list' ? (
          <>
            <NoteInput onNoteCreated={handleNoteCreated} />

            <div className="emotion-filters">
              <span className="filter-label">按情绪筛选：</span>
              <button
                className={`emotion-filter-btn ${emotionFilter === null ? 'active' : ''}`}
                onClick={() => handleEmotionFilter(null)}
              >
                全部
              </button>
              {emotions.map(emotion => (
                <button
                  key={emotion}
                  className={`emotion-filter-btn ${emotionFilter === emotion ? 'active' : ''}`}
                  onClick={() => handleEmotionFilter(emotion)}
                  title={emotionLabels[emotion]}
                >
                  <span className="emoji">{emotionEmojis[emotion]}</span>
                  <span className="label">{emotionLabels[emotion]}</span>
                </button>
              ))}
            </div>

            <div className="notes-stats">
              共 {filteredNotes.length} 条便签
              {emotionFilter && (
                <span className="filter-active-tag">
                  筛选：{emotionEmojis[emotionFilter]} {emotionLabels[emotionFilter]}
                  <button onClick={() => handleEmotionFilter(null)}>✕</button>
                </span>
              )}
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>加载中...</p>
              </div>
            ) : (
              <div className={`notes-grid ${isFlipping ? 'flipping' : ''}`}>
                {filteredNotes.length > 0 ? (
                  filteredNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEmotionClick={handleEmotionFilter}
                    />
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3>还没有便签</h3>
                    <p>开始记录你的第一个灵感吧！</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <CalendarView
            notes={notes}
            onEmotionFilter={handleEmotionFilter}
          />
        )}
      </main>
    </div>
  )
}

export default App
