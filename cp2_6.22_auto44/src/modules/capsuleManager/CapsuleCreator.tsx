import { useState } from 'react'
import { dataStore, type MoodType } from '../../shared/dataStore'

const MOODS: Array<{ type: MoodType; emoji: string; color: string; label: string }> = [
  { type: 'happy', emoji: '😊', color: '#FBBF24', label: '开心' },
  { type: 'calm', emoji: '😌', color: '#60A5FA', label: '平静' },
  { type: 'sad', emoji: '😢', color: '#818CF8', label: '伤感' },
  { type: 'angry', emoji: '😠', color: '#F87171', label: '愤怒' },
  { type: 'tired', emoji: '😴', color: '#A78BFA', label: '疲惫' }
]

const MAX_CONTENT = 500
const WARNING_THRESHOLD = 400

function getTomorrowDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function CapsuleCreator() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [mood, setMood] = useState<MoodType | null>(null)
  const [targetDate, setTargetDate] = useState(getTomorrowDate())
  const [showSuccess, setShowSuccess] = useState(false)

  const contentLength = content.length
  const progressPercent = Math.min((contentLength / MAX_CONTENT) * 100, 100)
  const isWarning = contentLength > WARNING_THRESHOLD

  const canSubmit = title.trim() && content.trim() && mood && targetDate

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    dataStore.createCapsule({
      title: title.trim(),
      content: content.trim(),
      imageUrl: imageUrl.trim(),
      mood: mood!,
      targetDate
    })
    setTitle('')
    setContent('')
    setImageUrl('')
    setMood(null)
    setTargetDate(getTomorrowDate())
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    if (val.length <= MAX_CONTENT) {
      setContent(val)
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>封存此刻 · 寄给未来</h2>

      {showSuccess && (
        <div style={styles.successToast}>
          <span>✓ 胶囊已封存，等待开启之日</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>开启日期</label>
          <input
            type="date"
            value={targetDate}
            min={getTodayDate()}
            onChange={(e) => setTargetDate(e.target.value)}
            style={styles.dateInput}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>标题</label>
          <input
            type="text"
            placeholder="给这颗胶囊起个名字..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.textInput}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            正文
            <span style={{
              marginLeft: 8,
              color: isWarning ? '#F59E0B' : '#9CA3AF',
              fontSize: 13,
              fontWeight: 400
            }}>
              {contentLength} / {MAX_CONTENT}
            </span>
          </label>
          <div style={{
            position: 'relative',
            border: `2px solid ${isWarning ? '#F59E0B' : '#374151'}`,
            borderRadius: 10,
            overflow: 'hidden',
            animation: isWarning ? 'borderBlink 1s ease-in-out infinite' : 'none'
          }}>
            <textarea
              placeholder="写下此刻的心情、想说的话，封存给未来的自己..."
              value={content}
              onChange={handleContentChange}
              style={{
                ...styles.textarea,
                border: 'none',
                marginBottom: 0
              }}
            />
            <div style={styles.progressBarBg}>
              <div style={{
                ...styles.progressBarFill,
                width: `${progressPercent}%`,
                backgroundColor: isWarning ? '#F59E0B' : '#10B981'
              }} />
            </div>
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>图片URL（可选）</label>
          <input
            type="text"
            placeholder="https://example.com/photo.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            style={styles.textInput}
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="预览"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              style={styles.imagePreview}
            />
          )}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>此刻心情</label>
          <div style={styles.moodRow}>
            {MOODS.map((m) => (
              <button
                key={m.type}
                type="button"
                onClick={() => setMood(m.type)}
                style={{
                  ...styles.moodBtn,
                  backgroundColor: mood === m.type ? m.color + '25' : '#374151',
                  transform: mood === m.type ? 'scale(1.2)' : 'scale(1)',
                  border: mood === m.type ? '1px solid #1F2937' : '1px solid transparent',
                  boxShadow: mood === m.type ? `0 0 0 1px ${m.color} inset` : 'none'
                }}
                title={m.label}
              >
                <span style={{ fontSize: 24 }}>{m.emoji}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            ...styles.submitBtn,
            opacity: canSubmit ? 1 : 0.5,
            cursor: canSubmit ? 'pointer' : 'not-allowed'
          }}
        >
          封存胶囊 ✨
        </button>
      </form>

      <style>{`
        @keyframes borderBlink {
          0%, 100% { border-color: #F59E0B; }
          50% { border-color: #FBBF24; }
        }
      `}</style>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 24,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    marginBottom: 24,
    position: 'relative'
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#F9FAFB',
    margin: '0 0 20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: '#D1D5DB',
    display: 'flex',
    alignItems: 'center'
  },
  dateInput: {
    padding: '10px 14px',
    backgroundColor: '#111827',
    border: '1px solid #374151',
    borderRadius: 10,
    color: '#F9FAFB',
    fontSize: 14,
    outline: 'none',
    colorScheme: 'dark'
  },
  textInput: {
    padding: '10px 14px',
    backgroundColor: '#111827',
    border: '1px solid #374151',
    borderRadius: 10,
    color: '#F9FAFB',
    fontSize: 14,
    outline: 'none'
  },
  textarea: {
    width: '100%',
    minHeight: 100,
    padding: '10px 14px',
    backgroundColor: '#111827',
    borderRadius: 10,
    color: '#F9FAFB',
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#374151'
  },
  progressBarFill: {
    height: '100%',
    transition: 'width 0.2s ease, background-color 0.2s ease'
  },
  imagePreview: {
    width: 128,
    height: 128,
    objectFit: 'cover',
    borderRadius: 8,
    marginTop: 8,
    border: '1px solid #374151'
  },
  moodRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap'
  },
  moodBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 12,
    cursor: 'pointer',
    border: '1px solid transparent',
    transition: 'transform 0.15s ease, background-color 0.15s ease, border 0.15s ease, box-shadow 0.15s ease'
  },
  submitBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 22,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s ease, transform 0.15s ease',
    marginTop: 4
  },
  successToast: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: '10px 18px',
    backgroundColor: '#10B981',
    color: '#fff',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    animation: 'fadeSlideIn 0.3s ease'
  }
}
