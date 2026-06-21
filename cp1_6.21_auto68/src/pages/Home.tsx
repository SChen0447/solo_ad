import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActivity } from '../App'
import { Activity } from '../types'

const Home = () => {
  const navigate = useNavigate()
  const { setCurrentActivity } = useActivity()
  const [activities, setActivities] = useState<Activity[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    meetingPoint: '',
    estimatedDuration: 120,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    maxMembers: 12
  })

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activities')
      if (response.ok) {
        const data = await response.json()
        setActivities(data)
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateActivity = async () => {
    if (!formData.name || !formData.meetingPoint) {
      alert('请填写活动名称和集合地点')
      return
    }

    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        setShowCreateModal(false)
        setFormData({
          name: '',
          meetingPoint: '',
          estimatedDuration: 120,
          difficulty: 'medium',
          maxMembers: 12
        })
        fetchActivities()
        alert(`活动创建成功！活动码：${data.code}`)
      }
    } catch (error) {
      console.error('Failed to create activity:', error)
      alert('创建活动失败')
    }
  }

  const handleJoinActivity = async () => {
    if (!joinCode || joinCode.length !== 6) {
      alert('请输入6位活动码')
      return
    }

    const memberName = prompt('请输入您的姓名：')
    if (!memberName) return

    const emergencyContact = prompt('请输入紧急联系人电话（可选）：') || ''

    try {
      const response = await fetch(`/api/activities/${joinCode.toUpperCase()}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: memberName,
          emergencyContact
        })
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentActivity(data.activity)
        navigate(`/activity/${joinCode.toUpperCase()}`)
      } else {
        const error = await response.json()
        alert(error.error || '加入活动失败')
      }
    } catch (error) {
      console.error('Failed to join activity:', error)
      alert('加入活动失败，请检查活动码是否正确')
    }
  }

  const handleActivityClick = (activity: Activity) => {
    setCurrentActivity(activity)
    navigate(`/activity/${activity.code}`)
  }

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '简单'
      case 'medium': return '中等'
      case 'hard': return '困难'
      default: return difficulty
    }
  }

  const shouldShowBell = (activity: Activity) => {
    return activity.members.length / activity.maxMembers >= 0.8
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}分钟`
    if (mins === 0) return `${hours}小时`
    return `${hours}小时${mins}分钟`
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">🏔️ 徒步活动</h1>
      </div>

      <div className="join-activity-section card">
        <div className="panel-title">加入活动</div>
        <div className="join-input-group">
          <input
            type="text"
            className="form-input join-input"
            placeholder="输入6位活动码"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button className="btn btn-primary" onClick={handleJoinActivity}>
            加入
          </button>
        </div>
      </div>

      <div className="page-header" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>活动列表</h2>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">⏳</div>
          <div className="empty-state-text">加载中...</div>
        </div>
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🚶</div>
          <div className="empty-state-text">暂无活动，点击右下角按钮创建</div>
        </div>
      ) : (
        <div className="activities-grid">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={`activity-card ${activity.difficulty}`}
              onClick={() => handleActivityClick(activity)}
            >
              <div className="activity-card-header">
                <div className="activity-card-count">
                  {activity.members.length}/{activity.maxMembers}人
                </div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>
                  {getDifficultyText(activity.difficulty)}
                </div>
              </div>
              <div className="activity-card-body">
                <div className="activity-card-title">{activity.name}</div>
                <div className="activity-card-info">
                  <span>📍 {activity.meetingPoint}</span>
                  <span>⏱️ {formatDuration(activity.estimatedDuration)}</span>
                </div>
              </div>
              {shouldShowBell(activity) && (
                <div className="bell-icon">🔔</div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        className="create-activity-btn"
        onClick={() => setShowCreateModal(true)}
      >
        +
      </button>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">创建新活动</div>

            <div className="form-group">
              <label className="form-label">活动名称</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如：周末香山徒步"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">集合地点</label>
              <input
                type="text"
                className="form-input"
                placeholder="例如：香山公园东门"
                value={formData.meetingPoint}
                onChange={(e) => setFormData({ ...formData, meetingPoint: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">预计用时（分钟）</label>
              <input
                type="number"
                className="form-input"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">难度等级</label>
              <select
                className="form-select"
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
              >
                <option value="easy">简单 - 苔绿色</option>
                <option value="medium">中等 - 橙黄色</option>
                <option value="hard">困难 - 砖红色</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">最大人数</label>
              <input
                type="number"
                className="form-input"
                value={formData.maxMembers}
                onChange={(e) => setFormData({ ...formData, maxMembers: parseInt(e.target.value) || 12 })}
              />
            </div>

            <div className="form-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateActivity}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
