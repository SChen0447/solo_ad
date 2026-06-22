import React, { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../context/AppContext'
import './Guestbook.css'

interface GuestbookProps {
  postcardId: string
}

const Guestbook: React.FC<GuestbookProps> = ({ postcardId }) => {
  const { messages, addMessage, refreshMessages, visitorId } = useAppContext()
  const [nickname, setNickname] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      refreshMessages()
    }, 5000)

    return () => clearInterval(interval)
  }, [refreshMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nickname.trim()) {
      setError('请输入昵称')
      return
    }
    if (!content.trim()) {
      setError('请输入留言内容')
      return
    }
    if (content.length > 50) {
      setError('留言不能超过50字')
      return
    }

    setIsSubmitting(true)
    try {
      await addMessage(nickname.trim(), content.trim())
      setContent('')
    } catch (err) {
      setError('留言发送失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${month}月${day}日 ${hours}:${minutes}`
  }

  return (
    <div className="guestbook-container">
      <h3 className="guestbook-title">💬 访客留言板</h3>
      
      <div className="messages-list">
        {messages.length === 0 ? (
          <p className="no-messages">还没有留言，来留下第一条祝福吧~</p>
        ) : (
          messages.map((msg, index) => {
            const isOwn = msg.visitorId === visitorId
            return (
              <div
                key={msg.id}
                className={`message-bubble ${isOwn ? 'own' : 'other'}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {!isOwn && (
                  <div className="message-avatar">{msg.nickname.charAt(0)}</div>
                )}
                <div className="message-body">
                  {!isOwn && <span className="message-nickname">{msg.nickname}</span>}
                  <div className="message-content">{msg.content}</div>
                  <span className="message-time">{formatTime(msg.createdAt)}</span>
                </div>
                {isOwn && (
                  <div className="message-avatar own-avatar">{msg.nickname.charAt(0)}</div>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="message-form">
        <div className="form-row">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="你的昵称"
            className="nickname-input"
            maxLength={20}
          />
        </div>
        <div className="form-row input-row">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的祝福... (限50字)"
            className="message-input"
            maxLength={50}
            rows={2}
          />
          <button 
            type="submit" 
            className="send-btn"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? '...' : '发送'}
          </button>
        </div>
        <div className="form-footer">
          {error && <span className="error-text">{error}</span>}
          <span className="char-count">{content.length}/50</span>
        </div>
      </form>
    </div>
  )
}

export default Guestbook
