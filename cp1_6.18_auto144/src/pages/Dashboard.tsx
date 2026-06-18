import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExperimentStore } from '../store/experimentStore'

interface SidebarProps {
  active: string
}

function Sidebar({ active }: SidebarProps) {
  const navItems = [
    { key: 'dashboard', icon: '📊', label: '仪表板' },
    { key: 'experiments', icon: '🧪', label: '我的实验' },
    { key: 'templates', icon: '📋', label: '模板库' },
    { key: 'team', icon: '👥', label: '团队成员' },
    { key: 'settings', icon: '⚙️', label: '设置' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>🔬</span>
        <span>实验笔记</span>
      </div>
      <ul className="sidebar-nav">
        {navItems.map(item => (
          <li
            key={item.key}
            className={`sidebar-nav-item ${active === item.key ? 'active' : ''}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

interface ExperimentCardProps {
  experiment: {
    id: string
    title: string
    summary: string
    status: '进行中' | '已完成' | '失败'
    creator: { name: string; avatar: string }
    createdAt: string
  }
  index: number
  onClick: () => void
}

function ExperimentCard({ experiment, index, onClick }: ExperimentCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [likes, setLikes] = useState(Math.floor(Math.random() * 10))
  const [liked, setLiked] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    const card = cardRef.current
    if (!card) return
    
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const ripple = document.createElement('span')
    ripple.className = 'ripple'
    ripple.style.left = `${x}px`
    ripple.style.top = `${y}px`
    ripple.style.width = '20px'
    ripple.style.height = '20px'
    ripple.style.marginLeft = '-10px'
    ripple.style.marginTop = '-10px'
    card.appendChild(ripple)
    
    setTimeout(() => ripple.remove(), 600)
    
    onClick()
  }

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLiked(!liked)
    setLikes(liked ? likes - 1 : likes + 1)
  }

  const statusClass = 
    experiment.status === '进行中' ? 'status-active' :
    experiment.status === '已完成' ? 'status-completed' : 'status-failed'

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <div
      ref={cardRef}
      className="experiment-card"
      style={{ animationDelay: `${index * 0.08}s` }}
      onClick={handleClick}
    >
      <div className="card-header">
        <img
          src={experiment.creator.avatar}
          alt={experiment.creator.name}
          className="card-avatar"
        />
        <h3 className="card-title" title={experiment.title}>
          {experiment.title.length > 30 ? experiment.title.slice(0, 30) + '...' : experiment.title}
        </h3>
      </div>
      <p className="card-summary">{experiment.summary}</p>
      <div className="card-footer">
        <span className={`status-tag ${statusClass}`}>{experiment.status}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>{formatDate(experiment.createdAt)}</span>
          <button
            className={`like-btn ${liked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <span>{liked ? '❤️' : '🤍'}</span>
            <span>{likes}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { experiments, loading, fetchExperiments } = useExperimentStore()

  useEffect(() => {
    fetchExperiments()
  }, [fetchExperiments])

  const handleCardClick = (id: string) => {
    navigate(`/experiment/${id}`)
  }

  const sortedExperiments = [...experiments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="app-layout">
      <Sidebar active="dashboard" />
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">实验仪表板</h1>
            <p className="dashboard-subtitle">查看和管理所有实验项目</p>
          </div>
          <button className="btn btn-primary">
            <span>➕</span>
            <span>新建实验</span>
          </button>
        </div>

        {loading && experiments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="loading-spinner" />
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>加载中...</p>
          </div>
        ) : (
          <div className="cards-grid">
            {sortedExperiments.map((exp, index) => (
              <ExperimentCard
                key={exp.id}
                experiment={exp}
                index={index}
                onClick={() => handleCardClick(exp.id)}
              />
            ))}
          </div>
        )}

        {!loading && experiments.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>
            <p>还没有实验，点击上方按钮创建第一个实验吧！</p>
          </div>
        )}
      </main>
    </div>
  )
}
