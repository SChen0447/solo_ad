import { useState, useEffect, useRef } from 'react'
import { getPosts, addPost, addComment, likePost, savePost } from '../api'
import type { Post, Comment } from '../types'

function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 30) return `${diffDays}天前`
  return `${Math.floor(diffDays / 30)}个月前`
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddPostModal, setShowAddPostModal] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [likeAnimations, setLikeAnimations] = useState<Set<string>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadPosts()
  }, [])

  async function loadPosts() {
    try {
      setLoading(true)
      const data = await getPosts()
      setPosts(data)
    } catch (error) {
      console.error('加载帖子失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPosts = posts.filter(
    post =>
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function handlePostClick(post: Post) {
    setSelectedPost(post)
    setCommentText('')
  }

  function handleCloseDetail() {
    setSelectedPost(null)
  }

  function handleOpenAddPost() {
    setShowAddPostModal(true)
    setNewPostContent('')
  }

  function handleCloseAddPost() {
    setShowAddPostModal(false)
  }

  async function handleSubmitPost(e: React.FormEvent) {
    e.preventDefault()
    if (!newPostContent.trim()) return

    try {
      setSubmitting(true)
      const newPost = await addPost(newPostContent.trim())
      setPosts(prev => [newPost, ...prev])
      setShowAddPostModal(false)
      setNewPostContent('')
    } catch (error) {
      console.error('发布帖子失败:', error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleLike(postId: string) {
    try {
      const updated = await likePost(postId)
      setPosts(prev => prev.map(p => (p.id === postId ? updated : p)))
      if (selectedPost?.id === postId) {
        setSelectedPost(updated)
      }

      if (updated.liked) {
        setLikeAnimations(prev => new Set(prev).add(postId))
        setTimeout(() => {
          setLikeAnimations(prev => {
            const next = new Set(prev)
            next.delete(postId)
            return next
          })
        }, 200)
      }
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  async function handleSave(postId: string) {
    try {
      const updated = await savePost(postId)
      setPosts(prev => prev.map(p => (p.id === postId ? updated : p)))
      if (selectedPost?.id === postId) {
        setSelectedPost(updated)
      }
    } catch (error) {
      console.error('收藏失败:', error)
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || !selectedPost || submittingComment) return

    try {
      setSubmittingComment(true)
      const newComment = await addComment(selectedPost.id, commentText.trim())
      const updatedPost = {
        ...selectedPost,
        comments: [newComment, ...selectedPost.comments]
      }
      setSelectedPost(updatedPost)
      setPosts(prev =>
        prev.map(p => (p.id === selectedPost.id ? updatedPost : p))
      )
      setCommentText('')

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('评论失败:', error)
    } finally {
      setSubmittingComment(false)
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setCommentText(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }

  if (loading) {
    return (
      <div className="community-page">
        <div className="loading">加载中...</div>
      </div>
    )
  }

  return (
    <div className="community-page">
      <div className="page-header">
        <h1 className="page-title">社区</h1>
      </div>

      <div className="community-header">
        <button className="add-post-btn" onClick={handleOpenAddPost}>
          + 发帖
        </button>
        <div className="search-box">
          <input
            className="search-input"
            type="text"
            placeholder="搜索帖子..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <p>{searchQuery ? '没有找到相关帖子' : '暂无帖子，快来发布第一条吧！'}</p>
        </div>
      ) : (
        <div className="posts-list">
          {filteredPosts.map(post => (
            <div
              key={post.id}
              className="post-card"
              onClick={() => handlePostClick(post)}
            >
              <div className="post-header">
                <img
                  className="post-avatar"
                  src={post.avatar}
                  alt={post.author}
                />
                <div className="post-meta">
                  <div className="post-author">{post.author}</div>
                  <div className="post-time">{formatRelativeTime(post.time)}</div>
                </div>
              </div>
              <div className="post-content">{post.content}</div>
              <div className="post-actions" onClick={e => e.stopPropagation()}>
                <button
                  className={`action-btn ${post.liked ? 'liked' : ''} ${likeAnimations.has(post.id) ? 'like-animation' : ''}`}
                  onClick={() => handleLike(post.id)}
                >
                  <span>{post.liked ? '❤️' : '🤍'}</span>
                  <span>{post.likes}</span>
                </button>
                <button className="action-btn">
                  <span>💬</span>
                  <span>{post.comments.length}</span>
                </button>
                <button
                  className={`action-btn ${post.saved ? 'saved' : ''}`}
                  onClick={() => handleSave(post.id)}
                >
                  <span>{post.saved ? '⭐' : '☆'}</span>
                  <span>收藏</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddPostModal && (
        <div className="modal-overlay" onClick={handleCloseAddPost}>
          <div
            className="modal-content center-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">发布帖子</h2>
              <button className="close-btn" onClick={handleCloseAddPost}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmitPost}>
                <div className="form-group">
                  <label className="form-label">分享你的养护心得</label>
                  <textarea
                    className="form-input"
                    rows={6}
                    value={newPostContent}
                    onChange={e => setNewPostContent(e.target.value)}
                    placeholder="说说你的养护经验..."
                    style={{ resize: 'none' }}
                  />
                </div>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting || !newPostContent.trim()}
                >
                  {submitting ? '发布中...' : '发布'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedPost && (
        <div className="post-detail">
          <div className="post-detail-header">
            <button className="back-btn" onClick={handleCloseDetail}>
              ←
            </button>
            <div className="post-detail-author">
              <img
                className="post-detail-avatar"
                src={selectedPost.avatar}
                alt={selectedPost.author}
              />
              <div>
                <div className="post-author">{selectedPost.author}</div>
                <div className="post-time">{formatRelativeTime(selectedPost.time)}</div>
              </div>
            </div>
          </div>

          <div className="post-detail-body">
            <div className="post-full-content">{selectedPost.content}</div>

            <div className="post-actions" style={{ marginTop: 0 }}>
              <button
                className={`action-btn ${selectedPost.liked ? 'liked' : ''} ${likeAnimations.has(selectedPost.id) ? 'like-animation' : ''}`}
                onClick={() => handleLike(selectedPost.id)}
              >
                <span>{selectedPost.liked ? '❤️' : '🤍'}</span>
                <span>{selectedPost.likes}</span>
              </button>
              <button className="action-btn">
                <span>💬</span>
                <span>{selectedPost.comments.length}</span>
              </button>
              <button
                className={`action-btn ${selectedPost.saved ? 'saved' : ''}`}
                onClick={() => handleSave(selectedPost.id)}
              >
                <span>{selectedPost.saved ? '⭐' : '☆'}</span>
                <span>收藏</span>
              </button>
            </div>

            <div className="comments-section">
              <h3 className="comments-title">
                评论 ({selectedPost.comments.length})
              </h3>
              {selectedPost.comments.length === 0 ? (
                <p style={{ color: '#999', fontSize: '14px', padding: '20px 0' }}>
                  暂无评论，快来抢沙发吧！
                </p>
              ) : (
                selectedPost.comments.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <img
                      className="comment-avatar"
                      src={comment.avatar}
                      alt={comment.author}
                    />
                    <div className="comment-content">
                      <div className="comment-author">{comment.author}</div>
                      <div className="comment-text">{comment.content}</div>
                      <div className="comment-time">{formatRelativeTime(comment.time)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <form className="comment-input-area" onSubmit={handleSubmitComment}>
            <textarea
              ref={textareaRef}
              className="comment-textarea"
              value={commentText}
              onChange={handleTextareaChange}
              placeholder="写下你的评论..."
              rows={1}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!commentText.trim() || submittingComment}
            >
              发送
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
