import { useAppContext } from '@/App'
import ActivityCard from '@/components/ActivityCard'
import { User, Calendar, Heart } from 'lucide-react'

export default function ProfilePage() {
  const { state } = useAppContext()

  const createdActivities = state.activities.filter(
    a => a.creatorId === state.currentUser.id
  )
  const registeredActivities = state.activities.filter(
    a => a.registrations.some(r => r.userId === state.currentUser.id)
  )

  return (
    <div className="container">
      <div style={{
        background: 'var(--color-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: state.currentUser.avatarColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {state.currentUser.name.charAt(0)}
        </div>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{state.currentUser.name}</h2>
          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> 创建 {createdActivities.length} 个活动</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Heart size={14} /> 参加 {registeredActivities.length} 个活动</span>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h2 className="profile-section-title">
          <User size={20} /> 我创建的活动
        </h2>
        {createdActivities.length > 0 ? (
          <div className="activity-grid">
            {createdActivities.map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <div className="profile-empty">还没有创建过活动，去创建一个吧！</div>
        )}
      </div>

      <div className="profile-section">
        <h2 className="profile-section-title">
          <Calendar size={20} /> 我报名的活动
        </h2>
        {registeredActivities.length > 0 ? (
          <div className="activity-grid">
            {registeredActivities.map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <div className="profile-empty">还没有报名过活动，去看看有什么感兴趣的吧！</div>
        )}
      </div>
    </div>
  )
}
