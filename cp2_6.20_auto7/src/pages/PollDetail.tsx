import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import type { Poll } from '../types'
import { BarChart } from '../components/BarChart'
import { Modal } from '../components/Modal'
import { QRCode } from '../components/QRCode'
import { useNotification } from '../components/Notification'

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function useCountdown(deadline?: number) {
  const [remaining, setRemaining] = useState<string>('')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!deadline) {
      setRemaining('无限期')
      return
    }

    const update = () => {
      const diff = deadline - Date.now()
      if (diff <= 0) {
        setExpired(true)
        setRemaining('已截止')
        return
      }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (d > 0) setRemaining(`${d}天 ${h}时 ${m}分`)
      else if (h > 0) setRemaining(`${h}时 ${m}分 ${s}秒`)
      else if (m > 0) setRemaining(`${m}分 ${s}秒`)
      else setRemaining(`${s}秒`)
    }

    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [deadline])

  return { remaining, expired }
}

export function PollDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const { showNotification } = useNotification()

  const [poll, setPoll] = useState<Poll | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [voting, setVoting] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [copied, setCopied] = useState(false)

  const pollRef = useRef<Poll | null>(null)
  pollRef.current = poll

  const { remaining, expired } = useCountdown(poll?.deadline)

  const loadPoll = useCallback(async () => {
    try {
      const data = await api.getPoll(id)
      setPoll(prev => {
        if (!prev || JSON.stringify(prev.options.map(o => o.votes)) !== JSON.stringify(data.options.map(o => o.votes))) {
          return data
        }
        return prev
      })
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [id, showNotification])

  useEffect(() => {
    loadPoll()
    const interval = setInterval(loadPoll, 1000)
    return () => clearInterval(interval)
  }, [loadPoll])

  useEffect(() => {
    const tokens = JSON.parse(localStorage.getItem('creatorTokens') || '{}')
    setIsCreator(!!tokens[id])
    setShareLink(`${window.location.origin}/poll/${id}`)
  }, [id])

  const handleVote = async () => {
    if (!selectedOption || !poll) return
    setVoting(true)
    try {
      await api.vote(id, selectedOption)
      showNotification('success', '投票成功！')
      setSelectedOption(null)
      loadPoll()
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : '投票失败')
    } finally {
      setVoting(false)
    }
  }

  const handleReset = async () => {
    const tokens = JSON.parse(localStorage.getItem('creatorTokens') || '{}')
    const token = tokens[id]
    if (!token) {
      showNotification('error', '无权限操作')
      return
    }
    setResetting(true)
    try {
      await api.resetPoll(id, token)
      showNotification('success', '投票结果已重置')
      setShowResetModal(false)
      loadPoll()
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : '重置失败')
    } finally {
      setResetting(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      showNotification('success', '链接已复制到剪贴板')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showNotification('error', '复制失败，请手动复制')
    }
  }

  if (loading) {
    return <div className="empty-state">加载中...</div>
  }

  if (!poll) {
    return <div className="card empty-state"><h3>投票不存在</h3></div>
  }

  const isPollExpired = poll.isExpired || expired
  const canVote = !isPollExpired && !poll.hasVoted
  const showVoteButton = !poll.hasVoted

  return (
    <div>
      <div className="poll-detail-header">
        <h2 className="poll-detail-title">{poll.title}</h2>
        <div className="poll-detail-info">
          <span>创建时间：{formatDate(poll.createdAt)}</span>
          {poll.deadline && (
            <span className={`countdown ${expired ? 'expired' : ''}`}>
              ⏱ {remaining}
            </span>
          )}
          <span>
            总票数：<strong style={{ color: 'var(--primary)' }}>{poll.totalVotes}</strong>
          </span>
          <span className={`status-badge ${isPollExpired ? 'status-expired' : 'status-active'}`}>
            {isPollExpired ? '已截止' : '进行中'}
          </span>
        </div>
      </div>

      <div className="poll-detail-layout">
        <div className="card">
          <h3 style={{ marginBottom: 16, color: 'var(--primary)' }}>投票选项</h3>

          {poll.hasVoted ? (
            <div style={{
              padding: '12px 16px',
              background: '#e8f5e9',
              color: '#2e7d32',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14
            }}>
              ✓ 您已完成投票
            </div>
          ) : isPollExpired ? (
            <div style={{
              padding: '12px 16px',
              background: '#ffebee',
              color: '#c62828',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 14
            }}>
              × 投票已截止
            </div>
          ) : null}

          <div className="voting-options">
            {poll.options.map(option => {
              const isSelected = selectedOption === option.id
              const isUserVote = poll.userVote === option.id
              const isVoted = poll.hasVoted && isUserVote

              return (
                <div
                  key={option.id}
                  className={`vote-option ${isSelected ? 'selected' : ''} ${isVoted ? 'voted' : ''}`}
                  onClick={() => {
                    if (canVote) setSelectedOption(option.id)
                  }}
                  style={{ cursor: canVote ? 'pointer' : 'default' }}
                >
                  <div className="vote-option-radio">
                    {(isSelected || isVoted) && <div className="vote-option-radio-dot" />}
                  </div>
                  <div className="vote-option-text">{option.text}</div>
                  {poll.hasVoted && (
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {option.votes} 票
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {showVoteButton && (
            <div className="vote-actions">
              <button
                className="btn btn-primary"
                onClick={handleVote}
                disabled={!canVote || !selectedOption || voting}
              >
                {isPollExpired ? '投票已截止' : voting ? '提交中...' : '提交投票'}
              </button>
            </div>
          )}

          {isCreator && (
            <div className="link-share-section">
              <div className="link-share-title">分享此投票</div>
              <div className="link-input-row">
                <input
                  type="text"
                  className="form-input"
                  value={shareLink}
                  readOnly
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={copyLink}
                >
                  {copied ? '已复制' : '复制链接'}
                </button>
              </div>
              <div className="qrcode-container">
                <QRCode value={shareLink} size={180} />
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setShowResetModal(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                  </svg>
                  重置投票结果
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="card chart-section">
          <div className="chart-header">
            <h3 className="chart-title">实时投票结果</h3>
            <p className="chart-subtitle">共 {poll.totalVotes} 人参与投票 · 每秒自动更新</p>
          </div>
          {poll.totalVotes === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <p style={{ color: 'var(--text-secondary)' }}>暂无投票数据</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>投票后结果将实时显示在这里</p>
            </div>
          ) : (
            <BarChart
              options={poll.options}
              totalVotes={poll.totalVotes}
            />
          )}
        </div>
      </div>

      <Modal
        open={showResetModal}
        title="确认重置投票"
        message="此操作将清空所有投票记录，且无法恢复。确定要重置吗？"
        confirmText={resetting ? '重置中...' : '确认重置'}
        cancelText="取消"
        danger
        onConfirm={handleReset}
        onCancel={() => !resetting && setShowResetModal(false)}
      />
    </div>
  )
}
