/* ============================================
 * 个人中心页面
 * 上游组件：App.tsx（通过React Router渲染 /profile）
 * 下游组件：无（直接渲染日历、成就、Tab）
 * 数据流向：
 *   - 接收：无props
 *   - 调用：api.getUser() → user数据，api.getAchievements() → 成就数据
 *   - 内部状态：activeTab控制日历/成就切换，transform: translateX(100%)→translateX(0)
 * ============================================ */

import React, { useState, useEffect } from 'react'
import { api } from '../api'
import type { User, Achievement } from '../types'

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [activeTab, setActiveTab] = useState<'calendar' | 'achievements'>('calendar')
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoadState('loading')
    try {
      const [u, a] = await Promise.all([api.getUser(), api.getAchievements()])
      setUser(u)
      setAchievements(a)
      setLoadState('done')
    } catch (e) {
      console.error(e)
      setLoadState('error')
    }
  }

  if (loadState === 'loading') return <div className="loading-state">加载中...</div>
  if (loadState === 'error' || !user) {
    return (
      <div className="page-container page-fade-in">
        <div className="empty-state">
          <div className="empty-icon">😔</div>
          <p className="empty-text">加载失败</p>
        </div>
      </div>
    )
  }

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const allIds = [...user.registeredActivities, ...user.completedActivities]

  const activityMap: Record<number, { id: string; title: string; type: string }> = {}
  if (user.activityDates) {
    user.activityDates.forEach(k => {
      const d = new Date(k.date)
      if (d.getFullYear() === year && d.getMonth() === month) {
        activityMap[d.getDate()] = { id: k.id, title: k.title, type: k.type }
      }
    })
  }

  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const calendarCells: React.ReactNode[] = []
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="calendar-cell empty" />)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const act = activityMap[d]
    const isToday = d === today.getDate()
    calendarCells.push(
      <div
      key={`day-${d}`}
      className={`calendar-cell ${isToday ? 'today' : ''} ${act ? 'has-event' : ''}`}
      title={act ? act.title : ''}
    >
      <span className="calendar-day">{d}</span>
      {act && <div className="calendar-dot" />}
    </div>
    )
  }

  const unlockedIds = new Set(user.unlockedAchievements)
  const unlockedAch = achievements.filter(a => unlockedIds.has(a.id))
  const lockedAch = achievements.filter(a => !unlockedIds.has(a.id))

  return (
    <div className="page-container page-fade-in">
      <div className="profile-header">
        <div className="profile-avatar-wrap">
          <img src={user.avatar} alt={user.name} className="profile-avatar" />
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{user.name}</h1>
          <p className="profile-bio">{user.bio}</p>
          <div className="profile-stats">
            <div className="stat-item">
              <div className="stat-value">{user.completedActivities.length}</div>
              <div className="stat-label">已完成活动</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{user.registeredActivities.length}</div>
              <div className="stat-label">进行中活动</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{user.unlockedAchievements.length}</div>
              <div className="stat-label">解锁成就</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{user.level}</div>
              <div className="stat-label">户外等级</div>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs-bar">
        <button
          className={`tab-btn ${activeTab === 'calendar' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          📅 活动日历
        </button>
        <button
          className={`tab-btn ${activeTab === 'achievements' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          🏆 成就徽章
        </button>
      </div>

      {/* Tab 面板 - 从右侧滑入 translateX(100%) → translateX(0)，transition: transform 0.2s ease-out */}
      <div className="tab-content">
        {activeTab === 'calendar' && (
          <div key="calendar" className="tab-panel panel-show">
            <div className="calendar-wrap">
              <h3 className="calendar-title">{year}年 {monthNames[month]}</h3>
              <div className="calendar-weekdays">
                {weekdays.map(w => <div key={w} className="calendar-weekday">{w}</div>)}
              </div>
              <div className="calendar-grid">
                {calendarCells}
              </div>
            </div>
            <div className="calendar-legend">
              <div className="legend-item">
                <div className="legend-dot" />
                <span>有活动</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot legend-today" />
                <span>今天</span>
              </div>
            </div>
            {allIds.length === 0 && (
              <div className="empty-state" style={{ padding: '32px 16px }}>
                <div className="empty-icon">📅</div>
                <p className="empty-text">暂无活动记录</p>
                <p className="empty-sub">前往活动列表报名一个吧</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'achievements' && (
          <div key="achievements" className="tab-panel panel-show">
            {unlockedAch.length > 0 && (
              <>
                <h4 className="panel-subtitle">已解锁</h4>
                <div className="achievements-grid">
                  {unlockedAch.map(ach => (
                    <div key={ach.id} className="achievement-card">
                      <div className="achievement-icon">{ach.icon}</div>
                      <div className="achievement-title">{ach.title}</div>
                      <div className="achievement-desc">{ach.description}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {lockedAch.length > 0 && (
              <>
                <h4 className="panel-subtitle">待解锁</h4>
                <div className="achievements-grid">
                  {lockedAch.map(ach => (
                    <div key={ach.id} className="achievement-card locked">
                      <div className="achievement-icon">🔒</div>
                      <div className="achievement-title">{ach.title}</div>
                      <div className="achievement-desc">{ach.description}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {achievements.length === 0 && (
              <div className="empty-state" style={{ padding: '32px 16px' }}>
                <div className="empty-icon">🏆</div>
                <p className="empty-text">暂无成就</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfilePage
