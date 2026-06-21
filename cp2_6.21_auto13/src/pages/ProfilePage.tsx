import { useState, useEffect, useMemo } from 'react'
import { getProfile, getSavedPosts } from '../api'
import type { User, Post } from '../types'

function getLevelName(level: number): string {
  if (level <= 2) return '青铜'
  if (level <= 4) return '白银'
  if (level <= 6) return '黄金'
  if (level <= 8) return '铂金'
  return '钻石'
}

function getLevelBorderColor(level: number): string {
  if (level <= 2) return '#CD7F32'
  if (level <= 4) return '#C0C0C0'
  if (level <= 6) return '#FFD700'
  if (level <= 8) return '#E5E4E2'
  return '#B9F2FF'
}

function ProgressRing({
  value,
  max = 100,
  label,
  size = 72,
  thickness = 6
}: {
  value: number
  max?: number
  label: string
  size?: number
  thickness?: number
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const progress = Math.min(displayValue / max, 1) * 100

  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayValue(value)
    }, 100)
    return () => clearTimeout(timer)
  }, [value])

  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="stat-item">
      <div
        style={{
          width: size,
          height: size,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth={thickness}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#43A047"
            strokeWidth={thickness}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.5s ease'
            }}
          />
        </svg>
        <span
          style={{
            position: 'absolute',
            fontSize: '16px',
            fontWeight: 600,
            color: '#2E7D32'
          }}
        >
          {displayValue}
        </span>
      </div>
      <span className="stat-label">{label}</span>
    </div>
  )
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProfileData()
  }, [])

  async function loadProfileData() {
    try {
      setLoading(true)
      const [profileData, savedData] = await Promise.all([
        getProfile(),
        getSavedPosts()
      ])
      setUser(profileData)
      setSavedPosts(savedData)
    } catch (error) {
      console.error('加载个人数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    if (!user) return null
    return [
      { value: user.stats.totalPlants, label: '植物总数' },
      { value: user.stats.healthIndex, label: '健康指数' },
      { value: user.stats.careDays, label: '养护天数' }
    ]
  }, [user])

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="profile-page">
        <div className="empty-state">无法加载用户信息</div>
      </div>
    )
  }

  const borderColor = getLevelBorderColor(user.level)

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1 className="page-title">个人中心</h1>
      </div>

      <div className="user-card">
        <img
          className="user-avatar"
          src={user.avatar}
          alt={user.name}
          style={{ borderColor }}
        />
        <div className="user-info">
          <div className="user-name">{user.name}</div>
          <div className="user-level">
            Lv.{user.level} · {getLevelName(user.level)}养植人
          </div>
        </div>
      </div>

      {stats && (
        <div className="stats-section">
          {stats.map(stat => (
            <ProgressRing
              key={stat.label}
              value={stat.value}
              label={stat.label}
            />
          ))}
        </div>
      )}

      <div className="saved-section">
        <h3 className="saved-title">我的收藏</h3>
        {savedPosts.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px' }}>
            <div className="empty-icon" style={{ fontSize: 36 }}>📌</div>
            <p>还没有收藏帖子</p>
          </div>
        ) : (
          <div className="saved-list">
            {savedPosts.map(post => (
              <div key={post.id} className="saved-item">
                <div className="saved-item-content">{post.content}</div>
                <div className="saved-item-author">—— {post.author}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
