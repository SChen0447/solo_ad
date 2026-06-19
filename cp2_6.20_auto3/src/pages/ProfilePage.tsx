import { useState, useEffect } from 'react'
import { useAppContext } from '../App'
import { fetchUserProfile } from '../api'
import type { Activity } from '../types'
import ActivityCard from '../components/ActivityCard'

const ProfilePage = () => {
  const { state } = useAppContext()
  const [registeredActivities, setRegisteredActivities] = useState<Activity[]>([])
  const [likedActivities, setLikedActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'registered' | 'liked'>('registered')

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetchUserProfile(state.currentUser.id)
        setRegisteredActivities(data.registeredActivities)
        setLikedActivities(data.likedActivities)
      } catch (error) {
        console.error('加载用户信息失败:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [state.currentUser.id, state.activities])

  const currentRegistered = state.activities.filter(a =>
    a.participants.some(p => p.id === state.currentUser.id)
  )

  const currentLiked = state.activities.filter(a =>
    a.likedBy.includes(state.currentUser.id)
  )

  const displayRegistered = currentRegistered.length > 0 ? currentRegistered : registeredActivities
  const displayLiked = currentLiked.length > 0 ? currentLiked : likedActivities

  const displayActivities = activeTab === 'registered' ? displayRegistered : displayLiked

  return (
    <div className="page-container">
      <div className="profile-header">
        <img
          src={state.currentUser.avatar}
          alt={state.currentUser.name || '用户头像'}
          className="profile-avatar"
        />
        <div className="profile-info">
          <h1>{state.currentUser.name || '游客用户'}</h1>
          <p>ID: {state.currentUser.id.slice(0, 8)}...</p>
          <div className="profile-stats">
            <div className="stat-item">
              <div className="stat-value">{displayRegistered.length}</div>
              <div className="stat-label">已报名</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{displayLiked.length}</div>
              <div className="stat-label">感兴趣</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{displayRegistered.length + displayLiked.length}</div>
              <div className="stat-label">总互动</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E8E8E8', paddingBottom: '12px' }}>
          <button
            className={`btn ${activeTab === 'registered' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('registered')}
          >
            ✅ 已报名的活动
          </button>
          <button
            className={`btn ${activeTab === 'liked' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('liked')}
          >
            ❤️ 感兴趣的活动
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
        </div>
      ) : displayActivities.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            {activeTab === 'registered' ? '📝' : '❤️'}
          </div>
          <p>
            {activeTab === 'registered'
              ? '你还没有报名任何活动'
              : '你还没有点赞任何活动'}
          </p>
          <p style={{ marginTop: '8px', fontSize: '14px' }}>
            快去首页发现有趣的活动吧！
          </p>
        </div>
      ) : (
        <div className="activity-grid">
          {displayActivities.map(activity => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  )
}

export default ProfilePage
