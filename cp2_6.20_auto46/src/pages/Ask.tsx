import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { postQuestion } from '@/api'
import { ArrowLeft, Send, Tag, Loader2 } from 'lucide-react'
import { CURRENT_USER_ID, CURRENT_USER_NAME } from '@/App'

const PRESET_TAGS = ['生活求助', '物业信息', '育儿', '活动约伴', '物品求换', '维修', '教育咨询', '运动', '宠物', '快递']

export default function Ask() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const toggleTag = (t: string) => {
    setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const addCustomTag = () => {
    const t = customTag.trim()
    if (t && !tags.includes(t)) {
      setTags(prev => [...prev, t])
      setCustomTag('')
    }
  }

  const submit = async () => {
    if (!title.trim() || submitting) return
    setSubmitting(true)
    try {
      await postQuestion({
        title: title.trim(),
        content: content.trim(),
        tags,
        authorId: CURRENT_USER_ID,
        authorName: CURRENT_USER_NAME
      })
      navigate('/qa')
    } catch (e) {
      alert('发布失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="page-wrap"
    >
      <div className="ask-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        <span>返回问答</span>
      </div>

      <h1 className="page-title">发布新问题</h1>

      <div className="form-card">
        <label className="form-label">问题标题 <span className="req">*</span></label>
        <input
          className="form-input"
          placeholder="一句话描述你的问题..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={80}
        />
        <div className="form-hint">{title.length}/80</div>

        <label className="form-label">详细描述</label>
        <textarea
          className="form-textarea"
          placeholder="详细描述问题背景、你尝试过的方法等..."
          rows={6}
          value={content}
          onChange={e => setContent(e.target.value)}
        />

        <label className="form-label">
          <Tag size={14} /> 选择标签
        </label>
        <div className="tag-picker">
          {PRESET_TAGS.map(t => (
            <button
              key={t}
              className={`tag-pick ${tags.includes(t) ? 'active' : ''}`}
              onClick={() => toggleTag(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="custom-tag-row">
          <input
            className="form-input small"
            placeholder="自定义标签..."
            value={customTag}
            onChange={e => setCustomTag(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
          />
          <button className="tag-add-btn" onClick={addCustomTag}>+ 添加</button>
        </div>
        {tags.length > 0 && (
          <div className="selected-tags">
            {tags.map(t => (
              <span key={t} className="tag-pill active" onClick={() => toggleTag(t)}>
                <Tag size={11} />
                {t} ×
              </span>
            ))}
          </div>
        )}

        <button className="submit-btn" onClick={submit} disabled={!title.trim() || submitting}>
          {submitting ? <Loader2 className="spinner" size={18} /> : <Send size={18} />}
          发布问题
        </button>
      </div>
    </motion.div>
  )
}
