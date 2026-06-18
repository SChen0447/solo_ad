import React from 'react'
import ReactDOM from 'react-dom/client'
import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import './styles.css'
import { useStore, MoodType } from './store'
import TimelinePanel from './components/TimelinePanel'
import Sidebar from './components/Sidebar'
import EntryCard from './components/EntryCard'

function App() {
  const {
    entries,
    currentView,
    selectedDate,
    selectedEntryId,
    createFormOpen,
    toggleCreateForm,
    setCurrentView,
    setSelectedDate,
    selectEntry,
    addEntry,
  } = useStore()

  const filteredEntries = React.useMemo(() => {
    if (!selectedDate) return entries
    return entries.filter(e => dayjs(e.date).isSame(selectedDate, 'day'))
  }, [entries, selectedDate])

  const sortedEntries = React.useMemo(() => {
    return [...filteredEntries].sort((a, b) =>
      dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
    )
  }, [filteredEntries])

  const selectedEntry = React.useMemo(() => {
    if (selectedEntryId) {
      return entries.find(e => e.id === selectedEntryId) || null
    }
    return sortedEntries[0] || null
  }, [entries, selectedEntryId, sortedEntries])

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        height: 56,
        background: 'var(--brand-green)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
        borderRadius: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>📔 手账时光</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            <button
              onClick={() => setCurrentView('week')}
              style={{
                padding: '8px 16px',
                background: currentView === 'week' ? 'var(--brand-green-dark)' : 'transparent',
                color: currentView === 'week' ? 'white' : '#e0e0e0',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
            >
              周视图
            </button>
            <button
              onClick={() => setCurrentView('month')}
              style={{
                padding: '8px 16px',
                background: currentView === 'month' ? 'var(--brand-green-dark)' : 'transparent',
                color: currentView === 'month' ? 'white' : '#e0e0e0',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.2s ease',
              }}
            >
              月视图
            </button>
          </div>
          <button
            className="btn"
            style={{
              background: 'white',
              color: 'var(--brand-green-dark)',
              padding: '8px 18px',
              fontWeight: 600,
            }}
            onClick={toggleCreateForm}
          >
            ✏️ 新建条目
          </button>
        </div>
      </div>

      <div style={{
        padding: '12px 24px',
        background: 'white',
        borderBottom: '1px solid #eee',
        flexShrink: 0,
      }}>
        <TimelinePanel />
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <div style={{
          width: 320,
          flexShrink: 0,
          borderRight: '1px solid #e8e4dc',
          background: '#faf7f2',
          overflowY: 'auto',
          padding: 16,
        }}>
          <Sidebar entries={sortedEntries} selectedId={selectedEntry?.id} onSelect={selectEntry} />
        </div>
        <div style={{
          flex: 1,
          padding: 24,
          overflowY: 'auto',
          background: '#f5f0e8',
        }}>
          {selectedEntry ? (
            <EntryCard entry={selectedEntry} />
          ) : (
            <div style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              gap: 16,
            }}>
              <div style={{ fontSize: 64 }}>📖</div>
              <div style={{ fontSize: 18 }}>还没有记录，开始写下你的第一篇手账吧</div>
              <button
                className="btn btn-primary"
                style={{ padding: '12px 28px', fontSize: 16 }}
                onClick={toggleCreateForm}
              >
                创建第一条记录
              </button>
            </div>
          )}
        </div>
      </div>

      {createFormOpen && <CreateEntryModal />}
    </div>
  )
}

