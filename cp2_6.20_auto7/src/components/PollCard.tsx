import { useNavigate } from 'react-router-dom'
import type { Poll } from '../types'

interface PollCardProps {
  poll: Poll
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function PollCard({ poll }: PollCardProps) {
  const navigate = useNavigate()

  return (
    <div
      className="poll-card"
      onClick={() => navigate(`/poll/${poll.id}`)}
    >
      <div className="poll-card-title">{poll.title}</div>
      <div className="poll-card-meta">
        <div className="poll-card-row">
          <span>创建时间</span>
          <span>{formatDate(poll.createdAt)}</span>
        </div>
        <div className="poll-card-row">
          <span>总票数</span>
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
            {poll.totalVotes} 票
          </span>
        </div>
        <div className="poll-card-row">
          <span>状态</span>
          <span className={`status-badge ${poll.isExpired ? 'status-expired' : 'status-active'}`}>
            {poll.isExpired ? '已截止' : '进行中'}
          </span>
        </div>
      </div>
    </div>
  )
}
