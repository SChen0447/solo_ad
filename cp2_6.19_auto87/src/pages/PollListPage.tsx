import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPolls } from '../api'
import PollCard from '../components/PollCard'
import Notification from '../components/Notification'
import type { PollListItem, Notification as NotificationType } from '../types'

export default function PollListPage() {
  const [polls, setPolls] = useState<PollListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<NotificationType | null>(null)

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const data = await getPolls()
        setPolls(data)
      } catch (error) {
        setNotification({
          id: Date.now().toString(),
          type: 'error',
          message: error instanceof Error ? error.message : '获取投票列表失败'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPolls()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Notification
        notification={notification}
        onClose={() => setNotification(null)}
      />

      <header className="bg-[#1a237e] text-white py-6 shadow-lg">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h1 className="text-2xl font-bold">在线投票系统</h1>
            <Link
              to="/create"
              className="px-6 py-2 bg-white text-[#1a237e] rounded-lg font-medium
                         hover:bg-gray-100 transition-colors duration-200"
            >
              + 创建投票
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-500">
            <div className="inline-block w-10 h-10 border-4 border-gray-200 border-t-[#1a237e] rounded-full animate-spin" />
            <p className="mt-4">加载中...</p>
          </div>
        ) : polls.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">暂无投票</h2>
            <p className="text-gray-500 mb-6">点击右上角按钮创建您的第一个投票</p>
            <Link
              to="/create"
              className="inline-block px-6 py-3 bg-[#1a237e] text-white rounded-lg font-medium
                         hover:bg-[#283593] transition-colors duration-200"
            >
              创建投票
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {polls.map(poll => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
