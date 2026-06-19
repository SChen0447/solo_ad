import { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, Clock, MapPin, Users, Tag, MessageCircle } from 'lucide-react'
import { type Activity, useAppContext } from '@/App'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  const hours = d.getHours().toString().padStart(2, '0')
  const mins = d.getMinutes().toString().padStart(2, '0')
  return `${month}月${day}日 ${hours}:${mins}`
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state, updateActivity, showToast } = useAppContext()
  const [likeAnimating, setLikeAnimating] = useState(false)
  const [commentNick, setCommentNick] = useState('')
  const [commentContent, setCommentContent] = useState('')
  const [newCommentId, setNewCommentId] = useState<string | null>(null)

  const activity = state.activities.find((a: Activity) => a.id === id)

  const isRegistered = activity?.registrations.some(r => r.userId === state.currentUser.id) ?? false
  const isLiked = activity?.likes.includes(state.currentUser.id) ?? false
  const isFull = activity ? activity.registrations.length >= activity.maxParticipants : false

  const sortedComments = useMemo(() => {
    if (!activity) return []
    return [...activity.comments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [activity])

  const handleRegister = useCallback(async () => {
    if (!activity || isFull) return
    try {
      if (isRegistered) {
        const res = await fetch(`/api/activities/${activity.id}/register`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: state.currentUser.id }),
        })
        const data = await res.json()
        if (res.ok) {
          updateActivity(data)
          showToast('已取消报名')
        }
      } else {
        const res = await fetch(`/api/activities/${activity.id}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: state.currentUser.id,
            userName: state.currentUser.name,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          updateActivity(data)
          showToast('报名成功！')
        } else {
          showToast(data.message || '报名失败', 'error')
        }
      }
    } catch {
      showToast('网络错误', 'error')
    }
  }, [activity, isFull, isRegistered, state.currentUser, updateActivity, showToast])

  const handleLike = useCallback(async () => {
    if (!activity) return
    setLikeAnimating(true)
    setTimeout(() => setLikeAnimating(false), 200)
    try {
      const res = await fetch(`/api/activities/${activity.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: state.currentUser.id }),
      })
      const data = await res.json()
      if (res.ok) {
        updateActivity(data)
      }
    } catch {
      showToast('网络错误', 'error')
    }
  }, [activity, state.currentUser.id, updateActivity, showToast])

  const handleComment = useCallback(async () => {
    if (!activity || !commentContent.trim()) return
    try {
      const nick = commentNick.trim() || state.currentUser.name
      const res = await fetch(`/api/activities/${activity.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: state.currentUser.id,
          userName: nick,
          content: commentContent.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        const updatedActivity = { ...activity, comments: data }
        updateActivity(updatedActivity)
        if (data.length > 0) {
          setNewCommentId(data[0].id)
          setTimeout(() => setNewCommentId(null), 300)
        }
        setCommentContent('')
        showToast('评论成功！')
      }
    } catch {
      showToast('网络错误', 'error')
    }
  }, [activity, commentNick, commentContent, state.currentUser, updateActivity, showToast])

  if (!activity) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '120px' }}>
        <p style={{ color: '#B2BEC3', marginBottom: '16px' }}>活动不存在</p>
        <button className="btn-primary" onClick={() => navigate('/')}>返回首页</button>
      </div>
    )
  }

  const percent = Math.round((activity.registrations.length / activity.maxParticipants) * 100)

  return (
    <div>
      <div className="detail-cover" style={{ background: `linear-gradient(135deg, ${activity.coverColor}, ${activity.coverColor}cc)` }}>
        <div className="detail-cover-overlay" />
        <button
          onClick={() => navigate('/')}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'rgba(255,255,255,0.9)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1,
          }}
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="container">
        <div className="detail-content">
          <h1 className="detail-title">{activity.title}</h1>

          <div className="detail-meta">
            <span className="detail-meta-tag"><Clock size={14} /> {formatDate(activity.time)}</span>
            <span className="detail-meta-tag"><MapPin size={14} /> {activity.location}</span>
            <span className="detail-meta-tag"><Tag size={14} /> {activity.type}</span>
            <span className="detail-meta-tag"><Users size={14} /> {activity.registrations.length}/{activity.maxParticipants}人</span>
          </div>

          <p className="detail-description">{activity.description}</p>

          <div className="detail-register-section">
            {isFull ? (
              <button className="detail-register-btn full" disabled>
                已满
              </button>
            ) : isRegistered ? (
              <button className="detail-register-btn registered" onClick={handleRegister}>
                已报名 · 点击取消
              </button>
            ) : (
              <button className="detail-register-btn" onClick={handleRegister}>
                立即报名
              </button>
            )}
            <div className="detail-avatars">
              {activity.registrations.slice(0, 8).map(r => (
                <div
                  key={r.id}
                  className="detail-avatar"
                  style={{ background: r.avatarColor }}
                  title={r.userName}
                >
                  {r.userName.charAt(0)}
                </div>
              ))}
              {activity.registrations.length > 8 && (
                <div className="detail-avatars-more">
                  +{activity.registrations.length - 8}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '8px', fontSize: '13px', color: '#636E72' }}>
            报名进度：{activity.registrations.length}/{activity.maxParticipants} ({percent}%)
          </div>
          <div className="activity-card-progress-bar" style={{ marginBottom: '24px' }}>
            <div
              className="activity-card-progress-fill"
              style={{
                width: `${percent}%`,
                background: percent < 60 ? '#4ECDC4' : percent < 85 ? '#F39C12' : '#FF6B6B',
              }}
            />
          </div>

          <button
            className={`detail-like-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <span className={`like-icon ${likeAnimating ? 'like-pulse' : ''}`}>
              <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
            </span>
            {isLiked ? '已点赞' : '点赞'} · {activity.likes.length}
          </button>

          <div className="comment-section">
            <h2 className="comment-section-title">
              <MessageCircle size={20} /> 评论区 ({activity.comments.length})
            </h2>

            <div className="comment-form">
              <input
                className="comment-form-nickname"
                type="text"
                placeholder="昵称"
                value={commentNick}
                onChange={e => setCommentNick(e.target.value)}
              />
              <input
                className="comment-form-content"
                type="text"
                placeholder="写下你的评论..."
                value={commentContent}
                onChange={e => setCommentContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleComment() }}
              />
              <button className="comment-form-submit" onClick={handleComment}>
                发送
              </button>
            </div>

            <div className="comment-list">
              {sortedComments.map(comment => (
                <div
                  key={comment.id}
                  className={`comment-item ${comment.id === newCommentId ? 'comment-fade-in' : ''}`}
                >
                  <div
                    className="comment-avatar"
                    style={{ background: comment.avatarColor }}
                  >
                    {comment.userName.charAt(0)}
                  </div>
                  <div className="comment-body">
                    <div className="comment-header">
                      <span className="comment-name">{comment.userName}</span>
                      <span className="comment-time">{formatTimeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="comment-text">{comment.content}</p>
                  </div>
                </div>
              ))}
              {sortedComments.length === 0 && (
                <div className="profile-empty">暂无评论，来说点什么吧~</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
