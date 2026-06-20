import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Activity } from '../types'
import { DifficultyLabels, ActivityTypeLabels } from '../types'

interface ActivityCardProps {
  activity: Activity
  onRegister?: (id: string) => void
  isRegistered?: boolean
  isNew?: boolean
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onRegister, isRegistered, isNew }) => {
  const navigate = useNavigate()
  const currentCount = activity.participants.length
  const maxCount = activity.maxParticipants
  const full = currentCount >= maxCount
  const progress = Math.min((currentCount / maxCount) * 100, 100)
  const dateObj = new Date(activity.date)
  const dateStr = dateObj.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
  const timeStr = dateObj.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const diffInfo = DifficultyLabels[activity.difficulty]

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.register-btn')) {
      navigate(`/activity/${activity.id}`)
    }
  }

  const handleRegister = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRegister && !full) onRegister(activity.id)
  }

  const btnClass = full
    ? 'register-btn btn-disabled'
    : isRegistered
    ? 'register-btn btn-registered'
    : 'register-btn btn-primary'

  const btnText = full ? '人数已满' : isRegistered ? '已报名' : '立即报名'

  return (
    <div
      className={`activity-card ${isNew ? 'card-new' : ''}`}
      onClick={handleClick}
    >
      <div className="card-cover">
        <img src={activity.coverImage} alt={activity.title} />
        <div className="card-type-tag">{ActivityTypeLabels[activity.type]}</div>
        <div
          className="card-difficulty-tag"
          style={{ backgroundColor: diffInfo.color }}
        >
          {diffInfo.label}
        </div>
      </div>
      <div className="card-body">
        <h4 className="card-title">{activity.title}</h4>
        <div className="card-meta">
          <span className="meta-item">
            <span className="meta-icon">📅</span>
            {dateStr} {timeStr}
          </span>
          <span className="meta-item">
            <span className="meta-icon">📍</span>
            {activity.location}
          </span>
        </div>
        <div className="card-progress-wrap">
          <div className="card-progress-bar">
            <div
              className="card-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="card-progress-text">
            {currentCount}/{maxCount} 人
          </span>
        </div>
        <button
          className={btnClass}
          onClick={handleRegister}
          disabled={full}
        >
          {btnText}
        </button>
      </div>
    </div>
  )
}

export default ActivityCard
