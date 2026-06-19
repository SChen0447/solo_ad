import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useNotification } from '../components/Notification'

export function CreatePoll() {
  const navigate = useNavigate()
  const { showNotification } = useNotification()

  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [hasDeadline, setHasDeadline] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const addOption = () => {
    if (options.length >= 10) {
      showNotification('error', '最多只能添加10个选项')
      return
    }
    setOptions([...options, ''])
  }

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      showNotification('error', '至少需要2个选项')
      return
    }
    setOptions(options.filter((_, i) => i !== index))
  }

  const updateOption = (index: number, value: string) => {
    const next = [...options]
    next[index] = value
    setOptions(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      showNotification('error', '请输入投票标题')
      return
    }

    const trimmedOpts = options.map(o => o.trim())
    const emptyIdx = trimmedOpts.findIndex(o => o.length === 0)
    if (emptyIdx !== -1) {
      showNotification('error', `第 ${emptyIdx + 1} 个选项不能为空`)
      return
    }

    if (hasDeadline && !deadline) {
      showNotification('error', '请选择截止时间')
      return
    }

    if (hasDeadline && deadline) {
      const dl = new Date(deadline).getTime()
      if (dl <= Date.now()) {
        showNotification('error', '截止时间必须晚于当前时间')
        return
      }
    }

    setSubmitting(true)
    try {
      const poll = await api.createPoll({
        title: title.trim(),
        options: trimmedOpts,
        deadline: hasDeadline ? deadline : undefined
      })

      const tokens = JSON.parse(localStorage.getItem('creatorTokens') || '{}')
      tokens[poll.id] = poll.creatorToken
      localStorage.setItem('creatorTokens', JSON.stringify(tokens))

      showNotification('success', '投票创建成功！')
      navigate(`/poll/${poll.id}`)
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const getMinDeadline = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 5)
    return now.toISOString().slice(0, 16)
  }

  return (
    <div>
      <h2 className="page-title">创建新投票</h2>

      <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 700 }}>
        <div className="form-group">
          <label className="form-label">投票标题 *</label>
          <input
            type="text"
            className="form-input"
            placeholder="请输入投票标题"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            投票选项 * <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>({options.length}/10)</span>
          </label>
          <span className="form-info">至少2个选项，最多10个选项</span>

          <div style={{ marginTop: 12 }}>
            {options.map((opt, idx) => (
              <div key={idx} className="option-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder={`选项 ${idx + 1}`}
                  value={opt}
                  onChange={e => updateOption(idx, e.target.value)}
                  maxLength={50}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => removeOption(idx)}
                  disabled={options.length <= 2}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={addOption}
            disabled={options.length >= 10}
            style={{ marginTop: 8 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            添加选项
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">
            <input
              type="checkbox"
              checked={hasDeadline}
              onChange={e => setHasDeadline(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            设置投票截止时间（可选）
          </label>
          {hasDeadline && (
            <input
              type="datetime-local"
              className="form-input"
              value={deadline}
              min={getMinDeadline()}
              onChange={e => setDeadline(e.target.value)}
              style={{ marginTop: 8, maxWidth: 320 }}
            />
          )}
        </div>

        <div className="btn-row" style={{ marginTop: 28 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
          >
            取消
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? '创建中...' : '创建投票'}
          </button>
        </div>
      </form>
    </div>
  )
}
