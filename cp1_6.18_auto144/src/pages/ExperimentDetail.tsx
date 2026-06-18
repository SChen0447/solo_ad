import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useExperimentStore } from '../store/experimentStore'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

function Sidebar({ active }: { active: string }) {
  const navigate = useNavigate()
  const navItems = [
    { key: 'dashboard', icon: '📊', label: '仪表板' },
    { key: 'experiments', icon: '🧪', label: '我的实验' },
    { key: 'templates', icon: '📋', label: '模板库' },
    { key: 'team', icon: '👥', label: '团队成员' },
    { key: 'settings', icon: '⚙️', label: '设置' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <span>🔬</span>
        <span>实验笔记</span>
      </div>
      <ul className="sidebar-nav">
        {navItems.map(item => (
          <li
            key={item.key}
            className={`sidebar-nav-item ${active === item.key ? 'active' : ''}`}
            onClick={() => item.key === 'dashboard' && navigate('/')}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

interface TimelineProps {
  timeline: {
    id: string
    type: 'create' | 'update' | 'comment' | 'upload'
    userId: string
    userName: string
    userAvatar: string
    description: string
    createdAt: string
  }[]
}

function Timeline({ timeline }: TimelineProps) {
  const sortedTimeline = [...timeline].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const typeIcons: Record<string, string> = {
    create: '+',
    update: '✎',
    comment: '💬',
    upload: '📎'
  }

  return (
    <div className="timeline-section">
      <h2 className="section-title">操作时间线</h2>
      <div className="timeline">
        {sortedTimeline.map((event, index) => (
          <div
            key={event.id}
            className="timeline-item"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className={`timeline-node ${event.type}`}>
              <span>{typeIcons[event.type]}</span>
            </div>
            {index < sortedTimeline.length - 1 && (
              <div className="timeline-connector" style={{ animationDelay: `${index * 0.1 + 0.2}s` }} />
            )}
            <div className="timeline-content">
              <div className="timeline-header">
                <img src={event.userAvatar} alt={event.userName} className="timeline-avatar" />
                <span className="timeline-user">{event.userName}</span>
                <span className="timeline-time">{formatTime(event.createdAt)}</span>
              </div>
              <p className="timeline-desc">{event.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface LightboxProps {
  imageUrl: string
  onClose: () => void
}

function Lightbox({ imageUrl, onClose }: LightboxProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>×</button>
      <img
        src={imageUrl}
        alt="大图预览"
        className="lightbox-image"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

interface AnnotationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (content: string) => void
  lineContent: string
}

function AnnotationModal({ isOpen, onClose, onSubmit, lineContent }: AnnotationModalProps) {
  const [content, setContent] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content)
      setContent('')
    }
  }

  return (
    <div className="annotation-modal-overlay" onClick={onClose}>
      <div className="annotation-modal" onClick={e => e.stopPropagation()}>
        <h3>添加注释</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          针对行内容：<code style={{ background: 'var(--card-bg)', padding: '2px 6px', borderRadius: '4px' }}>
            {lineContent.length > 40 ? lineContent.slice(0, 40) + '...' : lineContent}
          </code>
        </p>
        <textarea
          autoFocus
          placeholder="输入你的注释..."
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              handleSubmit()
            }
          }}
        />
        <div className="annotation-modal-actions">
          <button className="btn-cancel" onClick={onClose}>取消</button>
          <button className="btn-submit" onClick={handleSubmit}>添加</button>
        </div>
      </div>
    </div>
  )
}

interface TextResultProps {
  attachment: {
    id: string
    type: 'text'
    title: string
    content: string
    annotations: {
      id: string
      userId: string
      userName: string
      userAvatar: string
      content: string
      lineIndex: number
      createdAt: string
    }[]
    createdAt: string
  }
  onAddAnnotation: (attachmentId: string, content: string, lineIndex: number) => void
}

function TextResult({ attachment, onAddAnnotation }: TextResultProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedLine, setSelectedLine] = useState<{ index: number; content: string } | null>(null)

  const lines = attachment.content.split('\n')

  const highlightNumbers = (text: string) => {
    const parts: (string | JSX.Element)[] = []
    const regex = /(\d+\.?\d*\s?[%°μmgcmL]?[molmsJkPa]?\/?[m²gs]?)/g
    let lastIndex = 0
    let match
    let key = 0

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      parts.push(<span key={key++} className="number-highlight">{match[0]}</span>)
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts.length > 0 ? parts : text
  }

  const handlePencilClick = (index: number, content: string) => {
    setSelectedLine({ index, content })
    setModalOpen(true)
  }

  const handleSubmitAnnotation = (content: string) => {
    if (selectedLine) {
      onAddAnnotation(attachment.id, content, selectedLine.index)
      setModalOpen(false)
      setSelectedLine(null)
    }
  }

  const getAnnotationsForLine = (lineIndex: number) => {
    return attachment.annotations.filter(ann => ann.lineIndex === lineIndex)
  }

  return (
    <div className="text-result-card">
      <div className="attachment-header">
        <div className="text-result-title">📄 {attachment.title}</div>
      </div>
      <div className="text-result-content">
        {lines.map((line, index) => (
          <div key={index} className="text-line">
            {highlightNumbers(line)}
            <span
              className="pencil-icon"
              onClick={() => handlePencilClick(index, line)}
              title="添加注释"
            >
              ✏️
            </span>
            {getAnnotationsForLine(index).map(ann => (
              <div key={ann.id} className="annotation-bubble" title={`${ann.userName}: ${ann.content}`}>
                <img src={ann.userAvatar} alt={ann.userName} />
                <span>{ann.userName}: {ann.content.length > 20 ? ann.content.slice(0, 20) + '...' : ann.content}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <AnnotationModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedLine(null) }}
        onSubmit={handleSubmitAnnotation}
        lineContent={selectedLine?.content || ''}
      />
    </div>
  )
}

interface ImageGalleryProps {
  images: {
    id: string
    type: 'image'
    filename: string
    url: string
    thumbnail: string
    width: number
    height: number
    createdAt: string
  }[]
  onImageClick: (url: string) => void
}

function ImageGallery({ images, onImageClick }: ImageGalleryProps) {
  if (images.length === 0) return null

  return (
    <div style={{ marginBottom: '20px' }}>
      <h3 style={{ fontSize: '15px', marginBottom: '12px', fontWeight: 600 }}>图片附件</h3>
      <div className="image-gallery">
        {images.map(img => (
          <img
            key={img.id}
            src={img.thumbnail}
            alt={img.filename}
            className="image-thumbnail"
            onClick={() => onImageClick(img.url)}
          />
        ))}
      </div>
    </div>
  )
}

interface CommentsSectionProps {
  comments: {
    id: string
    userId: string
    userName: string
    userAvatar: string
    content: string
    createdAt: string
  }[]
  onAddComment: (content: string) => void
}

function CommentsSection({ comments, onAddComment }: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('')
  const sortedComments = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const handleSubmit = () => {
    if (newComment.trim()) {
      onAddComment(newComment.trim())
      setNewComment('')
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="comments-section">
      <h2 className="section-title">评论讨论 <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 400 }}>({comments.length})</span></h2>
      
      {sortedComments.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px' }}>
          <div className="empty-state-icon" style={{ fontSize: '32px' }}>💬</div>
          <p style={{ fontSize: '13px' }}>暂无评论，来说两句吧~</p>
        </div>
      ) : (
        <div>
          {sortedComments.map(comment => (
            <div key={comment.id} className="comment-item">
              <img src={comment.userAvatar} alt={comment.userName} className="comment-avatar" />
              <div className="comment-content">
                <div className="comment-user">{comment.userName}</div>
                <p className="comment-text">{comment.content}</p>
                <div className="comment-time">{formatTime(comment.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="comment-input-area">
        <input
          type="text"
          className="comment-input"
          placeholder="发表你的评论..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        <button className="btn btn-primary" onClick={handleSubmit}>发送</button>
      </div>
    </div>
  )
}

interface AddTextModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (title: string, content: string) => void
}

function AddTextModal({ isOpen, onClose, onSubmit }: AddTextModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    if (title.trim() && content.trim()) {
      onSubmit(title.trim(), content.trim())
      setTitle('')
      setContent('')
    }
  }

  return (
    <div className="annotation-modal-overlay" onClick={onClose}>
      <div className="annotation-modal text-input-modal" onClick={e => e.stopPropagation()}>
        <h3>添加文本结果</h3>
        <input
          type="text"
          placeholder="结果标题"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <textarea
          placeholder="粘贴实验数据或文本结果..."
          value={content}
          onChange={e => setContent(e.target.value)}
          style={{ minHeight: '200px' }}
        />
        <div className="annotation-modal-actions">
          <button className="btn-cancel" onClick={onClose}>取消</button>
          <button className="btn-submit" onClick={handleSubmit}>添加</button>
        </div>
      </div>
    </div>
  )
}

export default function ExperimentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentExperiment, loading, fetchExperiment, addComment, addTextAttachment, addAnnotation, clearCurrentExperiment } = useExperimentStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [textModalOpen, setTextModalOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (id) {
      fetchExperiment(id)
    }
    return () => {
      clearCurrentExperiment()
    }
  }, [id, fetchExperiment, clearCurrentExperiment])

  useEffect(() => {
    if (currentExperiment) {
      setEditContent(currentExperiment.description)
    }
  }, [currentExperiment])

  const handleBack = () => {
    navigate('/')
  }

  const handleToggleEdit = () => {
    if (isEditing && currentExperiment) {
      setEditContent(currentExperiment.description)
    }
    setIsEditing(!isEditing)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue

      try {
        const compressed = await compressImage(file, 800)
        if (currentExperiment && id) {
          const store = useExperimentStore.getState()
          await store.addImageAttachment(id, {
            filename: file.name,
            url: compressed.url,
            thumbnail: compressed.thumbnail,
            width: compressed.width,
            height: compressed.height
          })
        }
      } catch (err) {
        console.error('图片处理失败:', err)
      }
    }
  }, [currentExperiment, id])

  const compressImage = (file: File, maxWidth: number): Promise<{ url: string; thumbnail: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas不可用'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const url = canvas.toDataURL('image/jpeg', 0.85)

        const thumbCanvas = document.createElement('canvas')
        const thumbWidth = 200
        const thumbHeight = (height * thumbWidth) / width
        thumbCanvas.width = thumbWidth
        thumbCanvas.height = thumbHeight
        const thumbCtx = thumbCanvas.getContext('2d')
        if (!thumbCtx) {
          reject(new Error('Canvas不可用'))
          return
        }
        thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight)
        const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.7)

        resolve({ url, thumbnail, width, height })
      }
      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue

      try {
        const compressed = await compressImage(file, 800)
        if (id) {
          const store = useExperimentStore.getState()
          await store.addImageAttachment(id, {
            filename: file.name,
            url: compressed.url,
            thumbnail: compressed.thumbnail,
            width: compressed.width,
            height: compressed.height
          })
        }
      } catch (err) {
        console.error('图片处理失败:', err)
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAddComment = (content: string) => {
    if (id) {
      addComment(id, content)
    }
  }

  const handleAddText = (title: string, content: string) => {
    if (id) {
      addTextAttachment(id, title, content)
      setTextModalOpen(false)
    }
  }

  const handleAddAnnotation = (attachmentId: string, content: string, lineIndex: number) => {
    addAnnotation(attachmentId, content, lineIndex)
  }

  const renderMarkdown = (text: string) => {
    const html = marked.parse(text) as string
    return { __html: DOMPurify.sanitize(html) }
  }

  const statusClass = currentExperiment
    ? currentExperiment.status === '进行中' ? 'status-active' :
      currentExperiment.status === '已完成' ? 'status-completed' : 'status-failed'
    : ''

  const imageAttachments = currentExperiment?.attachments.filter(
    (att): att is Extract<typeof att, { type: 'image' }> => att.type === 'image'
  ) || []

  const textAttachments = currentExperiment?.attachments.filter(
    (att): att is Extract<typeof att, { type: 'text' }> => att.type === 'text'
  ) || []

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const rightPanelContent = (
    <>
      <h2 className="section-title">数据附件</h2>
      
      <div
        className={`upload-area ${isDragging ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-icon">📷</div>
        <div className="upload-text">拖拽图片到此处上传</div>
        <div className="upload-hint">或点击选择文件（自动压缩至800px）</div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </div>

      <ImageGallery images={imageAttachments} onImageClick={setLightboxImage} />

      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '15px', marginBottom: '12px', fontWeight: 600 }}>文本结果</h3>
        {textAttachments.map(att => (
          <TextResult
            key={att.id}
            attachment={att}
            onAddAnnotation={handleAddAnnotation}
          />
        ))}
        <button className="add-text-btn" onClick={() => setTextModalOpen(true)}>
          ➕ 添加文本结果
        </button>
      </div>
    </>
  )

  return (
    <div className="app-layout">
      <Sidebar active="experiments" />

      <main className={`main-content ${rightPanelOpen && !isMobile ? 'with-panel' : ''}`}>
        <div className="detail-header">
          <button className="back-btn" onClick={handleBack} title="返回">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <h1 className="detail-title">
            {loading ? '加载中...' : currentExperiment?.title || '实验详情'}
          </h1>
          {currentExperiment && (
            <span className={`status-tag ${statusClass}`} style={{ marginLeft: 'auto' }}>
              {currentExperiment.status}
            </span>
          )}
        </div>

        {currentExperiment && (
          <div className="detail-meta">
            <img src={currentExperiment.creator.avatar} alt={currentExperiment.creator.name} className="detail-meta-avatar" />
            <span>{currentExperiment.creator.name}</span>
            <span>·</span>
            <span>创建于 {formatDate(currentExperiment.createdAt)}</span>
            <span>·</span>
            <span>更新于 {formatDate(currentExperiment.updatedAt)}</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div className="loading-spinner" />
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>加载中...</p>
          </div>
        ) : currentExperiment ? (
          <>
            <div className="detail-layout">
              <div>
                <div className="description-section">
                  <div className="section-title">
                    <span>实验描述</span>
                    <button className="toggle-edit-btn" onClick={handleToggleEdit}>
                      {isEditing ? '👁️ 预览' : '✏️ 编辑'}
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        opacity: isEditing ? 0 : 1,
                        transition: 'opacity 0.2s ease',
                        position: isEditing ? 'absolute' : 'relative',
                        width: '100%',
                        pointerEvents: isEditing ? 'none' : 'auto'
                      }}
                    >
                      <div
                        className="markdown-preview"
                        dangerouslySetInnerHTML={renderMarkdown(currentExperiment.description)}
                      />
                    </div>

                    {isEditing && (
                      <textarea
                        className="markdown-editor"
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        style={{ animation: 'fadeIn 0.2s ease' }}
                      />
                    )}
                  </div>
                </div>

                <CommentsSection
                  comments={currentExperiment.comments}
                  onAddComment={handleAddComment}
                />
              </div>

              {!isMobile && (
                <div className="attachments-section">
                  {rightPanelContent}
                </div>
              )}
            </div>

            <Timeline timeline={currentExperiment.timeline} />
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">❓</div>
            <p>未找到该实验</p>
          </div>
        )}
      </main>

      {isMobile && (
        <>
          <button
            className="bottom-drawer-trigger"
            onClick={() => setMobileDrawerOpen(true)}
          >
            📎
          </button>
          <div
            className={`mobile-drawer-overlay ${mobileDrawerOpen ? 'open' : ''}`}
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className={`mobile-drawer ${mobileDrawerOpen ? 'open' : ''}`}>
            <div className="drawer-handle" />
            <div className="drawer-content">
              {rightPanelContent}
            </div>
          </div>
        </>
      )}

      {lightboxImage && (
        <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}

      <AddTextModal
        isOpen={textModalOpen}
        onClose={() => setTextModalOpen(false)}
        onSubmit={handleAddText}
      />
    </div>
  )
}
