import React, { useState } from 'react'
import type { Activity, User } from '../types'

interface ActivityCardProps {
  activity: Activity
  currentUser: User | null
  onRegister: (activityId: string) => void
  index: number
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hours}:${minutes}`
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, currentUser, onRegister, index }) => {
  const [registering, setRegistering] = useState(false)
  const [error, setError] = useState('')

  const isFull = activity.registrants.length >= activity.maxParticipants
  const isDeadlinePassed = new Date(activity.registrationDeadline) < new Date()
  const isRegistered = currentUser ? activity.registrants.includes(currentUser.id) : false
  const disabled = isFull || isDeadlinePassed || isRegistered || !currentUser

  const handleRegister = async () => {
    if (disabled || !currentUser) return
    setRegistering(true)
    setError('')
    try {
      const res = await fetch(`/api/activities/${activity.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '报名失败')
      }
      onRegister(activity.id)
    } catch (err: any) {
      setError(err.message || '报名失败，请稍后重试')
    } finally {
      setRegistering(false)
    }
  }

  const animDelay = (index % 6) * 80

  return (
    <div
      className="fade-in"
      style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
        transition: 'var(--transition)',
        animationDelay: `${animDelay}ms`,
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = 'var(--shadow-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'var(--shadow)'
      }}
    >
      <div style={{ position: 'relative', paddingTop: '56.25%', overflow: 'hidden' }}>
        <img
          src={activity.coverImage}
          alt={activity.title}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.4s ease',
          }}
          onLoad={(e) => {
            (e.target as HTMLImageElement).style.opacity = '1'
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 225%22><rect fill=%22%23e8f5e9%22 width=%22400%22 height=%22225%22/><text x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%232b9348%22 font-size=%2224%22>🌿 志愿活动</text></svg>'
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            background: 'rgba(43, 147, 72, 0.95)',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          预计 {activity.estimatedHours} 工时
        </div>
        {isRegistered && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              background: 'rgba(43, 147, 72, 0.95)',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            已报名
          </div>
        )}
      </div>

      <div style={{ padding: '16px 18px 20px' }}>
        <h3
          style={{
            fontSize: 17,
            fontWeight: 600,
            marginBottom: 10,
            lineHeight: 1.4,
            color: 'var(--text)',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {activity.title}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-light)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {formatDate(activity.date)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-light)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {activity.location}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-light)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>
              <span style={{ color: isFull ? '#e74c3c' : 'var(--primary)', fontWeight: 600 }}>
                {activity.registrants.length}
              </span>
              <span style={{ opacity: 0.6 }}>/{activity.maxParticipants} 人</span>
            </span>
          </div>
        </div>

        {error && (
          <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 10 }}>{error}</div>
        )}

        <button
          onClick={handleRegister}
          disabled={disabled || registering}
          style={{
            width: '100%',
            padding: '11px 0',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            transition: 'var(--transition)',
            background: disabled
              ? isFull || isDeadlinePassed
                ? '#b2bec3'
                : isRegistered
                ? 'linear-gradient(135deg, #2b9348, #007f5f)'
                : '#dfe6e9'
              : 'linear-gradient(135deg, #2b9348, #007f5f)',
            color: '#fff',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: isRegistered ? 0.9 : 1,
          }}
        >
          {registering
            ? '报名中...'
            : isFull
            ? '已满'
            : isDeadlinePassed
            ? '已截止'
            : isRegistered
            ? '已报名 ✓'
            : '立即报名'}
        </button>
      </div>
    </div>
  )
}

export default ActivityCard
