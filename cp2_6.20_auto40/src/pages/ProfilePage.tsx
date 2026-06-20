import React, { useState, useEffect } from 'react'
import { api } from '../api'
import type { User, Achievement, Activity } from '../types'
import { ActivityTypeLabels } from '../types'

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userActivities, setUserActivities] = useState<Activity[]>([])
  const [activeTab, setActiveTab] = useState<'calendar' | 'achievement'>('calendar')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hoveredDot, setHoveredDot] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    try {
      const [u, a, acts] = await Promise.all([
        api.getUser(),
        api.getAchievements(),
        api.getUserActivities()
      ])
      setUser(u)
      setAchievements(a)
      setUserActivities(acts)
    } catch (e) {
      console.error(e)
    }
  }

  if (!user) {
    return <div className="loading-state">加载中...</div>
  }

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < startWeekday; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  const activitiesByDate: Record<string, Activity[]> = {}
  userActivities.forEach(a => {
    const d = new Date(a.date)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!activitiesByDate[key]) activitiesByDate[key] = []
    activitiesByDate[key].push(a)
  })

  const totalParticipated = user.completedActivities.length + user.registeredActivities.length
  const unlockedCount = achievements.filter(a => a.unlocked).length

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1))

  const typeColors: Record<string, string> = {
    hiking: '#2D6A4F',
    camping: '#8B4513',
    climbing: '#f5222d',
    cycling: '#6B8E23',
    running: '#F4A460',
    swimming: '#1890ff'
  }

  const handleDotMouseEnter = (actId: string, e: React.MouseEvent) => {
    setHoveredDot(actId)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 10 })
  }

  const hoveredActivity = hoveredDot ? userActivities.find(a => a.id === hoveredDot) : null

  return (
    <div className="page-container page-fade-in">
      <div className="profile-header">
        <div className="profile-avatar-wrap">
          <img src={user.avatar} alt={user.name} className="profile-avatar" />
          <div className="avatar-badge">🌿</div>
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{user.name}</h2>
          <p className="profile-bio">{user.bio}</p>
          <div className="profile-stats">
            <div className="stat-item">
              <div className="stat-value">{totalParticipated}</div>
              <div className="stat-label">参与活动</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value">{user.totalBorrows}</div>
              <div className="stat-label">借用装备</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value">{unlockedCount}/{achievements.length}</div>
              <div className="stat-label">成就解锁</div>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <div className="stat-value">{new Date(user.joinDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</div>
              <div className="stat-label">加入时间</div>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs-wrap">
        <div className="tabs-nav">
          <button
            className={`tab-btn ${activeTab === 'calendar' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            📅 活动日历
          </button>
          <button
            className={`tab-btn ${activeTab === 'achievement' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('achievement')}
          >
            🏆 成就徽章
          </button>
        </div>

        <div className={`tab-panel ${activeTab === 'calendar' ? 'panel-show' : ''}`}>
          <div className="calendar-wrap">
            <div className="calendar-header">
              <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
              <h3 className="cal-title">
                {year}年 {month + 1}月
              </h3>
              <button className="cal-nav-btn" onClick={nextMonth}>›</button>
            </div>

            <div className="calendar-weekdays">
              {['日', '一', '二', '三', '四', '五', '六'].map(w => (
                <div key={w} className="cal-weekday">{w}</div>
              ))}
            </div>

            <div className="calendar-grid">
              {calendarDays.map((d, idx) => {
                if (d === null) return <div key={`empty-${idx}`} className="cal-cell cal-cell-empty" />
                const key = `${year}-${month}-${d}`
                const dayActs = activitiesByDate[key] || []
                const today = new Date()
                const isToday = year === today.getFullYear() && month === today.getMonth() && d === today.getDate()
                return (
                  <div key={d} className={`cal-cell ${isToday ? 'cal-cell-today' : ''}`}>
                    <span className="cal-day-num">{d}</span>
                    {dayActs.length > 0 && (
                      <div className="cal-dots">
                        {dayActs.slice(0, 3).map(act => (
                          <span
                            key={act.id}
                            className="cal-dot"
                            style={{ backgroundColor: typeColors[act.type] || '#2D6A4F' }}
                            onMouseEnter={(e) => handleDotMouseEnter(act.id, e)}
                            onMouseLeave={() => setHoveredDot(null)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="cal-legend">
              {(Object.keys(typeColors) as (keyof typeof typeColors)[]).map(t => (
                <div key={t} className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: typeColors[t] }} />
                  <span>{ActivityTypeLabels[t]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="upcoming-list">
            <h4 className="section-subtitle">📌 我的活动</h4>
            {userActivities.length === 0 ? (
              <p className="empty-sub">暂无参与的活动</p>
            ) : (
              <div className="activity-mini-list">
                {userActivities
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map(act => {
                    const dt = new Date(act.date)
                    const ended = act.status === 'ended' || dt < new Date()
                    return (
                      <div key={act.id} className={`activity-mini-item ${ended ? 'mini-ended' : ''}`}>
                        <div className="mini-date-col">
                          <div className="mini-day">{dt.getDate()}</div>
                          <div className="mini-month">{dt.toLocaleDateString('zh-CN', { month: 'short' })}</div>
                        </div>
                        <div className="mini-info-col">
                          <div className="mini-title">{act.title}</div>
                          <div className="mini-meta">
                            <span className="mini-type" style={{ backgroundColor: typeColors[act.type] }}>
                              {ActivityTypeLabels[act.type]}
                            </span>
                            <span>📍 {act.location}</span>
                          </div>
                        </div>
                        <div className={`mini-status ${ended ? 'status-ended' : 'status-upcoming'}`}>
                          {ended ? '已结束' : '已报名'}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>

        <div className={`tab-panel ${activeTab === 'achievement' ? 'panel-show' : ''}`}>
          <div className="achievement-summary">
            <div className="summary-progress">
              <div className="progress-ring">
                <svg width="120" height="120">
                  <circle
                    cx="60" cy="60" r="52"
                    fill="none" stroke="#e0e0e0" strokeWidth="10"
                  />
                  <circle
                    cx="60" cy="60" r="52"
                    fill="none"
                    stroke="#2D6A4F"
                    strokeWidth="10"
                    strokeDasharray={`${(unlockedCount / achievements.length) * 326.7} 326.7`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                  />
                </svg>
                <div className="progress-text">
                  <div className="progress-num">{Math.round(unlockedCount / achievements.length * 100)}%</div>
                  <div className="progress-label">完成度</div>
                </div>
              </div>
            </div>
            <div className="summary-text">
              <h4 className="summary-title">🏆 我的成就之旅</h4>
              <p className="summary-desc">
                已解锁 <strong>{unlockedCount}</strong> 个徽章，距离全部成就还差 <strong>{achievements.length - unlockedCount}</strong> 个。
                多参与户外活动，解锁更多专属荣誉！
              </p>
            </div>
          </div>

          <div className="achievements-grid">
            {achievements.map(ach => (
              <div
                key={ach.id}
                className={`achievement-card ${ach.unlocked ? 'ach-unlocked' : 'ach-locked'}`}
                title={ach.unlocked ? ach.description : ach.condition}
              >
                <div className="ach-icon">{ach.icon}</div>
                <div className="ach-name">{ach.name}</div>
                <div className="ach-desc">{ach.description}</div>
                {!ach.unlocked && (
                  <div className="ach-condition">
                    🔒 {ach.condition}
                  </div>
                )}
                {ach.unlocked && (
                  <div className="ach-badge">✓ 已解锁</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {hoveredActivity && (
        <div
          className="activity-tooltip"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="tooltip-title">{hoveredActivity.title}</div>
          <div className="tooltip-meta">
            {new Date(hoveredActivity.date).toLocaleDateString('zh-CN', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </div>
          <div className="tooltip-meta">📍 {hoveredActivity.location}</div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage
