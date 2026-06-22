import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import './Generator.css'

const Generator: React.FC = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [imageUrl, setImageUrl] = useState<string>('')
  const [unlockDate, setUnlockDate] = useState<string>('')
  const [message, setMessage] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [imageError, setImageError] = useState<string>('')
  const [formError, setFormError] = useState<string>('')

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageError('')
    
    if (file.size > 2 * 1024 * 1024) {
      setImageError('图片大小不能超过2MB')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      setImageUrl(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!imageUrl) {
      setFormError('请上传一张图片作为明信片背景')
      return
    }
    if (!unlockDate) {
      setFormError('请选择解锁日期')
      return
    }
    if (!message.trim()) {
      setFormError('请输入祝福语')
      return
    }

    const selectedDate = new Date(unlockDate)
    if (selectedDate <= new Date()) {
      setFormError('解锁日期必须是未来的日期')
      return
    }

    setIsLoading(true)
    try {
      const [postcard] = await Promise.all([
        api.createPostcard(imageUrl, unlockDate, message),
        new Promise(resolve => setTimeout(resolve, 1000))
      ])
      navigate(`/postcard/${postcard.id}`)
    } catch (error) {
      setFormError('保存失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 1)
    return now.toISOString().slice(0, 16)
  }

  return (
    <div className="generator-container">
      <div className="generator-card">
        <h1 className="generator-title">时光明信片</h1>
        <p className="generator-subtitle">制作一张穿越时光的明信片，在特定日期揭晓祝福</p>

        <form onSubmit={handleSubmit} className="generator-form">
          <div className="form-group">
            <label>明信片背景图片</label>
            <div 
              className="image-upload-area"
              onClick={() => fileInputRef.current?.click()}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="预览" className="image-preview" />
              ) : (
                <div className="upload-placeholder">
                  <span className="upload-icon">📷</span>
                  <p>点击上传图片</p>
                  <p className="upload-hint">支持 JPG、PNG 格式，最大 2MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden-input"
            />
            {imageError && <p className="error-text">{imageError}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="unlockDate">解锁日期和时间</label>
            <input
              id="unlockDate"
              type="datetime-local"
              value={unlockDate}
              onChange={(e) => setUnlockDate(e.target.value)}
              min={getMinDateTime()}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="message">祝福语（支持 Markdown）</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="写下你想在未来送出的祝福..."
              rows={6}
              className="form-textarea"
            />
          </div>

          {formError && <p className="error-text form-error">{formError}</p>}

          <button 
            type="submit" 
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading-spinner"></span>
            ) : (
              '生成明信片'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Generator
