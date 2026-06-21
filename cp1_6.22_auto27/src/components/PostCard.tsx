import { useState, useRef, useEffect } from 'react'
import { Post, Comment, getTagColor, TAGS, api } from '../api'
import { DateTime } from 'luxon'

interface PostCardProps {
  post: Post
  isNew: boolean
  currentUserName: string
  isLiked: boolean
  onLike: () => void
  onUpdate: (id: string, content: string, tags: string[]) => void
  onDelete: (id: string) => void
  onCommentAdded: () => void
}

function formatTime(timestamp: number): string {
  const now = DateTime.now()
  const postTime = DateTime.fromMillis(timestamp)
  const diff = now.diff(postTime, ['days', 'hours', 'minutes'])

  if (diff.days > 0) {
    return `${Math.floor(diff.days)}天前`
  }
  if (diff.hours > 0) {
    return `${Math.floor(diff.hours)}小时前`
  }
  if (diff.minutes > 0) {
    return `${Math.floor(diff.minutes)}分钟前`
  }
  return '刚刚'
}

function canEdit(createdAt: number): boolean {
  const now = Date.now()
  const tenMinutes = 10 * 60 * 1000
  return now - createdAt < tenMinutes
}

function PostCard({
  post,
  isNew,
  currentUserName,
  isLiked,
  onLike,
  onUpdate,
  onDelete,
  onCommentAdded,
}: PostCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [editTags, setEditTags] = useState<string[]>(post.tags)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [isLikeAnimating, setIsLikeAnimating] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isAuthor = post.author === currentUserName

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadComments = async () => {
    if (showComments) return
    try {
      setCommentsLoading(true)
      const data = await api.getComments(post.id)
      setComments(data)
    } catch (err) {
      console.error('加载评论失败', err)
    } finally {
      setCommentsLoading(false)
    }
  }

  const toggleComments = () => {
    if (!showComments) {
      loadComments()
    }
    setShowComments(!showComments)
  }

  const handleLike = () => {
    if (!isLikeAnimating) {
      setIsLikeAnimating(true)
      onLike()
      setTimeout(() => setIsLikeAnimating(false), 300)
    }
  }

  const handleSubmitComment = async () => {
    if (!commentInput.trim()) return
    try {
      const newComment = await api.createComment(post.id, {
        author: currentUserName,
        content: commentInput.trim(),
      })
      setComments((prev) => [...prev, newComment])
      setCommentInput('')
      onCommentAdded()
    } catch (err) {
      console.error('评论失败', err)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitComment()
    }
  }

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    }
  }

  const startEdit = () => {
    setEditContent(post.content)
    setEditTags(post.tags)
    setIsEditing(true)
    setShowMenu(false)
  }

  const handleSaveEdit = () => {
    if (!editContent.trim()) return
    if (editContent.length > 140) return
    onUpdate(post.id, editContent.trim(), editTags)
    setIsEditing(false)
  }

  const toggleEditTag = (tagName: string) => {
    if (editTags.includes(tagName)) {
      setEditTags(editTags.filter((t) => t !== tagName))
    } else if (editTags.length < 3) {
      setEditTags([...editTags, tagName])
    }
  }

  const handleDelete = () => {
    if (window.confirm('确定要删除这条漂流瓶吗？')) {
      onDelete(post.id)
    }
    setShowMenu(false)
  }

  return (
    <div className={`post-card ${isNew ? 'new' : ''}`}>
      <div className="post-header">
        <div>
          <div className="post-author">{post.author}</div>
          <div className="post-time">{formatTime(post.createdAt)}</div>
        </div>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            className="post-menu-btn"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="更多操作"
          >
            ⋮
          </button>
          {showMenu && (
            <div className="post-menu">
              <button
                className="post-menu-item"
                onClick={startEdit}
                disabled={!isAuthor || !canEdit(post.createdAt)}
              >
                编辑
              </button>
              <button
                className="post-menu-item danger"
                onClick={handleDelete}
                disabled={!isAuthor}
              >
                删除
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <>
          <textarea
            className="post-edit-input"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleEditKeyPress}
            autoFocus
            maxLength={140}
          />
          <div className="edit-tags">
            {TAGS.map((tag) => {
              const isSelected = editTags.includes(tag.name)
              const isDisabled = !isSelected && editTags.length >= 3
              const colors = getTagColor(tag.name)
              return (
                <span
                  key={tag.name}
                  className={`edit-tag-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                    opacity: isDisabled ? 0.4 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => !isDisabled && toggleEditTag(tag.name)}
                >
                  #{tag.name}
                </span>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              className="comment-btn"
              onClick={() => setIsEditing(false)}
              style={{ padding: '6px 16px' }}
            >
              取消
            </button>
            <button
              className="comment-submit"
              onClick={handleSaveEdit}
              disabled={!editContent.trim() || editContent.length > 140}
              style={{ padding: '6px 16px' }}
            >
              保存
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="post-content">{post.content}</div>
          <div className="post-tags">
            {post.tags.map((tag) => {
              const colors = getTagColor(tag)
              return (
                <span
                  key={tag}
                  className="post-tag"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  #{tag}
                </span>
              )
            })}
          </div>
        </>
      )}

      <div className="post-actions">
        <button
          className={`like-btn ${isLiked ? 'liked' : ''} ${isLikeAnimating ? 'bounce' : ''}`}
          onClick={handleLike}
        >
          <span className="heart-icon">{isLiked ? '❤️' : '🤍'}</span>
          <span>{post.likes}</span>
        </button>
        <button
          className={`comment-btn ${showComments ? 'active' : ''}`}
          onClick={toggleComments}
        >
          <span>💬</span>
          <span>{comments.length}</span>
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          {commentsLoading ? (
            <div className="loading" style={{ padding: '16px' }}>加载评论中...</div>
          ) : (
            <div className="comments-list">
              {comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-header">
                    <span className="comment-author">{comment.author}</span>
                    <span className="comment-time">{formatTime(comment.createdAt)}</span>
                  </div>
                  <div className="comment-content">{comment.content}</div>
                </div>
              ))}
            </div>
          )}
          <div className="comment-input-container">
            <input
              type="text"
              className="comment-input"
              placeholder="说点什么..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <button
              className="comment-submit"
              onClick={handleSubmitComment}
              disabled={!commentInput.trim()}
            >
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PostCard
