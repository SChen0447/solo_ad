import { useState, useEffect } from 'react'
import type { Comment } from '../types'
import { addComment } from '../api'
import { useAppContext } from '../App'
import { formatRelativeTime, saveUserName, getCurrentUser } from '../utils'

interface CommentSectionProps {
  activityId: string
  comments: Comment[]
}

const CommentSection = ({ activityId, comments }: CommentSectionProps) => {
  const { state, dispatch } = useAppContext()
  const [userName, setUserName] = useState(getCurrentUser().name)
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newCommentId, setNewCommentId] = useState<string | null>(null)
  const [commentsList, setCommentsList] = useState<Comment[]>(comments)

  useEffect(() => {
    setCommentsList(comments)
  }, [comments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const comment = await addComment(activityId, state.currentUser.id, userName, content)
      dispatch({ type: 'ADD_COMMENT', payload: { activityId, comment } })
      setCommentsList([comment, ...commentsList])
      setNewCommentId(comment.id)
      setContent('')
      if (userName.trim()) {
        saveUserName(userName.trim())
      }
      setTimeout(() => setNewCommentId(null), 300)
    } catch (error) {
      console.error('评论失败:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="comments-section">
      <h2 className="comments-title">💬 评论 ({commentsList.length})</h2>

      <form className="comment-form" onSubmit={handleSubmit}>
        <div className="comment-inputs">
          <input
            type="text"
            className="input"
            placeholder="你的昵称"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            style={{ maxWidth: '150px' }}
          />
          <input
            type="text"
            className="input"
            placeholder="发表你的评论..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!content.trim() || isSubmitting}
          >
            {isSubmitting ? '发送中...' : '发表评论'}
          </button>
        </div>
      </form>

      <div className="comment-list">
        {commentsList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <p>暂无评论，快来抢沙发吧！</p>
          </div>
        ) : (
          commentsList.map((comment) => (
            <div
              key={comment.id}
              className={`comment-item ${newCommentId === comment.id ? 'comment-enter comment-enter-active' : ''}`}
            >
              <img
                src={comment.userAvatar}
                alt={comment.userName}
                className="comment-avatar"
              />
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-author">{comment.userName}</span>
                  <span className="comment-time">{formatRelativeTime(comment.createdAt)}</span>
                </div>
                <p className="comment-text">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default CommentSection
