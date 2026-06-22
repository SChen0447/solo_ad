import React, { useState } from 'react'
import { createIdea, Idea } from '../api/ideas'
import Toast from '../components/Toast'
import IdeaCard from '../components/IdeaCard'

interface CreateIdeaPageProps {
  onIdeaCreated?: (idea: Idea) => void
}

const CreateIdeaPage: React.FC<CreateIdeaPageProps> = ({ onIdeaCreated }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [author, setAuthor] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [shakeFields, setShakeFields] = useState<{ title: boolean; description: boolean; author: boolean }>({
    title: false,
    description: false,
    author: false
  })
  const [submittedIdea, setSubmittedIdea] = useState<Idea | null>(null)

  const maxTitleLength = 30
  const maxDescLength = 200
  const descWarningThreshold = maxDescLength * 0.8

  const isDescWarning = description.length >= descWarningThreshold
  const isDescOverLimit = description.length > maxDescLength
  const isTitleOverLimit = title.length > maxTitleLength

  const triggerShake = (fields: ('title' | 'description' | 'author')[]) => {
    const newShake = { title: false, description: false, author: false }
    fields.forEach(f => { newShake[f] = true })
    setShakeFields(newShake)
    setTimeout(() => {
      setShakeFields({ title: false, description: false, author: false })
    }, 400)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors: ('title' | 'description' | 'author')[] = []
    
    if (!title.trim() || title.length > maxTitleLength) {
      errors.push('title')
    }
    if (!description.trim() || description.length > maxDescLength) {
      errors.push('description')
    }
    if (!author.trim()) {
      errors.push('author')
    }

    if (errors.length > 0) {
      triggerShake(errors)
      setToastMessage('请填写所有必填项并遵守字数限制')
      setToastType('error')
      setShowToast(true)
      return
    }

    setIsLoading(true)

    try {
      const newIdea = await createIdea({
        title: title.trim(),
        description: description.trim(),
        author: author.trim()
      })

      setTimeout(() => {
        setIsLoading(false)
        setSubmittedIdea(newIdea)
        setToastMessage('创意提交成功！')
        setToastType('success')
        setShowToast(true)
        
        setTitle('')
        setDescription('')
        setAuthor('')

        if (onIdeaCreated) {
          onIdeaCreated(newIdea)
        }
      }, 1200)
    } catch (error) {
      setTimeout(() => {
        setIsLoading(false)
        setToastMessage(error instanceof Error ? error.message : '提交失败，请重试')
        setToastType('error')
        setShowToast(true)
        triggerShake(['title', 'description', 'author'])
      }, 1200)
    }
  }

  return (
    <div className="create-idea-page">
      <div className="page-header">
        <h2>提交新创意</h2>
        <p>分享你的好点子，让团队一起投票选出最棒的创意！</p>
      </div>

      <form className="idea-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">
            创意标题 <span className="required">*</span>
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入创意标题（最多30字）"
            className={`form-input ${shakeFields.title ? 'shake' : ''} ${isTitleOverLimit ? 'error' : ''}`}
            maxLength={maxTitleLength + 10}
          />
          <div className={`char-count ${isTitleOverLimit ? 'error' : ''}`}>
            {title.length}/{maxTitleLength}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">
            创意描述 <span className="required">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="请详细描述你的创意（最多200字）"
            rows={5}
            className={`form-textarea ${shakeFields.description ? 'shake' : ''} ${isDescOverLimit ? 'error' : ''} ${isDescWarning && !isDescOverLimit ? 'warning' : ''}`}
          />
          <div className={`char-count ${isDescOverLimit ? 'error' : isDescWarning ? 'warning' : ''}`}>
            {description.length}/{maxDescLength}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="author">
            作者姓名 <span className="required">*</span>
          </label>
          <input
            type="text"
            id="author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="请输入你的姓名"
            className={`form-input ${shakeFields.author ? 'shake' : ''}`}
          />
        </div>

        <button
          type="submit"
          className={`submit-button ${isLoading ? 'loading' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              提交中...
            </>
          ) : (
            '提交创意'
          )}
        </button>
      </form>

      {submittedIdea && (
        <div className="submitted-idea">
          <h3>你刚刚提交的创意：</h3>
          <div className="submitted-idea-card">
            <IdeaCard idea={submittedIdea} showVoteButton={false} />
          </div>
        </div>
      )}

      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <style>{`
        .create-idea-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 0 24px;
        }
        
        .page-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .page-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #1F2937;
          margin: 0 0 8px;
        }
        
        .page-header p {
          font-size: 14px;
          color: #6B7280;
          margin: 0;
        }
        
        .idea-form {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid #E5E7EB;
        }
        
        .form-group {
          margin-bottom: 24px;
          position: relative;
        }
        
        .form-group label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
        }
        
        .required {
          color: #EF4444;
        }
        
        .form-input,
        .form-textarea {
          width: 100%;
          padding: 12px 16px;
          font-size: 14px;
          color: #1F2937;
          border: 2px solid #E5E7EB;
          border-radius: 8px;
          background: #F9FAFB;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
          font-family: inherit;
          resize: vertical;
        }
        
        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #6366F1;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .form-input.error,
        .form-textarea.error {
          border-color: #EF4444;
          background: #FEF2F2;
        }
        
        .form-textarea.warning {
          border-color: #F59E0B;
          background: #FFFBEB;
        }
        
        .form-input.shake,
        .form-textarea.shake {
          animation: shake 0.4s ease;
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-5px); }
          40%, 80% { transform: translateX(5px); }
        }
        
        .char-count {
          position: absolute;
          right: 8px;
          bottom: -20px;
          font-size: 12px;
          color: #9CA3AF;
        }
        
        .char-count.warning {
          color: #F59E0B;
          font-weight: 600;
        }
        
        .char-count.error {
          color: #EF4444;
          font-weight: 600;
        }
        
        .submit-button {
          width: 100%;
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          color: white;
          background: linear-gradient(135deg, #6366F1, #8B5CF6);
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .submit-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }
        
        .submit-button:active:not(:disabled) {
          transform: scale(0.98);
        }
        
        .submit-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .submitted-idea {
          margin-top: 40px;
        }
        
        .submitted-idea h3 {
          font-size: 18px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 16px;
        }
        
        .submitted-idea-card {
          display: flex;
          justify-content: center;
        }
      `}</style>
    </div>
  )
}

export default CreateIdeaPage
