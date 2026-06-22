import { useState } from 'react'
import { dataStore, MoodType, MOOD_CONFIG } from '../../shared/dataStore'
import './CapsuleCreator.css'

interface CapsuleCreatorProps {
  onCreated?: () => void
}

export function CapsuleCreator({ onCreated }: CapsuleCreatorProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [mood, setMood] = useState<MoodType>('happy')
  const [targetDate, setTargetDate] = useState('')

  const maxLength = 500
  const warningLength = 400
  const progress = (content.length / maxLength) * 100
  const isWarning = content.length > warningLength
  const isOverflow = content.length >= maxLength

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim() || !targetDate) return

    dataStore.createCapsule({
      title: title.trim(),
      content: content.trim(),
      imageUrl: imageUrl.trim(),
      mood,
      targetDate: new Date(targetDate).toISOString()
    })

    setTitle('')
    setContent('')
    setImageUrl('')
    setMood('happy')
    setTargetDate('')

    onCreated?.()
  }

  const moodOptions: MoodType[] = ['happy', 'calm', 'sad', 'angry', 'tired']

  return (
    <div className="capsule-creator">
      <h2 className="creator-title">创建时间胶囊</h2>
      <form onSubmit={handleSubmit} className="creator-form">
        <div className="form-group">
          <label htmlFor="targetDate">目标日期</label>
          <input
            type="date"
            id="targetDate"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="form-input date-input"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-group">
          <label htmlFor="title">标题</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
            placeholder="给这颗胶囊起个名字..."
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">正文</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => {
              if (e.target.value.length <= maxLength) {
                setContent(e.target.value)
              }
            }}
            className={`form-textarea ${isWarning ? 'warning' : ''} ${isOverflow ? 'overflow' : ''}`}
            placeholder="写下你想对未来说的话..."
            rows={6}
          />
          <div className="char-counter">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: isWarning ? '#F59E0B' : '#10B981'
                }}
              />
            </div>
            <span className={`char-count ${isWarning ? 'warning-text' : ''}`}>
              {content.length} / {maxLength}
            </span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="imageUrl">图片链接</label>
          <input
            type="url"
            id="imageUrl"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="form-input"
            placeholder="输入图片URL地址..."
          />
          {imageUrl && (
            <div className="image-preview">
              <img src={imageUrl} alt="预览" onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }} />
            </div>
          )}
        </div>

        <div className="form-group">
          <label>心情</label>
          <div className="mood-selector">
            {moodOptions.map((m) => (
              <button
                key={m}
                type="button"
                className={`mood-btn ${mood === m ? 'selected' : ''}`}
                style={{ backgroundColor: MOOD_CONFIG[m].color }}
                onClick={() => setMood(m)}
                title={MOOD_CONFIG[m].label}
              >
                <span className="mood-emoji">{MOOD_CONFIG[m].emoji}</span>
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="submit-btn">
          封存胶囊
        </button>
      </form>
    </div>
  )
}
