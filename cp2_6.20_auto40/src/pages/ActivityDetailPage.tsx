/* ============================================
 * 活动详情页面
 * 上游组件：App.tsx（通过React Router渲染 /activity/:id）
 * 下游组件：Modal
 * 数据流向：
 *   - 接收：useParams() 获取活动id
 *   - 调用：api.getActivity / api.getReviews / api.getUser → 渲染详情
 *   - 操作：报名(registerActivity)、取消报名(unregisterActivity)
 *          点赞(likeReview)、上传回顾(createReview)
 * ============================================ */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Modal from '../components/Modal'
import { api } from '../api'
import type { Activity, Review } from '../types'
import { ActivityTypeLabels, DifficultyLabels } from '../types'

const ActivityDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading')
  const [reviewForm, setReviewForm] = useState({ imageUrl: '', content: '' })
  const [likeAnimIds, setLikeAnimIds] = useState<Set<string>>(new Set())
  const [submitLoading, setSubmitLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    loadData(id)
  }, [id])

  const loadData = async (activityId: string) => {
    setLoadState('loading')
    try {
      const [act, rev, user] = await Promise.all([
        api.getActivity(activityId),
        api.getReviews(activityId),
        api.getUser().catch(() => null)
      ])
      setActivity(act)
      setReviews(rev)
      if (user) {
        const allIds = [...user.registeredActivities, ...user.completedActivities]
        setIsRegistered(allIds.includes(activityId))
      }
      setLoadState('done')
    } catch (e) {
      console.error(e)
      setLoadState('error')
    }
  }

  const handleRegister = async () => {
    if (!activity) return
    try {
      if (isRegistered) {
        await api.unregisterActivity(activity.id)
        setIsRegistered(false)
      } else {
        await api.registerActivity(activity.id)
        setIsRegistered(true)
      }
      const act = await api.getActivity(activity.id)
      setActivity(act)
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    }
  }

  const handleLike = async (review: Review) => {
    try {
      setLikeAnimIds(prev => {
        const s = new Set(prev)
        s.add(review.id)
        return s
      })
      setTimeout(() => {
        setLikeAnimIds(prev => {
          const s = new Set(prev)
          s.delete(review.id)
          return s
        })
      }, 250)
      const res = await api.likeReview(review.id)
      setReviews(prev => prev.map(r => r.id === review.id ? res.review : r))
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !reviewForm.content.trim()) {
      alert('请输入评论内容')
      return
    }
    setSubmitLoading(true)
    try {
      const newRev = await api.createReview(id, reviewForm)
      setReviews(prev => [newRev, ...prev])
      setReviewForm({ imageUrl: '', content: '' })
      setShowReviewModal(false)
    } catch (e) {
      alert(e instanceof Error ? e.message : '提交失败')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loadState === 'loading') {
    return <div className="loading-state">加载中...</div>
  }
  if (loadState === 'error' || !activity) {
    return (
      <div className="page-container page-fade-in">
        <div className="empty-state">
          <div className="empty-icon">😔</div>
          <p className="empty-text">活动不存在或加载失败</p>
          <button className="btn-primary" onClick={() => navigate('/')}>返回活动列表</button>
        </div>
      </div>
    )
  }

  const dateObj = new Date(activity.date)
  const dateFull = dateObj.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  })
  const timeFull = dateObj.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  const diffInfo = DifficultyLabels[activity.difficulty]
  const isEnded = activity.status === 'ended' || new Date(activity.date) < new Date()
  const isFull = activity.participants.length >= activity.maxParticipants
  const progress = Math.min((activity.participants.length / activity.maxParticipants) * 100, 100)

  return (
    <div className="page-container page-fade-in">
      <button className="back-btn" onClick={() => navigate(-1)}>
        ← 返回
      </button>

      <div className="detail-cover">
        <img src={activity.coverImage} alt={activity.title} />
        <div className="detail-cover-overlay" />
        <div className="detail-cover-content">
          <div className="detail-tags">
            <span className="detail-tag" style={{ backgroundColor: '#2E7D32' }}>
              {ActivityTypeLabels[activity.type]}
            </span>
            <span className="detail-tag" style={{ backgroundColor: diffInfo.color }}>
              难度: {diffInfo.label}
            </span>
            {isEnded && <span className="detail-tag tag-ended">已结束</span>}
          </div>
          <h1 className="detail-title">{activity.title}</h1>
          <div className="detail-meta-row">
            <span>📅 {dateFull} {timeFull}</span>
            <span>📍 {activity.location}</span>
            <span>👥 {activity.participants.length}/{activity.maxParticipants}人</span>
          </div>
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-main">
          <div className="detail-section">
            <h3 className="section-title">活动介绍</h3>
            <p className="detail-desc">{activity.description}</p>
          </div>

          <div className="detail-section">
            <h3 className="section-title">行程安排</h3>
            <div className="itinerary-box">
              {activity.itinerary.split('\n').map((line, i) => (
                line.trim() ? <div key={i} className="itinerary-line">{line}</div> : null
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">报名成员 ({activity.participants.length})</h3>
            <div className="participants-list">
              {activity.participants.map(p => (
                <div key={p.id} className="participant-item">
                  <img src={p.avatar} alt={p.name} className="participant-avatar" />
                  <span className="participant-name">{p.name}</span>
                </div>
              ))}
              {activity.participants.length === 0 && (
                <p className="empty-sub">暂无报名成员，快来第一个报名吧！</p>
              )}
            </div>
          </div>

          <div className="detail-section">
            <div className="section-header">
              <h3 className="section-title">活动回顾 ({reviews.length})</h3>
              {(isEnded && isRegistered) && (
                <button className="btn-primary btn-sm" onClick={() => setShowReviewModal(true)}>
                  📸 上传回顾
                </button>
              )}
            </div>
            {reviews.length === 0 ? (
              <p className="empty-sub">暂无回顾，{isEnded ? '来分享你的体验吧！' : '活动结束后可上传回顾'}</p>
            ) : (
              <div className="timeline">
                {reviews.map(r => {
                  const liked = r.likedBy.includes('user-001')
                  return (
                    <div key={r.id} className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="review-card">
                        <div className="review-header">
                          <img src={r.userAvatar} alt={r.userName} className="review-avatar" />
                          <div className="review-user-info">
                            <span className="review-user-name">{r.userName}</span>
                            <span className="review-time">
                              {new Date(r.createdAt).toLocaleString('zh-CN', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        {r.imageUrl && (
                          <div className="review-image-wrap">
                            <img src={r.imageUrl} alt="review" className="review-image" />
                          </div>
                        )}
                        <p className="review-content">{r.content}</p>
                        <div className="review-footer">
                          <button
                            className={`like-btn ${liked ? 'liked' : ''} ${likeAnimIds.has(r.id) ? 'like-anim' : ''}`}
                            onClick={() => handleLike(r)}
                          >
                            <span className="like-icon">{liked ? '❤️' : '🤍'}</span>
                            <span className="like-count">{r.likes}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="sticky-card">
            <h4 className="sidebar-title">活动报名</h4>
            <div className="sidebar-progress">
              <div className="card-progress-bar">
                <div className="card-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="sidebar-progress-text">
                {activity.participants.length} / {activity.maxParticipants} 人已报名
              </span>
            </div>

            <div className="sidebar-info">
              <div className="sidebar-info-row">
                <span className="info-label">主办方</span>
                <span className="info-value">{activity.organizer}</span>
              </div>
              <div className="sidebar-info-row">
                <span className="info-label">集合时间</span>
                <span className="info-value">{dateFull} {timeFull}</span>
              </div>
              <div className="sidebar-info-row">
                <span className="info-label">集合地点</span>
                <span className="info-value">{activity.location}</span>
              </div>
            </div>

            <button
              className={`btn-block ${isEnded ? 'btn-disabled' : isFull ? 'btn-disabled' : isRegistered ? 'btn-registered' : 'btn-primary'}`}
              onClick={handleRegister}
              disabled={isEnded || isFull}
            >
              {isEnded ? '活动已结束' : isFull ? '人数已满' : isRegistered ? '✓ 已报名，点击取消' : '立即报名'}
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showReviewModal}
        title="上传活动回顾"
        onClose={() => !submitLoading && setShowReviewModal(false)}
        width="500px"
      >
        <form onSubmit={handleSubmitReview} className="form-group">
          <div className="form-row">
            <label className="form-label">图片URL（可选）</label>
            <input
              className="form-input"
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={reviewForm.imageUrl}
              onChange={e => setReviewForm({ ...reviewForm, imageUrl: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label className="form-label">活动评论 *</label>
            <textarea
              className="form-textarea"
              placeholder="分享你的户外体验、精彩瞬间、建议心得..."
              rows={5}
              value={reviewForm.content}
              onChange={e => setReviewForm({ ...reviewForm, content: e.target.value })}
              required
            />
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowReviewModal(false)}
              disabled={submitLoading}
            >
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={submitLoading}>
              {submitLoading ? '提交中...' : '发布回顾'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ActivityDetailPage
