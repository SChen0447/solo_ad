import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Activity } from '../types'
import { fetchActivity, registerActivity, likeActivity } from '../api'
import { useAppContext } from '../App'
import CommentSection from '../components/CommentSection'
import { formatDateTime, getTypeEmoji, getProgressColor } from '../utils'

interface ActivityDetailPageProps {
  onActivityUpdate: (activity: Activity) => void
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
}

const ActivityDetailPage = ({ onActivityUpdate, showToast }: ActivityDetailPageProps) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state } = useAppContext()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [heartAnimating, setHeartAnimating] = useState(false)

  useEffect(() => {
    if (!id) return

    const cached = state.activities.find(a => a.id === id)
    if (cached) {
      setActivity(cached)
      setLoading(false)
    }

    const loadActivity = async () => {
      try {
        const data = await fetchActivity(id)
        setActivity(data)
      } catch (error) {
        showToast('加载活动详情失败', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadActivity()
  }, [id, state.activities, showToast])

  if (!id) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <p>活动不存在</p>
          <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: '16px' }}>
            返回首页
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <p>活动不存在或已被删除</p>
          <button className="btn btn-primary" onClick={() => navigate('/')} style={{ marginTop: '16px' }}>
            返回首页
          </button>
        </div>
      </div>
    )
  }

  const currentUserId = state.currentUser.id
  const isRegistered = activity.participants.some(p => p.id === currentUserId)
  const isLiked = activity.likedBy.includes(currentUserId)
  const isFull = activity.participants.length >= activity.maxParticipants
  const progressPercent = (activity.participants.length / activity.maxParticipants) * 100

  const handleRegister = async () => {
    if (isRegistering || (isFull && !isRegistered)) return

    setIsRegistering(true)
    try {
      const result = await registerActivity(activity.id, currentUserId)
      setActivity(result.activity)
      onActivityUpdate(result.activity)
      showToast(result.isRegistered ? '报名成功！' : '已取消报名', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : '操作失败'
      showToast(message, 'error')
    } finally {
      setIsRegistering(false)
    }
  }

  const handleLike = async () => {
    if (isLiking) return

    setIsLiking(true)
    setHeartAnimating(true)
    setTimeout(() => setHeartAnimating(false), 200)

    try {
      const result = await likeActivity(activity.id, currentUserId)
      setActivity(result.activity)
      onActivityUpdate(result.activity)
    } catch (error) {
      showToast('操作失败', 'error')
    } finally {
      setIsLiking(false)
    }
  }

  const getButtonClass = () => {
    if (isFull && !isRegistered) return 'btn btn-disabled'
    if (isRegistered) return 'btn btn-success'
    return 'btn btn-primary'
  }

  const getButtonText = () => {
    if (isFull && !isRegistered) return '名额已满'
    if (isRegistered) return '已报名 ✓'
    if (isRegistering) return '处理中...'
    return '立即报名'
  }

  return (
    <div className="page-container">
      <div className="detail-card">
        <div className="detail-cover" style={{ background: activity.coverColor }}>
          <span className="card-type-tag">{getTypeEmoji(activity.type)} {activity.type}</span>
          <span>{getTypeEmoji(activity.type)}</span>
        </div>

        <div className="detail-content">
          <h1 className="detail-title">{activity.title}</h1>

          <div className="detail-info">
            <div className="detail-info-item">
              <span className="detail-info-icon">📅</span>
              <div>
                <div className="detail-info-text">活动时间</div>
                <div className="detail-info-value">{formatDateTime(activity.time)}</div>
              </div>
            </div>
            <div className="detail-info-item">
              <span className="detail-info-icon">📍</span>
              <div>
                <div className="detail-info-text">活动地点</div>
                <div className="detail-info-value">{activity.location}</div>
              </div>
            </div>
            <div className="detail-info-item">
              <span className="detail-info-icon">👥</span>
              <div>
                <div className="detail-info-text">参与人数</div>
                <div className="detail-info-value">
                  {activity.participants.length} / {activity.maxParticipants} 人
                </div>
              </div>
            </div>
          </div>

          <div className="progress-container" style={{ marginBottom: '24px' }}>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${progressPercent}%`,
                  background: getProgressColor(activity.participants.length, activity.maxParticipants)
                }}
              />
            </div>
            <div className="progress-text">
              <span>报名进度</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
          </div>

          <p className="detail-description">
            {activity.description || '暂无活动描述'}
          </p>

          {activity.participants.length > 0 && (
            <div className="participants-section">
              <h3 className="participants-title">
                👥 已报名 ({activity.participants.length}/{activity.maxParticipants})
              </h3>
              <div className="participants-list">
                {activity.participants.map((participant, index) => (
                  <img
                    key={participant.id}
                    src={participant.avatar}
                    alt={participant.name}
                    className="participant-avatar"
                    title={participant.name}
                    style={{ zIndex: activity.participants.length - index }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="detail-actions">
            <button
              className={getButtonClass()}
              onClick={handleRegister}
              disabled={isRegistering || (isFull && !isRegistered)}
              style={{ flex: 1, maxWidth: '200px' }}
            >
              {getButtonText()}
            </button>

            <button
              className={`like-btn ${isLiked ? 'liked' : ''}`}
              onClick={handleLike}
              disabled={isLiking}
              style={{ padding: '12px 24px', fontSize: '16px' }}
            >
              <span className={`like-icon ${heartAnimating ? 'heart-animation' : ''}`} style={{ fontSize: '24px' }}>
                {isLiked ? '❤️' : '🤍'}
              </span>
              <span>{activity.likes} 人感兴趣</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
            >
              ← 返回
            </button>
          </div>
        </div>
      </div>

      <CommentSection
        activityId={activity.id}
        comments={activity.comments}
      />
    </div>
  )
}

export default ActivityDetailPage