function CreateEntryModal() {
  const { toggleCreateForm, addEntry } = useStore()
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [mood, setMood] = React.useState<MoodType>('happy')
  const [tags, setTags] = React.useState<string[]>([])
  const [tagInput, setTagInput] = React.useState('')
  const [bounceMood, setBounceMood] = React.useState<string | null>(null)
  const [imageData, setImageData] = React.useState<string | null>(null)
  const [imageThumb, setImageThumb] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const moods: { key: MoodType; emoji: string; label: string }[] = [
    { key: 'happy', emoji: '😊', label: '开心' },
    { key: 'calm', emoji: '😌', label: '平静' },
    { key: 'moved', emoji: '🥹', label: '感动' },
    { key: 'anxious', emoji: '😰', label: '焦虑' },
    { key: 'tired', emoji: '😴', label: '疲惫' },
    { key: 'surprise', emoji: '🎉', label: '惊喜' },
  ]

  const handleMoodClick = (key: MoodType) => {
    setMood(key)
    setBounceMood(key)
    setTimeout(() => setBounceMood(null), 400)
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t) && tags.length < 3) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const removeTag = (t: string) => {
    setTags(tags.filter(x => x !== t))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!validTypes.includes(file.type)) {
      alert('只支持 JPG 和 PNG 格式')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setImageData(dataUrl)

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 300
        let w = img.width
        let h = img.height
        if (w > h) {
          if (w > maxSize) {
            h = (maxSize / w) * h
            w = maxSize
          }
        } else {
          if (h > maxSize) {
            w = (maxSize / h) * w
            h = maxSize
          }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h)
          setImageThumb(canvas.toDataURL('image/jpeg', 0.85))
        }
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    if (!title.trim()) {
      alert('请输入标题')
      return
    }
    addEntry({
      id: uuidv4(),
      title: title.trim(),
      content: content.trim(),
      date: dayjs().toISOString(),
      mood,
      tags,
      image: imageData,
      thumbnail: imageThumb,
    })
    toggleCreateForm()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={toggleCreateForm}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '85vh',
          background: 'white',
          borderRadius: '16px 16px 0 0',
          padding: 24,
          animation: 'slide-up 0.3s ease-out',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--deep-brown)' }}>新建手账条目</h2>
          <button
            onClick={toggleCreateForm}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              color: '#999',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#555', fontWeight: 500 }}>标题</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="今天的主题是..."
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 15,
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#555', fontWeight: 500 }}>
              正文（支持 **加粗**、*斜体*、- 列表）
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="写下你此刻的心情..."
              rows={6}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#555', fontWeight: 500 }}>心情</label>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {moods.map(m => (
                <button
                  key={m.key}
                  onClick={() => handleMoodClick(m.key)}
                  className={bounceMood === m.key ? 'bounce-anim' : ''}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '10px 16px',
                    background: mood === m.key ? 'var(--brand-green-light)' : '#f5f5f5',
                    border: mood === m.key ? '2px solid var(--brand-green)' : '2px solid transparent',
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{m.emoji}</span>
                  <span style={{ fontSize: 12, color: '#555' }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#555', fontWeight: 500 }}>
              标签（最多3个）
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {tags.map(t => (
                <span key={t} className="pill-tag">
                  {t}
                  <span className="tag-delete" onClick={() => removeTag(t)}>×</span>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="输入标签后回车添加"
                disabled={tags.length >= 3}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
              <button
                className="btn btn-primary"
                onClick={addTag}
                disabled={tags.length >= 3}
                style={{ padding: '8px 16px' }}
              >
                添加
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, color: '#555', fontWeight: 500 }}>
              图片附注（可选，JPG/PNG，最大2MB）
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                className="btn"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: '#f0f0f0',
                  color: '#333',
                  padding: '10px 18px',
                }}
              >
                📷 选择图片
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              {imageThumb && (
                <div style={{ position: 'relative' }}>
                  <img
                    src={imageThumb}
                    alt="preview"
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, boxShadow: 'var(--shadow-soft)' }}
                  />
                  <button
                    onClick={() => { setImageData(null); setImageThumb(null) }}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#ef5350',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 14,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid #eee' }}>
            <button
              className="btn"
              onClick={toggleCreateForm}
              style={{ background: '#f0f0f0', color: '#333', padding: '10px 22px' }}
            >
              取消
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              style={{ padding: '10px 28px', fontSize: 15 }}
            >
              保存条目
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
