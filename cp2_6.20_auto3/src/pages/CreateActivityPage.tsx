import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../App'
import { createActivity } from '../api'
import { validateForm, getTypeEmoji } from '../utils'

const activityTypes = ['运动', '音乐', '读书', '桌游', '户外', '美食']

const getDefaultDateTime = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(19, 0, 0, 0)
  return tomorrow.toISOString().slice(0, 16)
}

interface CreateActivityPageProps {
  onSuccess: (message: string, type: 'success' | 'error' | 'info') => void
}

const CreateActivityPage = ({ onSuccess }: CreateActivityPageProps) => {
  const navigate = useNavigate()
  const { dispatch } = useAppContext()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    time: getDefaultDateTime(),
    location: '',
    maxParticipants: 10,
    type: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const data = {
      ...formData,
      time: new Date(formData.time).getTime()
    }

    const validation = validateForm(data)
    if (!validation.valid) {
      setErrors(validation.errors)
      return
    }

    setIsSubmitting(true)
    try {
      const newActivity = await createActivity(data)
      dispatch({ type: 'ADD_ACTIVITY', payload: newActivity })
      onSuccess('活动创建成功！', 'success')
      navigate('/')
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建活动失败'
      onSuccess(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      <div className="form-container">
        <div className="form-card">
          <h1 className="form-title">🎉 创建新活动</h1>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">活动标题 *</label>
              <input
                type="text"
                className={`input ${errors.title ? 'error' : ''}`}
                placeholder="输入活动标题"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
              {errors.title && <div className="error-text">{errors.title}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">活动描述</label>
              <textarea
                className="textarea"
                placeholder="介绍一下你的活动，吸引更多人参加..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">活动时间 *</label>
              <input
                type="datetime-local"
                className={`input ${errors.time ? 'error' : ''}`}
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
              {errors.time && <div className="error-text">{errors.time}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">活动地点 *</label>
              <input
                type="text"
                className={`input ${errors.location ? 'error' : ''}`}
                placeholder="输入活动地点"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
              />
              {errors.location && <div className="error-text">{errors.location}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">
                最大参与人数: <span className="slider-value">{formData.maxParticipants}</span> 人
              </label>
              <div className="slider-container">
                <input
                  type="range"
                  className="slider"
                  min="1"
                  max="50"
                  value={formData.maxParticipants}
                  onChange={(e) => handleChange('maxParticipants', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">活动类型 *</label>
              <select
                className={`select ${errors.type ? 'error' : ''}`}
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
              >
                <option value="">请选择活动类型</option>
                {activityTypes.map(type => (
                  <option key={type} value={type}>
                    {getTypeEmoji(type)} {type}
                  </option>
                ))}
              </select>
              {errors.type && <div className="error-text">{errors.type}</div>}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
                style={{ flex: 1 }}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ flex: 2 }}
              >
                {isSubmitting ? '创建中...' : '创建活动'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateActivityPage
