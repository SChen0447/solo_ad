import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Poll } from '../types'
import { PollCard } from '../components/PollCard'
import { useNotification } from '../components/Notification'

export function Home() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const { showNotification } = useNotification()

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getPolls()
        setPolls(data)
      } catch (err) {
        showNotification('error', err instanceof Error ? err.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [showNotification])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 className="page-title" style={{ marginBottom: 0 }}>所有投票</h2>
        <Link to="/create" className="btn btn-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          创建投票
        </Link>
      </div>

      {loading ? (
        <div className="empty-state">加载中...</div>
      ) : polls.length === 0 ? (
        <div className="card empty-state">
          <h3>还没有任何投票</h3>
          <p style={{ marginBottom: 20 }}>点击右上角"创建投票"开始您的第一个投票吧！</p>
          <Link to="/create" className="btn btn-primary">立即创建</Link>
        </div>
      ) : (
        <div className="polls-grid">
          {polls.map(poll => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}
    </div>
  )
}
