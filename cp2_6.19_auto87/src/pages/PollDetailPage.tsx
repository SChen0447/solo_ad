import { useEffect, useState, useCallback } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { getPoll, submitVote, resetPoll, getPollResults } from '../api'
import BarChart from '../components/BarChart'
import ConfirmModal from '../components/ConfirmModal'
import Notification from '../components/Notification'
import type { Poll, PollOption, Notification as NotificationType, PollResults } from '../types'

export default function PollDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [poll, setPoll] = useState<Poll | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [notification, setNotification] = useState<NotificationType | null>(null)
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<PollResults | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [timeLeft, setTimeLeft] = useState<string>('')

  const fetchResults = useCallback(async () => {
    if (!id) return
    try {
      const data = await getPollResults(id)
      setResults(data)
    } catch (error) {
      console.error('Failed to fetch results:', error)
    }
  }, [id])

  useEffect(() => {
    const fetchPoll = async () => {
      if (!id) return
      try {
        const data = await getPoll(id)
        setPoll(data)
        await fetchResults()
      } catch (error) {
        setNotification({
          id: Date.now().toString(),
          type: 'error',
          message: error instanceof Error ? error.message : '获取投票详情失败'
        })
        if (error instanceof Error && error.message === '投票不存在') {
          setTimeout(() => navigate('/'), 2000)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPoll()
  }, [id, navigate, fetchResults])

  useEffect(() => {
    if (!poll || !poll.deadline) return

    const updateTimeLeft = () => {
      const now = Date.now()
      const diff = poll.deadline! - now

      if (diff <= 0) {
        setTimeLeft('已截止')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setTimeLeft(`剩余 ${days}天 ${hours}小时`)
      } else if (hours > 0) {
        setTimeLeft(`剩余 ${hours}小时 ${minutes}分钟`)
      } else {
        setTimeLeft(`剩余 ${minutes}分 ${seconds}秒`)
      }
    }

    updateTimeLeft()
    const timer = setInterval(updateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [poll])

  useEffect(() => {
    if (!id) return

    const interval = setInterval(() => {
      fetchResults()
    }, 1000)

    return () => clearInterval(interval)
  }, [id, fetchResults])

  const handleVote = async () => {
    if (!id || !selectedOption || !poll) return

    setVoting(true)
    try {
      const data = await submitVote(id, selectedOption)
      const now = Date.now()
      const isEnded = poll.deadline ? poll.deadline < now : false
      setResults({ options: data.options, totalVotes: data.totalVotes, isEnded })
      setPoll({ ...poll, hasVoted: true, totalVotes: data.totalVotes })
      setNotification({
        id: Date.now().toString(),
        type: 'success',
        message: '投票成功！'
      })
    } catch (error) {
      setNotification({
        id: Date.now().toString(),
        type: 'error',
        message: error instanceof Error ? error.message : '投票失败'
      })
    } finally {
      setVoting(false)
    }
  }

  const handleReset = async () => {
    if (!id || !poll) return

    setResetting(true)
    try {
      const data = await resetPoll(id)
      const now = Date.now()
      const isEnded = poll.deadline ? poll.deadline < now : false
      setResults({ options: data.options, totalVotes: data.totalVotes, isEnded })
      setResetKey(prev => prev + 1)
      if (poll) {
        setPoll({ ...poll, hasVoted: false, totalVotes: 0 })
      }
      setSelectedOption(null)
      setNotification({
        id: Date.now().toString(),
        type: 'success',
        message: '投票已重置'
      })
    } catch (error) {
      setNotification({
        id: Date.now().toString(),
        type: 'error',
        message: error instanceof Error ? error.message : '重置失败'
      })
    } finally {
      setResetting(false)
      setShowResetModal(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-[#1a237e] rounded-full animate-spin" />
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  if (!poll) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Notification
          notification={notification}
          onClose={() => setNotification(null)}
        />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">投票不存在</h2>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-[#1a237e] text-white rounded-lg font-medium
                       hover:bg-[#283593] transition-colors duration-200"
          >
            返回列表
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Notification
        notification={notification}
        onClose={() => setNotification(null)}
      />

      <ConfirmModal
        isOpen={showResetModal}
        title="确认重置投票"
        message="确定要重置所有投票结果吗？此操作将清空所有投票记录，且无法撤销。"
        onConfirm={handleReset}
        onCancel={() => setShowResetModal(false)}
      />

      <header className="bg-[#1a237e] text-white py-6 shadow-lg">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link
              to="/"
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              ← 返回列表
            </Link>
            {poll.isCreator && (
              <button
                onClick={() => setShowResetModal(true)}
                disabled={resetting}
                className="px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors
                           disabled:opacity-50"
              >
                {resetting ? '重置中...' : '重置投票'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">{poll.title}</h1>

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
            <span>创建时间：{formatDate(poll.createdAt)}</span>
            {poll.deadline && (
              <span className={poll.isEnded ? 'text-red-500' : 'text-[#1a237e]'}>
                {timeLeft}
              </span>
            )}
          </div>

          {poll.hasVoted && (
            <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              ✓ 您已完成投票
            </div>
          )}

          {poll.isCreator && (
            <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              👑 您是此投票的创建者
            </div>
          )}

          {!poll.hasVoted && !poll.isEnded && (
            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">请选择您的选项：</p>
              {poll.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
                    ${selectedOption === option.id
                      ? 'border-[#1a237e] bg-[#1a237e]/5'
                      : 'border-gray-200 hover:border-[#1a237e]/50 hover:bg-gray-50'
                    }`}
                >
                  <input
                    type="radio"
                    name="vote"
                    value={option.id}
                    checked={selectedOption === option.id}
                    onChange={() => setSelectedOption(option.id)}
                    className="w-5 h-5 text-[#1a237e]"
                  />
                  <span className="ml-3 text-gray-700">{option.text}</span>
                </label>
              ))}

              <button
                onClick={handleVote}
                disabled={!selectedOption || voting}
                className="w-full mt-4 py-3 bg-[#1a237e] text-white rounded-lg font-medium
                           hover:bg-[#283593] transition-colors duration-200
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {voting ? '提交中...' : '提交投票'}
              </button>
            </div>
          )}

          {poll.isEnded && !poll.hasVoted && (
            <div className="mb-6 px-4 py-3 bg-gray-100 rounded-lg text-gray-600 text-center">
              投票已截止，无法参与投票
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">实时投票结果</h2>
          {results ? (
            <BarChart
              options={results.options}
              totalVotes={results.totalVotes}
              resetKey={resetKey}
            />
          ) : (
            <div className="text-center py-10 text-gray-500">
              暂无投票数据
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
