import { useState, useRef, useEffect } from 'react'
import { useCommunityPosts, PostData } from '../hooks/useCommunityPosts'
import ScentWheel, { WheelScent } from './ScentWheel'

const NOTE_LABEL: Record<string, string> = {
  top: '前调',
  middle: '中调',
  base: '后调',
}

const NOTE_COLOR: Record<string, string> = {
  top: '#FFCC80',
  middle: '#F48FB1',
  base: '#BCAAA4',
}

interface CommunityFeedProps {
  pendingFormula?: {
    name: string
    scents: { id: string; name: string; noteType: 'top' | 'middle' | 'base'; ratio: number }[]
  } | null
  onClearPendingFormula?: () => void
}

export default function CommunityFeed({ pendingFormula, onClearPendingFormula }: CommunityFeedProps) {
  const { posts, loading, toggleLike, addComment, createPost } = useCommunityPosts()
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null)
  const [commentInput, setCommentInput] = useState('')
  const [showPostDialog, setShowPostDialog] = useState(false)
  const [postTitle, setPostTitle] = useState('')
  const [postDescription, setPostDescription] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)
  const scrollPositionRef = useRef(0)

  useEffect(() => {
    if (pendingFormula) {
      setShowPostDialog(true)
      setPostTitle(pendingFormula.name)
    }
  }, [pendingFormula])

  useEffect(() => {
    if (selectedPost && feedRef.current) {
      scrollPositionRef.current = feedRef.current.scrollTop
    } else if (!selectedPost && feedRef.current) {
      requestAnimationFrame(() => {
        if (feedRef.current) {
          feedRef.current.scrollTop = scrollPositionRef.current
        }
      })
    }
  }, [selectedPost])

  const handleLike = (post: PostData, e: React.MouseEvent) => {
    e.stopPropagation()
    toggleLike(post.id, 'guest')
  }

  const handleOpenDetail = (post: PostData) => {
    setSelectedPost(post)
    setCommentInput('')
  }

  const handleCloseDetail = () => {
    setSelectedPost(null)
  }

  const handleSubmitComment = async () => {
    if (!commentInput.trim() || !selectedPost) return
    await addComment(selectedPost.id, commentInput.trim(), 'guest', '我')
    setCommentInput('')
  }

  const handleCreatePost = async () => {
    if (!pendingFormula || !postTitle.trim()) {
      alert('请输入帖子标题')
      return
    }
    const formulaId = `formula-${Date.now()}`
    await createPost({
      formulaId,
      formula: {
        id: formulaId,
        name: pendingFormula.name,
        authorId: 'guest',
        authorName: '我',
        authorAvatar: '🧑',
        scents: pendingFormula.scents,
        createdAt: Date.now(),
        likes: 0,
        likedBy: [],
        comments: [],
      },
      title: postTitle,
      description: postDescription,
      authorId: 'guest',
      authorName: '我',
      authorAvatar: '🧑',
    })
    setShowPostDialog(false)
    setPostTitle('')
    setPostDescription('')
    onClearPendingFormula?.()
    alert('发布成功！')
  }

  const updatedSelectedPost = selectedPost
    ? posts.find((p) => p.id === selectedPost.id) || selectedPost
    : null

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 56px)' }}>
      <div
        ref={feedRef}
        style={{
          height: '100%',
          overflowY: 'auto',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#4E342E',
              marginBottom: 8,
            }}
          >
            香氛社区
          </h2>
          <p style={{ fontSize: 14, color: '#8D6E63', marginBottom: 24 }}>
            发现有趣的香氛配方，与调香爱好者分享创意
          </p>

          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: 60,
                color: '#A1887F',
                fontSize: 14,
              }}
            >
              加载中...
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, 320px)',
                gap: 20,
                justifyContent: 'flex-start',
              }}
            >
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => handleOpenDetail(post)}
                  style={{
                    width: 320,
                    minWidth: 320,
                    maxWidth: 320,
                    borderRadius: 12,
                    background: '#FFFFFF',
                    border: '0.5px solid #E0E0E0',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'
                    ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                    ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: '#FFE0B2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                      }}
                    >
                      {post.authorAvatar}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#4E342E',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {post.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#8D6E63' }}>
                        {post.authorName} · {post.formula.name}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      padding: '8px 0',
                      marginBottom: 12,
                    }}
                  >
                    <ScentWheel
                      scents={post.formula.scents as WheelScent[]}
                      size={150}
                      interactive={false}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      paddingTop: 12,
                      borderTop: '1px solid #F5F5F5',
                    }}
                  >
                    <div
                      onClick={(e) => handleLike(post, e)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer',
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill={post.likedBy.includes('guest') ? '#E53935' : 'none'}
                        stroke={post.likedBy.includes('guest') ? '#E53935' : '#9E9E9E'}
                        strokeWidth="2"
                        style={{ transition: 'all 0.2s' }}
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                      <span
                        style={{
                          fontSize: 13,
                          color: post.likedBy.includes('guest') ? '#E53935' : '#757575',
                        }}
                      >
                        {post.likes}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9E9E9E" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span style={{ fontSize: 13, color: '#757575' }}>{post.comments.length}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {updatedSelectedPost && (
        <>
          <div
            onClick={handleCloseDetail}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 100,
              animation: 'mask-fade-in 0.3s ease-out forwards',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(680px, 100vw)',
              background: '#FFF8E1',
              zIndex: 101,
              boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
              overflowY: 'auto',
              animation: 'detail-slide-in-right 0.3s ease-out forwards',
            }}
          >
            <div
              style={{
                position: 'sticky',
                top: 0,
                background: '#FFF8E1',
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #FFE0B2',
                zIndex: 1,
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#4E342E' }}>配方详情</h2>
              <button
                onClick={handleCloseDetail}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#EFEBE9',
                  color: '#5D4037',
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: '#FFE0B2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                  }}
                >
                  {updatedSelectedPost.authorAvatar}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#4E342E' }}>
                    {updatedSelectedPost.title}
                  </div>
                  <div style={{ fontSize: 14, color: '#8D6E63' }}>
                    {updatedSelectedPost.authorName} · {updatedSelectedPost.formula.name}
                  </div>
                </div>
              </div>

              {updatedSelectedPost.description && (
                <p style={{ fontSize: 14, color: '#5D4037', lineHeight: 1.7, marginBottom: 20 }}>
                  {updatedSelectedPost.description}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <ScentWheel
                  scents={updatedSelectedPost.formula.scents as WheelScent[]}
                  size={280}
                />
              </div>

              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#4E342E',
                    marginBottom: 12,
                  }}
                >
                  香料比例
                </h3>
                {updatedSelectedPost.formula.scents.map((scent) => {
                  const total = updatedSelectedPost.formula.scents.reduce((s, x) => s + x.ratio, 0)
                  const pct = total > 0 ? ((scent.ratio / total) * 100).toFixed(1) : '0'
                  return (
                    <div
                      key={scent.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 0',
                        borderBottom: '1px solid #F5F5F5',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: NOTE_COLOR[scent.noteType] + '30',
                          fontSize: 11,
                          color: '#5D4037',
                          minWidth: 36,
                          textAlign: 'center',
                        }}
                      >
                        {NOTE_LABEL[scent.noteType]}
                      </span>
                      <span style={{ fontSize: 14, color: '#4E342E', flex: 1 }}>{scent.name}</span>
                      <span style={{ fontSize: 13, color: '#8D6E63' }}>{scent.ratio} 份</span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#5D4037',
                          minWidth: 48,
                          textAlign: 'right',
                        }}
                      >
                        {pct}%
                      </span>
                    </div>
                  )
                })}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 20,
                  paddingBottom: 16,
                  borderBottom: '1px solid #FFE0B2',
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill={updatedSelectedPost.likedBy.includes('guest') ? '#E53935' : 'none'}
                  stroke={updatedSelectedPost.likedBy.includes('guest') ? '#E53935' : '#9E9E9E'}
                  strokeWidth="2"
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => handleLike(updatedSelectedPost, e)}
                />
                <span style={{ fontSize: 14, color: '#757575' }}>
                  {updatedSelectedPost.likes} 人点赞
                </span>
              </div>

              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#4E342E',
                  marginBottom: 16,
                }}
              >
                评论 ({updatedSelectedPost.comments.length})
              </h3>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <input
                  type="text"
                  placeholder="写下你的评论..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: 16,
                    border: '1.5px solid #D7CCC8',
                    background: '#FFFFFF',
                    fontSize: 14,
                    color: '#4E342E',
                  }}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentInput.trim()}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 16,
                    background: commentInput.trim()
                      ? 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)'
                      : '#BDBDBD',
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: commentInput.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  发送
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {updatedSelectedPost.comments.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: 24,
                      color: '#A1887F',
                      fontSize: 13,
                    }}
                  >
                    还没有评论，来抢沙发吧~
                  </div>
                ) : (
                  updatedSelectedPost.comments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: 12,
                        padding: '12px 16px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#5D4037',
                          marginBottom: 4,
                        }}
                      >
                        {comment.authorName}
                      </div>
                      <div style={{ fontSize: 14, color: '#4E342E', lineHeight: 1.5 }}>
                        {comment.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {showPostDialog && pendingFormula && (
        <>
          <div
            onClick={() => {
              setShowPostDialog(false)
              onClearPendingFormula?.()
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 200,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: '#FFF8E1',
              borderRadius: 16,
              padding: 24,
              width: 'min(480px, 90vw)',
              zIndex: 201,
              boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#4E342E', marginBottom: 20 }}>
              分享配方：{pendingFormula.name}
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#5D4037', marginBottom: 6 }}>
                帖子标题 *
              </label>
              <input
                type="text"
                placeholder="给你的帖子起个标题..."
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #D7CCC8',
                  background: '#FFFFFF',
                  fontSize: 14,
                  color: '#4E342E',
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: '#5D4037', marginBottom: 6 }}>
                描述一下你的配方
              </label>
              <textarea
                placeholder="说说调香灵感、适用场景..."
                value={postDescription}
                onChange={(e) => setPostDescription(e.target.value)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1.5px solid #D7CCC8',
                  background: '#FFFFFF',
                  fontSize: 14,
                  color: '#4E342E',
                  resize: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowPostDialog(false)
                  onClearPendingFormula?.()
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  background: '#EFEBE9',
                  color: '#5D4037',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreatePost}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #FF8A65 0%, #FF6F00 100%)',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                发布
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes mask-fade-in {
          from { opacity: 0; background: rgba(0,0,0,0); }
          to { opacity: 1; background: rgba(0,0,0,0.6); }
        }
        @keyframes detail-slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0.5;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
