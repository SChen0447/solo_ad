import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Activity } from '../types'
import { registerActivity, likeActivity } from '../api'
import { useAppContext } from '../App'
import { formatTime, getProgressColor, getTypeEmoji } from '../utils'

interface ActivityCardProps {
  activity: Activity
  isNew?: boolean
}

const ActivityCard = ({ activity, isNew }: ActivityCardProps) => {
  const navigate = useNavigate()
  const { state, dispatch } = useAppContext()
  const [isRegistering, setIsRegistering] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [heartAnimating, setHeartAnimating] = useState(false)

  const currentUserId = state.currentUser.id
  const isRegistered = activity.participants.some(p => p.id === currentUserId)
  const isLiked = activity.likedBy.includes(currentUserId)
  const isFull = activity.participants.length >= activity.maxParticipants
  const progressPercent = (activity.participants.length / activity.maxParticipants) * 100

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.card-footer')) return
    navigate(`/activity/${activity.id}`)
  }

  const handleRegister = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isRegistering || isFull) return

    setIsRegistering(true)
    try {
      const result = await registerActivity(activity.id, currentUserId)
      dispatch({ type: 'UPDATE_ACTIVITY', payload: result.activity })
    } catch (error) {
      console.error('报名失败:', error)
    } finally {
      setIsRegistering(false)
    }
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLiking) return

    setIsLiking(true)
    setHeartAnimating(true)
    setTimeout(() => setHeartAnimating(false), 200)

    try {
      const result = await likeActivity(activity.id, currentUserId)
      dispatch({ type: 'UPDATE_ACTIVITY', payload: result.activity })
    } catch (error) {
      console.error('点赞失败:', error)
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
    if (isFull && !isRegistered) return '已满'
    if (isRegistered) return '已报名'
    if (isRegistering) return '报名中...'
    return '立即报名'
  }

  return (
    <div
      className={`card activity-card ${isNew ? 'card-enter card-enter-active' : ''}`}
      onClick={handleCardClick}
    >
      <div className="card-cover" style={{ background: activity.coverColor }}>
        <span className="card-type-tag">{getTypeEmoji(activity.type)} {activity.type}</span>
        <span>{getTypeEmoji(activity.type)}</span>
      </div>

      <div className="card-body">
        <h3 className="card-title">{activity.title}</h3>

        <div className="card-info">
          <div className="card-info-item">
            <span>📅</span>
            <span>{formatTime(activity.time)}</span>
          </div>
          <div className="card-info-item">
            <span>📍</span>
            <span>{activity.location}</span>
          </div>
        </div>

        <div className="progress-container">
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
            <span>已报名 {activity.participants.length}/{activity.maxParticipants} 人</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
        </div>

        <div className="card-footer">
          <button
            className={getButtonClass()}
            onClick={handleRegister}
            disabled={isRegistering || (isFull && !isRegistered)}
          >
            {getButtonText()}
          </button>

          <button
            className={`like-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleLike}
            disabled={isLiking}
          >
            <span className={`like-icon ${heartAnimating ? 'heart-animation' : ''}`}>
              {isLiked ? '❤️' : '🤍'}
            </span>
            <span>{activity.likes}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ActivityCard
