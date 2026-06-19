import { Link } from 'react-router-dom'
import type { PollListItem } from '../types'

interface PollCardProps {
  poll: PollListItem
}

export default function PollCard({ poll }: PollCardProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isEnded = poll.status === 'ended'
  const statusText = isEnded ? '已截止' : '进行中'
  const statusColor = isEnded ? 'bg-gray-400' : 'bg-green-500'

  return (
    <Link
      to={`/poll/${poll.id}`}
      className="block bg-white rounded-xl p-5 shadow-sm border border-gray-100 
                 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-800 flex-1 mr-3 line-clamp-2">
          {poll.title}
        </h3>
        <span className={`${statusColor} text-white text-xs px-2 py-1 rounded-full flex-shrink-0`}>
          {statusText}
        </span>
      </div>

      <div className="text-sm text-gray-500 mb-3">
        创建时间：{formatDate(poll.createdAt)}
      </div>

      {poll.deadline && (
        <div className="text-sm text-gray-500 mb-3">
          截止时间：{formatDate(poll.deadline)}
        </div>
      )}

      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <span className="text-sm text-gray-600">
          当前票数：<span className="font-semibold text-[#1a237e]">{poll.totalVotes}</span>
        </span>
        <span className="text-[#1a237e] text-sm font-medium">
          查看详情 →
        </span>
      </div>
    </Link>
  )
}
