import { useState } from 'react'
import { format } from 'date-fns'
import type { Note, EmotionType } from '../types'
import { zhCN } from 'date-fns/locale'
import '../styles/NoteCard.css'

interface NoteCardProps {
  note: Note
  onEmotionClick: (emotion: EmotionType) => void
  highlighted?: boolean
}

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

const emotionBgColors: Record<EmotionType, string> = {
  happy: '#FFD93D',
  sad: '#74b9ff',
  angry: '#FF6B6B',
  calm: '#A8E6CF',
  surprised: '#DDA0DD'
}

function NoteCard({ note, onEmotionClick, highlighted = false }: NoteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
    } catch {
      return dateStr
    }
  }

  const getRelativeTime = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffSec < 60) return '刚刚'
    if (diffMin < 60) return `${diffMin}分钟前`
    if (diffHour < 24) return `${diffHour}小时前`
    if (diffDay < 7) return `${diffDay}天前`
    return formatDate(dateStr)
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`
    }
    return `${secs}秒`
  }

  const getTypeLabel = () => {
    switch (note.type) {
      case 'text':
      default:
        return { icon: '📝', label: '文字' }
      case 'voice':
        return { icon: '🎤', label: '语音' }
      case 'image':
        return { icon: '🖼️', label: '图片' }
    }
  }

  const typeInfo = getTypeLabel()

  return (
    <div
      className={`note-card ${highlighted ? 'highlighted' : ''} ${isExpanded ? 'expanded' : ''}`}
      style={{ borderTopColor: emotionBgColors[note.emotion]
    }}
    >
      <div className="card-header">
        <div className="card-meta">
          <span className="type-badge">
            <span>{typeInfo.icon}</span>
            <span>{typeInfo.label}</span>
          </span>
          <span className="card-time" title={formatDate(note.createdAt)}>
            {getRelativeTime(note.createdAt)}
          </span>
        </div>
        <button
          className="emotion-btn"
          onClick={(e) => {
            e.stopPropagation()
            onEmotionClick(note.emotion)
          }}
          title={`点击筛选「${emotionLabels[note.emotion]}」便签`}
        >
          <span className="emoji">{emotionEmojis[note.emotion]}</span>
          <span className="emotion-label">{emotionLabels[note.emotion]}</span>
        </button>
      </div>

      <div className="card-body" onClick={() => setIsExpanded(!isExpanded)}>
        {note.type === 'image' && note.imageUrl && (
          <div className="card-image-container">
            <img
              src={note.imageUrl}
              alt="便签图片"
              className="card-image"
            />
          </div>
        )}

        {note.type === 'voice' && (
          <div className="card-voice">
            {note.voiceUrl ? (
              <audio controls src={note.voiceUrl} className="card-audio" />
            ) : (
                note.voiceDuration && (
                <div className="voice-placeholder">
                  🎵 {formatDuration(note.voiceDuration)}
                </div>
              )
            )}
          </div>
        )}

        <p className={`card-content ${isExpanded ? '' : 'collapsed'}>
          {note.content}
        </p>

        {!isExpanded && note.content.length > 100 && (
          <div className="expand-hint">点击展开详情 ▼</div>
        )}
        {isExpanded && note.content.length > 100 && (
          <div className="expand-hint">点击收起 ▲</div>
        )}
      </div>

      <div className="card-footer">
        {note.location && (
        <div className="card-location">
            📍 {note.location}
          </div>
      )}
        <div className="card-full-time">
          🕐 {formatDate(note.createdAt)}
        </div>
      </div>
    </div>
  )
}

export default NoteCard
