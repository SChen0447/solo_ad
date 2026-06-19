import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, MapPin, Clock, Users } from 'lucide-react'
import { type Activity, useAppContext } from '@/App'

interface ActivityCardProps {
  activity: Activity
  isNew?: boolean
}

function getProgressColor(percent: number): string {
  if (percent < 60) return '#4ECDC4'
  if (percent < 85) return '#F39C12'
  return '#FF6B6B'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hours}:${mins}`
}

export default function ActivityCard({ activity, isNew }: ActivityCardProps) {
  const navigate = useNavigate()
  const { state, updateActivity, showToast } = useAppContext()
  const [likeAnimating, setLikeAnimating] = useState(false)
  const isRegistered = activity.registrations.some(r => r.userId === state.currentUser.id)
  const isLiked = activity.likes.includes(state.currentUser.id)
  const isFull = activity.registrations.length >= activity.maxParticipants
  const percent = Math.round((activity.registrations.length / activity.maxParticipants) * 100)

  const handleCardClick = () => {
    navigate(`/activity/${activity.id}`)
  }

  const handleRegister = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isFull || isRegistered) return
    try {
      const res = await fetch(`/api/activities/${activity.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        updateActivity(data)
        showToast('报名成功！')
      } else {
        showToast(data.message || '报名失败', 'error')
      }
    } catch {
      showToast('网络错误', 'error')
    }
  }, [activity.id, isFull, isRegistered, state.currentUser, updateActivity, showToast])

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLikeAnimating(true)
    setTimeout(() => setLikeAnimating(false), 200)
    try {
      const res = await fetch(`/api/activities/${activity.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.currentUser.id }),
      })
      const data = await res.json()
      if (res.ok) {
        updateActivity(data)
      }
    } catch {
      showToast('网络错误', 'error')
    }
  }, [activity.id, state.currentUser.id, updateActivity, showToast])

  return (
    <div
      className={`activity-card ${isNew ? 'card-slide-in' : ''}`}
      onClick={handleCardClick}
    >
      <div className="activity-card-cover" style={{ background: `linear-gradient(135deg, ${activity.coverColor}, ${activity.coverColor}dd)` }}>
        <span className="activity-card-type-badge">{activity.type}</span>
      </div>
      <div className="activity-card-body">
        <h3 className="activity-card-title">{activity.title}</h3>
        <div className="activity-card-info">
          <span><Clock size={14} /> {formatDate(activity.time)}</span>
          <span><MapPin size={14} /> {activity.location}</span>
        </div>
        <div className="activity-card-progress">
          <div className="activity-card-progress-header">
            <span><Users size={12} /> {activity.registrations.length}/{activity.maxParticipants}人</span>
            <span>{percent}%</span>
          </div>
          <div className="activity-card-progress-bar">
            <div
              className="activity-card-progress-fill"
              style={{
                width: `${percent}%`,
                background: getProgressColor(percent),
              }}
            />
          </div>
        </div>
        <div className="activity-card-footer">
          <button
            className={`activity-card-like ${isLiked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <span className={`activity-card-like-icon ${likeAnimating ? 'like-pulse' : ''}`}>
              <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
            </span>
            {activity.likes.length}
          </button>
          {isFull ? (
            <button className="activity-card-register-btn full" disabled>
              已满
            </button>
          ) : isRegistered ? (
            <button className="activity-card-register-btn registered">
              已报名
            </button>
          ) : (
            <button className="activity-card-register-btn" onClick={handleRegister}>
              报名
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
