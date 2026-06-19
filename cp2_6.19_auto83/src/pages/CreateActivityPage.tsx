import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '@/App'

type ActivityType = '运动' | '音乐' | '读书' | '桌游' | '户外' | '美食'

const activityTypes: ActivityType[] = ['运动', '音乐', '读书', '桌游', '户外', '美食']

interface FormErrors {
  title?: string
  time?: string
  location?: string
}

export default function CreateActivityPage() {
  const navigate = useNavigate()
  const { state, showToast, dispatch } = useAppContext()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(10)
  const [type, setType] = useState<ActivityType>('户外')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const validate = (): boolean => {
    const newErrors: FormErrors = {}
    if (!title.trim()) {
      newErrors.title = '活动标题不能为空'
    }
    if (!time) {
      newErrors.time = '请选择活动时间'
    } else if (new Date(time) < new Date()) {
      newErrors.time = '活动时间不能早于当前时间'
    }
    if (!location.trim()) {
      newErrors.location = '活动地点不能为空'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          time: new Date(time).toISOString(),
          location: location.trim(),
          maxParticipants,
          type,
          creatorId: state.currentUser.id,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        dispatch({ type: 'ADD_ACTIVITY', payload: data })
        showToast('活动创建成功！')
        navigate('/')
      } else {
        showToast(data.message || '创建失败', 'error')
      }
    } catch {
      showToast('网络错误', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container">
      <form className="create-form" onSubmit={handleSubmit}>
        <h1 className="page-title">创建新活动</h1>

        <div className="form-group">
          <label className="form-label">活动标题 *</label>
          <input
            className={`form-input ${errors.title ? 'error' : ''}`}
            type="text"
            value={title}
            onChange={e => { setTitle(e.target.value); if (errors.title) setErrors(prev => ({ ...prev, title: undefined })) }}
            placeholder="给你的活动起个名字"
          />
          {errors.title && <div className="form-error">{errors.title}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">活动描述</label>
          <textarea
            className="form-textarea"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="详细描述你的活动内容..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">活动时间 *</label>
          <input
            className={`form-input ${errors.time ? 'error' : ''}`}
            type="datetime-local"
            value={time}
            onChange={e => { setTime(e.target.value); if (errors.time) setErrors(prev => ({ ...prev, time: undefined })) }}
          />
          {errors.time && <div className="form-error">{errors.time}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">活动地点 *</label>
          <input
            className={`form-input ${errors.location ? 'error' : ''}`}
            type="text"
            value={location}
            onChange={e => { setLocation(e.target.value); if (errors.location) setErrors(prev => ({ ...prev, location: undefined })) }}
            placeholder="活动在哪里举办？"
          />
          {errors.location && <div className="form-error">{errors.location}</div>}
        </div>

        <div className="form-group">
          <label className="form-label">最大人数：{maxParticipants}人</label>
          <input
            className="form-range"
            type="range"
            min={1}
            max={50}
            value={maxParticipants}
            onChange={e => setMaxParticipants(Number(e.target.value))}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#B2BEC3', marginTop: '4px' }}>
            <span>1</span>
            <span>50</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">活动类型</label>
          <select
            className="form-select"
            value={type}
            onChange={e => setType(e.target.value as ActivityType)}
          >
            {activityTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button className="btn-primary" type="submit" disabled={submitting} style={{ flex: 1 }}>
            {submitting ? '提交中...' : '创建活动'}
          </button>
          <button className="btn-secondary" type="button" onClick={() => navigate('/')} style={{ flex: 0 }}>
            取消
          </button>
        </div>
      </form>
    </div>
  )
}
