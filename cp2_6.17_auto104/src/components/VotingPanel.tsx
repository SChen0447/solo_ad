import React, { useState, useCallback } from 'react'
import { Send, RefreshCw } from 'lucide-react'
import StarRating from './StarRating'
import { api } from '@/utils/api'
import type { Stage } from '../../shared/types'

interface VotingPanelProps {
  stages: Stage[]
  onVoteSuccess: () => void
}

function generateCaptcha(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 4; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

const VotingPanel: React.FC<VotingPanelProps> = ({ stages, onVoteSuccess }) => {
  const [stageCode, setStageCode] = useState('')
  const [seatNumber, setSeatNumber] = useState('')
  const [score, setScore] = useState(0)
  const [nickname, setNickname] = useState('')
  const [content, setContent] = useState('')
  const [captcha, setCaptcha] = useState(generateCaptcha())
  const [captchaInput, setCaptchaInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha())
    setCaptchaInput('')
  }, [])

  const handleSubmit = async () => {
    setMessage('')
    if (!stageCode || stageCode.length !== 6) {
      setMessage('请输入6位舞台编号')
      return
    }
    if (!seatNumber) {
      setMessage('请输入座位号')
      return
    }
    if (score === 0) {
      setMessage('请选择评分')
      return
    }
    if (!nickname.trim()) {
      setMessage('请输入昵称')
      return
    }
    if (captchaInput.toUpperCase() !== captcha) {
      setMessage('验证码错误')
      refreshCaptcha()
      return
    }

    const stage = stages.find(
      (s) => s.id.slice(0, 6) === stageCode || s.id === stageCode
    )
    if (!stage) {
      setMessage('未找到对应舞台')
      return
    }
    if (!stage.votingOpen) {
      setMessage('该舞台投票已关闭')
      return
    }

    setSubmitting(true)
    try {
      await api.voteStage(stage.id, { score, seatNumber })
      await api.createComment({
        stageId: stage.id,
        nickname: nickname.trim(),
        content: content.trim(),
        score,
      })
      setMessage('提交成功！')
      setScore(0)
      setContent('')
      setNickname('')
      setSeatNumber('')
      setStageCode('')
      refreshCaptcha()
      onVoteSuccess()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="rounded-xl p-5 backdrop-blur-md"
      style={{ background: 'rgba(255,255,255,0.08)' }}
    >
      <h3 className="text-white font-bold text-lg mb-4">观众投票</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-white/60 text-xs block mb-1">舞台编号（6位）</label>
          <input
            type="text"
            maxLength={6}
            value={stageCode}
            onChange={(e) => setStageCode(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
            placeholder="输入6位数字"
          />
        </div>
        <div>
          <label className="text-white/60 text-xs block mb-1">座位号</label>
          <input
            type="text"
            value={seatNumber}
            onChange={(e) => setSeatNumber(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
            placeholder="如 A12"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="text-white/60 text-xs block mb-1">昵称</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
          placeholder="你的昵称"
        />
      </div>

      <div className="mb-4">
        <label className="text-white/60 text-xs block mb-2">评分</label>
        <StarRating value={score} onChange={setScore} size={28} />
      </div>

      <div className="mb-4">
        <label className="text-white/60 text-xs block mb-1">评论（最多200字）</label>
        <textarea
          maxLength={200}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400 resize-none"
          rows={3}
          placeholder="说说你的感受..."
        />
        <span className="text-white/40 text-xs">{content.length}/200</span>
      </div>

      <div className="mb-4">
        <label className="text-white/60 text-xs block mb-1">验证码</label>
        <div className="flex items-center gap-2">
          <div className="bg-white/15 rounded-lg px-3 py-2 text-white font-mono text-lg tracking-widest select-none">
            {captcha}
          </div>
          <button
            type="button"
            onClick={refreshCaptcha}
            className="text-white/50 hover:text-white transition-colors"
          >
            <RefreshCw size={18} />
          </button>
          <input
            type="text"
            maxLength={4}
            value={captchaInput}
            onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
            placeholder="输入验证码"
          />
        </div>
      </div>

      {message && (
        <p
          className={`text-sm mb-3 ${
            message.includes('成功') ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {message}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
      >
        <Send size={16} />
        {submitting ? '提交中...' : '提交评分'}
      </button>
    </div>
  )
}

export default VotingPanel
