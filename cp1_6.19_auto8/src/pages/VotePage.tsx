import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io as socketIO, Socket } from 'socket.io-client'
import axios from 'axios'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from 'recharts'
import { ArrowLeft, Download, XCircle, Users, Clock } from 'lucide-react'
import usePollStore from '@/store/pollStore'
import type { Poll, TimelinePoint } from '../../shared/types'

const PIE_COLORS = ['#e17055', '#00b894', '#6c5ce7', '#fd79a8', '#0984e3', '#fdcb6e', '#00cec9', '#b2bec3']
const GRADIENT_ID = 'barGradient'

export default function VotePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    currentPoll, setCurrentPoll,
    timeline, setTimeline,
    hasVoted, setHasVoted,
    error, setError, setError: clearError,
  } = usePollStore()

  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set())
  const [socket, setSocket] = useState<Socket | null>(null)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)

  const fetchPoll = useCallback(async () => {
    if (!id) return
    try {
      const res = await axios.get<Poll>(`/api/poll/${id}`)
      setCurrentPoll(res.data)
    } catch {
      setError('投票不存在')
    }
  }, [id, setCurrentPoll, setError])

  const fetchTimeline = useCallback(async () => {
    if (!id) return
    try {
      const res = await axios.get<TimelinePoint[]>(`/api/poll/${id}/timeline`)
      setTimeline(res.data)
    } catch {
      setTimeline([])
    }
  }, [id, setTimeline])

  useEffect(() => {
    fetchPoll()
    const newSocket = socketIO(window.location.origin, { path: '/socket.io' })
    setSocket(newSocket)
    return () => {
      newSocket.disconnect()
    }
  }, [fetchPoll])

  useEffect(() => {
    if (!socket || !id) return
    socket.emit('join', id)
    socket.on('result', (poll: Poll) => {
      setCurrentPoll(poll)
    })
    return () => {
      socket.emit('leave', id)
      socket.off('result')
    }
  }, [socket, id, setCurrentPoll])

  useEffect(() => {
    if (showAnalysis && id) {
      fetchTimeline()
    }
  }, [showAnalysis, id, fetchTimeline])

  useEffect(() => {
    return () => {
      setCurrentPoll(null)
      setHasVoted(false)
      clearError(null)
    }
  }, [setCurrentPoll, setHasVoted, clearError])

  if (!currentPoll) {
    return (
      <div className="vote-page-loading">
        <div className="loading-spinner" />
        <p>加载中...</p>
        {error && <p className="global-error">{error}</p>}
      </div>
    )
  }

  const isExpired = currentPoll.isClosed || (currentPoll.deadline && new Date(currentPoll.deadline) < new Date())
  const totalVotes = currentPoll.options.reduce((sum, o) => sum + o.votes, 0)

  const toggleOption = (optionId: string) => {
    if (hasVoted || isExpired) return
    const next = new Set(selectedOptions)
    if (next.has(optionId)) next.delete(optionId)
    else next.add(optionId)
    setSelectedOptions(next)
  }

  const handleSubmit = async () => {
    if (selectedOptions.size === 0 || !id) return
    try {
      await axios.post(`/api/poll/${id}/vote`, { optionIds: Array.from(selectedOptions) })
      setHasVoted(true)
      setSelectedOptions(new Set())
    } catch (err: any) {
      const msg = err?.response?.data?.error || '投票失败'
      if (msg.includes('已投过')) setHasVoted(true)
      setVoteError(msg)
      setTimeout(() => setVoteError(null), 3000)
    }
  }

  const handleClose = async () => {
    if (!id) return
    try {
      await axios.patch(`/api/poll/${id}/close`)
      fetchPoll()
    } catch {
      setVoteError('关闭投票失败')
    }
  }

  const handleExport = () => {
    window.open(`/api/poll/${id}/export`, '_blank')
  }

  const barData = currentPoll.options.map((opt) => ({
    name: opt.text,
    votes: opt.votes,
  }))

  const pieData = currentPoll.options.map((opt, i) => ({
    name: opt.text,
    value: opt.votes,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  const sortedOptions = [...currentPoll.options].sort((a, b) => b.votes - a.votes)

  const buildLineData = () => {
    if (timeline.length === 0) return []
    const grouped = new Map<string, { timestamp: string; optionText: string; rate: number }[]>()
    const optionMap = new Map(currentPoll.options.map((o) => [o.id, o.text]))

    for (const point of timeline) {
      const label = new Date(point.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const rate = point.totalVotesAtTime > 0 ? (point.cumulativeVotes / point.totalVotesAtTime) * 100 : 0
      if (!grouped.has(label)) grouped.set(label, [])
      grouped.get(label)!.push({
        timestamp: label,
        optionText: optionMap.get(point.optionId) || point.optionText,
        rate: Math.round(rate * 10) / 10,
      })
    }

    return Array.from(grouped.entries()).map(([time, items]) => {
      const row: Record<string, string | number> = { time }
      for (const item of items) {
        row[item.optionText] = item.rate
      }
      return row
    })
  }

  const lineData = buildLineData()
  const optionNames = currentPoll.options.map((o) => o.text)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="vote-page">
      <div className="vote-page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={18} />
          返回列表
        </button>
        <h1 className="vote-page-title">{currentPoll.title}</h1>
        <div className="vote-page-meta">
          <span className="poll-meta-item">
            <Users size={14} />
            {totalVotes} 票
          </span>
          {currentPoll.deadline && (
            <span className="poll-meta-item">
              <Clock size={14} />
              截止：{formatDate(currentPoll.deadline)}
            </span>
          )}
          <span className={`poll-status ${isExpired ? 'poll-status-closed' : 'poll-status-active'}`}>
            {isExpired ? '已结束' : '进行中'}
          </span>
        </div>
      </div>

      <div className="vote-content">
        <div className="vote-section">
          <h2 className="section-title">选择选项</h2>
          <div className="options-list">
            {currentPoll.options.map((opt, i) => {
              const isSelected = selectedOptions.has(opt.id)
              const pct = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : '0.0'
              return (
                <div
                  key={opt.id}
                  className={`option-card ${isSelected ? 'option-card-selected' : ''} ${hasVoted || isExpired ? 'option-card-disabled' : ''}`}
                  onClick={() => toggleOption(opt.id)}
                >
                  <div className="option-card-left">
                    <div className="option-radio" style={isSelected ? { borderColor: PIE_COLORS[i % PIE_COLORS.length], background: PIE_COLORS[i % PIE_COLORS.length] } : {}} />
                    <span className="option-text">{opt.text}</span>
                  </div>
                  {(hasVoted || isExpired) && (
                    <div className="option-stats">
                      <span className="option-votes">{opt.votes} 票</span>
                      <span className="option-pct">{pct}%</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {!hasVoted && !isExpired && (
            <button
              className={`submit-btn ${selectedOptions.size === 0 ? 'submit-btn-disabled' : ''}`}
              onClick={handleSubmit}
              disabled={selectedOptions.size === 0}
            >
              提交投票
            </button>
          )}
          {isExpired && !hasVoted && (
            <div className="vote-ended-notice">
              投票已结束
            </div>
          )}
          {hasVoted && !isExpired && (
            <div className="vote-success-notice">
              投票成功！结果将实时更新
            </div>
          )}
          {voteError && <div className="global-error">{voteError}</div>}
        </div>

        <div className="charts-section">
          <h2 className="section-title">实时结果</h2>

          <div className="chart-container">
            <h3 className="chart-label">得票数 — 柱状图</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6c5ce7" />
                    <stop offset="100%" stopColor="#a29bfe" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e0e0e0' }}
                  animationDuration={500}
                />
                <Bar dataKey="votes" fill={`url(#${GRADIENT_ID})`} radius={[6, 6, 0, 0]} animationDuration={500} animationEasing="ease-in-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3 className="chart-label">得票占比 — 饼图</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  animationDuration={500}
                  animationEasing="ease-in-out"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip animationDuration={500} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="analysis-toggle">
        <button className="analysis-btn" onClick={() => setShowAnalysis(!showAnalysis)}>
          {showAnalysis ? '收起分析' : '查看结果分析'}
        </button>
        {!isExpired && (
          <button className="close-poll-btn" onClick={handleClose}>
            <XCircle size={16} />
            关闭投票
          </button>
        )}
      </div>

      {showAnalysis && (
        <div className="analysis-section">
          <div className="analysis-summary">
            <div className="summary-card">
              <span className="summary-label">总票数</span>
              <span className="summary-value">{totalVotes}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">选项数</span>
              <span className="summary-value">{currentPoll.options.length}</span>
            </div>
          </div>

          <div className="ranking-list">
            <h3 className="chart-label">排名</h3>
            {sortedOptions.map((opt, i) => {
              const pct = totalVotes > 0 ? ((opt.votes / totalVotes) * 100).toFixed(1) : '0.0'
              return (
                <div key={opt.id} className="ranking-item">
                  <span className="ranking-num" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}>{i + 1}</span>
                  <span className="ranking-text">{opt.text}</span>
                  <span className="ranking-votes">{opt.votes} 票 ({pct}%)</span>
                  <div className="ranking-bar-bg">
                    <div className="ranking-bar-fill" style={{ width: `${pct}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  </div>
                </div>
              )
            })}
          </div>

          {lineData.length > 1 && (
            <div className="chart-container">
              <h3 className="chart-label">得票率变化趋势</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip animationDuration={500} />
                  <Legend />
                  {optionNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={PIE_COLORS[i % PIE_COLORS.length]}
                      strokeWidth={2}
                      animationDuration={500}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <button className="export-btn" onClick={handleExport}>
            <Download size={16} />
            导出CSV
          </button>
        </div>
      )}
    </div>
  )
}
