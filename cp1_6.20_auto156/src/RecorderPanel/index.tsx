import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MOOD_CONFIGS, getMoodConfig } from '@/types'
import { moodApi } from '@/api'
import type { MoodType } from '@/types'
import './style.css'

const MAX_CONTENT_LENGTH = 80

function RecorderPanel() {
  const [selectedMood, setSelectedMood] = useState<MoodType>('happy')
  const [content, setContent] = useState('')
  const [memberName, setMemberName] = useState('匿名')
  const [keywords, setKeywords] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successVisible, setSuccessVisible] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const moodConfig = getMoodConfig(selectedMood)

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= MAX_CONTENT_LENGTH) {
      setContent(value)
    }
  }

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await moodApi.createCard({
        mood: selectedMood,
        content: content.trim(),
        memberId: 'user_' + Math.random().toString(36).slice(2, 8),
        memberName: memberName.trim() || '匿名',
        keywords: keywords.split(/[,，、\s]+/).filter(k => k.trim()),
      })
      setContent('')
      setKeywords('')
      setSuccessVisible(true)
      setTimeout(() => setSuccessVisible(false), 2000)
    } catch (e) {
      console.error('发布失败', e)
      alert('发布失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const textareaStyle: React.CSSProperties = {
    borderColor: isFocused ? moodConfig.color : '#ddd',
    boxShadow: isFocused ? `0 0 8px ${moodConfig.color}4D` : 'none',
  }

  const buttonStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${moodConfig.color}, ${moodConfig.color}CC)`,
  }

  return (
    <div className="recorder-panel">
      <motion.div
        className="recorder-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          background: `linear-gradient(to bottom, ${moodConfig.color} 120px, #FFFFFF 120px)`,
        }}
      >
        <div className="recorder-header">
          <h2 className="recorder-title">记录今天的情绪</h2>
          <p className="recorder-subtitle">选一种颜色，写一句话</p>
        </div>

        <div className="mood-selector">
          <div className="mood-selector-label">选择情绪</div>
          <div className="mood-options">
            {MOOD_CONFIGS.map(mood => (
              <motion.button
                key={mood.type}
                className={`mood-option ${selectedMood === mood.type ? 'selected' : ''}`}
                onClick={() => setSelectedMood(mood.type)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  '--mood-color': mood.color,
                  backgroundColor: selectedMood === mood.type ? mood.color : '#fff',
                  color: selectedMood === mood.type ? '#fff' : mood.color,
                  borderColor: mood.color,
                } as React.CSSProperties}
              >
                <span className="mood-emoji">{getMoodEmoji(mood.type)}</span>
                <span className="mood-label">{mood.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">昵称（可选）</label>
          <input
            type="text"
            className="name-input"
            value={memberName}
            onChange={e => setMemberName(e.target.value)}
            placeholder="匿名"
            maxLength={20}
          />
        </div>

        <div className="input-group">
          <label className="input-label">
            说说现在的感受
            <span className="char-count">{content.length}/{MAX_CONTENT_LENGTH}</span>
          </label>
          <textarea
            ref={textareaRef}
            className="content-textarea"
            style={textareaStyle}
            value={content}
            onChange={handleContentChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="今天的心情怎么样？用一句话描述一下吧..."
            maxLength={MAX_CONTENT_LENGTH}
          />
        </div>

        <div className="input-group">
          <label className="input-label">关键词（可选，用逗号分隔）</label>
          <input
            type="text"
            className="keywords-input"
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            placeholder="例如：阳光, 咖啡, 工作"
          />
        </div>

        <motion.button
          className="submit-button"
          style={buttonStyle}
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          whileHover={{ filter: 'brightness(1.1)' }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'ease' }}
        >
          {isSubmitting ? '发布中...' : '发布情绪'}
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {successVisible && (
          <motion.div
            className="success-toast"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <span>✓ 发布成功！</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function getMoodEmoji(mood: MoodType): string {
  const emojis: Record<MoodType, string> = {
    happy: '😊',
    calm: '😌',
    anxious: '😰',
    sad: '😢',
    angry: '😠',
    tired: '😴',
  }
  return emojis[mood]
}

export default RecorderPanel
