import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Plus, X, Clock, Users, Vote, Copy, Check } from 'lucide-react'
import usePollStore from '@/store/pollStore'
import type { Poll } from '../../shared/types'

export default function PollList() {
  const navigate = useNavigate()
  const { polls, setPolls, error, setError } = usePollStore()
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [deadline, setDeadline] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchPolls()
  }, [])

  const fetchPolls = async () => {
    try {
      const res = await axios.get<Poll[]>('/api/polls')
      setPolls(res.data)
    } catch {
      setError('获取投票列表失败')
    }
  }

  const addOption = () => {
    setOptions([...options, ''])
  }

  const removeOption = (index: number) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== index))
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
    if (validationErrors[`option_${index}`]) {
      const newErrors = { ...validationErrors }
      delete newErrors[`option_${index}`]
      setValidationErrors(newErrors)
    }
  }

  const validate = (): boolean => {
    const errors: Record<string, string> = {}
    if (!title.trim() || title.length > 50) {
      errors.title = '请填写完整信息'
    }
    options.forEach((opt, i) => {
      if (!opt.trim() || opt.length > 30) {
        errors[`option_${i}`] = '请填写完整信息'
      }
    })
    const filledOptions = options.filter((o) => o.trim())
    if (filledOptions.length < 2) {
      errors.options = '至少需要2个选项'
    }
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return
    try {
      const filledOptions = options.filter((o) => o.trim())
      const res = await axios.post<Poll>('/api/poll', {
        title: title.trim(),
        options: filledOptions,
        deadline: deadline || undefined,
      })
      setTitle('')
      setOptions(['', ''])
      setDeadline('')
      setValidationErrors({})
      navigate(`/vote/${res.data.id}`)
    } catch {
      setError('创建投票失败')
    }
  }

  const copyLink = (pollId: string) => {
    const link = `${window.location.origin}/vote/${pollId}`
    navigator.clipboard.writeText(link)
    setCopiedId(pollId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const isPollExpired = (poll: Poll) => {
    if (poll.isClosed) return true
    if (poll.deadline && new Date(poll.deadline) < new Date()) return true
    return false
  }

  const totalVotes = (poll: Poll) => poll.options.reduce((sum, o) => sum + o.votes, 0)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="poll-list-container">
      <div className="poll-list-left">
        <div className="create-section">
          <h2 className="create-title">
            <Vote size={22} />
            创建投票
          </h2>

          <div className="form-group">
            <label className="form-label">投票标题</label>
            <input
              type="text"
              className={`form-input ${validationErrors.title ? 'form-input-error' : ''}`}
              placeholder="输入投票标题（最多50字）"
              value={title}
              maxLength={50}
              onChange={(e) => {
                setTitle(e.target.value)
                if (validationErrors.title) {
                  const ne = { ...validationErrors }
                  delete ne.title
                  setValidationErrors(ne)
                }
              }}
            />
            {validationErrors.title && <span className="form-error">请填写完整信息</span>}
            <span className="form-count">{title.length}/50</span>
          </div>

          <div className="form-group">
            <label className="form-label">投票选项</label>
            {options.map((opt, i) => (
              <div key={i} className="option-input-row">
                <input
                  type="text"
                  className={`form-input ${validationErrors[`option_${i}`] ? 'form-input-error' : ''}`}
                  placeholder={`选项 ${i + 1}（最多30字）`}
                  value={opt}
                  maxLength={30}
                  onChange={(e) => updateOption(i, e.target.value)}
                />
                {options.length > 2 && (
                  <button className="option-remove-btn" onClick={() => removeOption(i)}>
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {validationErrors.options && <span className="form-error">至少需要2个选项</span>}
            <button className="add-option-btn" onClick={addOption}>
              <Plus size={16} />
              添加选项
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">截止时间（可选）</label>
            <input
              type="datetime-local"
              className="form-input"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <button className="create-btn" onClick={handleCreate}>
            创建投票
          </button>

          {error && <div className="global-error">{error}</div>}
        </div>
      </div>

      <div className="poll-list-right">
        <h2 className="list-title">投票列表</h2>
        {polls.length === 0 ? (
          <div className="empty-state">
            <Vote size={48} strokeWidth={1} />
            <p>暂无投票，创建一个吧！</p>
          </div>
        ) : (
          <div className="poll-cards">
            {polls.map((poll) => {
              const expired = isPollExpired(poll)
              const votes = totalVotes(poll)
              return (
                <div
                  key={poll.id}
                  className={`poll-card ${expired ? 'poll-card-closed' : ''}`}
                  onClick={() => navigate(`/vote/${poll.id}`)}
                >
                  <div className="poll-card-header">
                    <h3 className="poll-card-title">{poll.title}</h3>
                    <span className={`poll-status ${expired ? 'poll-status-closed' : 'poll-status-active'}`}>
                      {expired ? '已结束' : '进行中'}
                    </span>
                  </div>
                  <div className="poll-card-meta">
                    <span className="poll-meta-item">
                      <Users size={14} />
                      {votes} 票
                    </span>
                    {poll.deadline && (
                      <span className="poll-meta-item">
                        <Clock size={14} />
                        {formatDate(poll.deadline)}
                      </span>
                    )}
                  </div>
                  <div className="poll-card-options">
                    {poll.options.map((opt) => (
                      <span key={opt.id} className="poll-option-tag">
                        {opt.text}
                      </span>
                    ))}
                  </div>
                  <button
                    className="copy-link-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      copyLink(poll.id)
                    }}
                  >
                    {copiedId === poll.id ? <Check size={14} /> : <Copy size={14} />}
                    {copiedId === poll.id ? '已复制' : '复制链接'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
