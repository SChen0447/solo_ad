import React from 'react'
import dayjs from 'dayjs'
import { Entry, MoodType, useStore } from '../store'

interface Props {
  entry: Entry
}

const moods: { key: MoodType; emoji: string; label: string }[] = [
  { key: 'happy', emoji: '😊', label: '开心' },
  { key: 'calm', emoji: '😌', label: '平静' },
  { key: 'moved', emoji: '🥹', label: '感动' },
  { key: 'anxious', emoji: '😰', label: '焦虑' },
  { key: 'tired', emoji: '😴', label: '疲惫' },
  { key: 'surprise', emoji: '🎉', label: '惊喜' },
]

function renderMarkdown(text: string): string {
  let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  const lines = html.split('\n')
  const result: string[] = []
  let inList = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const listMatch = line.match(/^\s*[-*+]\s+(.+)$/)

    if (listMatch) {
      if (!inList) {
        result.push('<ul style="margin: 12px 0; padding-left: 24px;">')
        inList = true
      }
      result.push(`<li style="margin: 4px 0; line-height: 1.7;">${listMatch[1]}</li>`)
    } else {
      if (inList) {
        result.push('</ul>')
        inList = false
      }
      if (line.trim() === '') {
        result.push('<br />')
      } else {
        result.push(`<p style="margin: 8px 0; line-height: 1.8;">${line}</p>`)
      }
    }
  }
  if (inList) result.push('</ul>')

  return result.join('\n')
}

export default function EntryCard({ entry }: Props) {
  const { setMood, addTag, removeTag, setEntryImage, updateEntry, deleteEntry } = useStore()
  const [bounceMood, setBounceMood] = React.useState<string | null>(null)
  const [tagInput, setTagInput] = React.useState('')
  const [previewImage, setPreviewImage] = React.useState<string | null>(null)
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [isEditingContent, setIsEditingContent] = React.useState(false)
  const [editTitle, setEditTitle] = React.useState(entry.title)
  const [editContent, setEditContent] = React.useState(entry.content)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setEditTitle(entry.title)
    setEditContent(entry.content)
  }, [entry.id])

  const handleMoodClick = (key: MoodType) => {
    setMood(entry.id, key)
    setBounceMood(key)
    setTimeout(() => setBounceMood(null), 400)
  }

  const handleAddTag = () => {
    const t = tagInput.trim()
    if (t) {
      addTag(entry.id, t)
      setTagInput('')
    }
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

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 300
        let w = img.width
        let h = img.height
        if (w > h) {
          if (w > maxSize) { h = (maxSize / w) * h; w = maxSize }
        } else {
          if (h > maxSize) { w = (maxSize / h) * w; h = maxSize }
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h)
          const thumb = canvas.toDataURL('image/jpeg', 0.85)
          setEntryImage(entry.id, dataUrl, thumb)
        }
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setEntryImage(entry.id, null, null)
  }

  const saveTitle = () => {
    updateEntry(entry.id, { title: editTitle.trim() || entry.title })
    setIsEditingTitle(false)
  }

  const saveContent = () => {
    updateEntry(entry.id, { content: editContent })
    setIsEditingContent(false)
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div
        className="card"
        style={{
          position: 'relative',
          minHeight: 400,
        }}
      >
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'rgba(255, 255, 255, 0.75)',
          borderRadius: '50%',
          width: 72,
          height: 72,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          zIndex: 2,
        }}>
          <span style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--deep-brown)',
            lineHeight: 1,
          }}>
            {dayjs(entry.date).date()}
          </span>
          <span style={{
            fontSize: 10,
            color: 'var(--gray-medium)',
            marginTop: 2,
          }}>
            {dayjs(entry.date).format('M月 HH:mm')}
          </span>
        </div>

        <div style={{ paddingRight: 88, marginBottom: 16 }}>
          {isEditingTitle ? (
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === 'Enter') saveTitle() }}
              autoFocus
              style={{
                fontFamily: "'Patrick Hand', cursive",
                fontSize: '2rem',
                color: 'var(--deep-brown)',
                background: 'rgba(255,255,255,0.5)',
                border: '2px dashed var(--brand-green-light)',
                borderRadius: 8,
                padding: '4px 10px',
                width: '100%',
                outline: 'none',
                fontWeight: 600,
              }}
            />
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              style={{
                fontFamily: "'Patrick Hand', cursive",
                fontSize: '2rem',
                color: 'var(--deep-brown)',
                cursor: 'text',
                padding: '4px 0',
                fontWeight: 600,
                lineHeight: 1.3,
              }}
              title="点击编辑标题"
            >
              {entry.title}
            </h1>
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 500 }}>
            今日心情
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {moods.map(m => (
              <button
                key={m.key}
                onClick={() => handleMoodClick(m.key)}
                className={bounceMood === m.key ? 'bounce-anim' : ''}
                title={m.label}
                style={{
                  padding: '6px 10px',
                  background: entry.mood === m.key ? 'var(--brand-green-light)' : 'rgba(255,255,255,0.5)',
                  border: entry.mood === m.key ? '2px solid var(--brand-green)' : '2px solid transparent',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 24,
                  lineHeight: 1,
                  transition: 'all 0.15s ease',
                }}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 500 }}>
            标签（最多3个）
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {entry.tags.map(t => (
              <span key={t} className="pill-tag">
                {t}
                <span className="tag-delete" onClick={() => removeTag(entry.id, t)}>×</span>
              </span>
            ))}
          </div>
          {entry.tags.length < 3 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                placeholder="输入标签..."
                style={{
                  padding: '5px 10px',
                  border: '1px solid #ddd',
                  borderRadius: 6,
                  fontSize: 12,
                  background: 'rgba(255,255,255,0.7)',
                  width: 140,
                }}
              />
              <button
                onClick={handleAddTag}
                className="btn"
                style={{
                  padding: '5px 12px',
                  background: 'var(--tag-bg)',
                  color: 'var(--tag-text)',
                  fontSize: 12,
                }}
              >
                添加
              </button>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 500 }}>
            记录内容
          </div>
          {isEditingContent ? (
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onBlur={saveContent}
              autoFocus
              rows={10}
              style={{
                width: '100%',
                padding: 12,
                border: '2px dashed var(--brand-green-light)',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.6)',
                fontSize: 14,
                lineHeight: 1.8,
                resize: 'vertical',
                fontFamily: 'inherit',
                color: '#333',
                outline: 'none',
              }}
            />
          ) : (
            <div
              onClick={() => setIsEditingContent(true)}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(entry.content) }}
              style={{
                padding: 12,
                background: 'rgba(255,255,255,0.4)',
                borderRadius: 10,
                cursor: 'text',
                fontSize: 14,
                color: '#3a3a3a',
                minHeight: 80,
              }}
              title="点击编辑内容"
            />
          )}
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8, fontWeight: 500 }}>
            图片附注
          </div>
          {entry.thumbnail ? (
            <div style={{ display: 'inline-block', position: 'relative' }}>
              <img
                src={entry.thumbnail}
                alt="thumbnail"
                onClick={() => entry.image && setPreviewImage(entry.image)}
                style={{
                  width: 140,
                  height: 140,
                  objectFit: 'cover',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  cursor: 'zoom-in',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              />
              <button
                onClick={handleRemoveImage}
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#ef5350',
                  color: 'white',
                  border: '2px solid white',
                  cursor: 'pointer',
                  fontSize: 16,
                  lineHeight: 1,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                className="btn"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  color: 'var(--brand-green-dark)',
                  border: '1.5px dashed var(--brand-green-light)',
                  padding: '10px 18px',
                  fontSize: 13,
                }}
              >
                📷 添加图片（JPG/PNG，≤2MB）
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>

        <div style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: '#aaa' }}>
            创建于 {dayjs(entry.date).format('YYYY-MM-DD HH:mm')}
          </span>
          <button
            onClick={() => {
              if (confirm('确定要删除这条记录吗？')) deleteEntry(entry.id)
            }}
            className="btn"
            style={{
              background: 'rgba(239, 83, 80, 0.1)',
              color: '#ef5350',
              padding: '6px 14px',
              fontSize: 12,
            }}
          >
            🗑️ 删除
          </button>
        </div>
      </div>

      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 40,
            animation: 'fade-in 0.2s ease-out',
          }}
        >
          <img
            src={previewImage}
            alt="preview"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: 12,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          />
        </div>
      )}
    </div>
  )
}
