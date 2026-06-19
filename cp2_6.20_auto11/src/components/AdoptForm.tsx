import React, { useState, useRef, useEffect } from 'react'
import type { Animal } from '@/types'
import { submitAdoption } from '@/services/api'

interface AdoptFormProps {
  animal: Animal
  onClose: () => void
}

type FeedbackState = null | {
  type: 'success' | 'error'
  message: string
}

export const AdoptForm: React.FC<AdoptFormProps> = ({ animal, onClose }) => {
  const [formData, setFormData] = useState({
    applicantName: '',
    phone: '',
    address: '',
    reason: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [feedbackFading, setFeedbackFading] = useState(false)

  const showTimerRef = useRef<number | null>(null)
  const fadeTimerRef = useRef<number | null>(null)
  const cleanTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
      if (cleanTimerRef.current) clearTimeout(cleanTimerRef.current)
    }
  }, [])

  const clearAllTimers = () => {
    if (showTimerRef.current) clearTimeout(showTimerRef.current)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    if (cleanTimerRef.current) clearTimeout(cleanTimerRef.current)
    showTimerRef.current = null
    fadeTimerRef.current = null
    cleanTimerRef.current = null
  }

  const scheduleFeedbackClear = () => {
    clearAllTimers()
    fadeTimerRef.current = window.setTimeout(() => {
      setFeedbackFading(true)
      cleanTimerRef.current = window.setTimeout(() => {
        setFeedback(null)
        setFeedbackFading(false)
      }, 500)
    }, 2000)
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.applicantName.trim()) newErrors.applicantName = '请输入您的姓名'
    if (!formData.phone.trim()) {
      newErrors.phone = '请输入联系电话'
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone.trim())) {
      newErrors.phone = '请输入有效的手机号码'
    }
    if (!formData.address.trim()) newErrors.address = '请输入您的住址'
    if (!formData.reason.trim()) newErrors.reason = '请填写领养理由'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    clearAllTimers()
    setSubmitting(true)
    setFeedback(null)
    setFeedbackFading(false)

    const startTime = performance.now()

    try {
      await submitAdoption(animal.id, formData)

      const elapsed = performance.now() - startTime
      const remaining = Math.max(0, 300 - elapsed)

      showTimerRef.current = window.setTimeout(() => {
        setSubmitting(false)
        setFeedback({ type: 'success', message: '申请已提交，我们会尽快审核' })
        setFormData({ applicantName: '', phone: '', address: '', reason: '' })
        scheduleFeedbackClear()
      }, remaining)
    } catch (err) {
      const elapsed = performance.now() - startTime
      const remaining = Math.max(0, 300 - elapsed)

      showTimerRef.current = window.setTimeout(() => {
        setSubmitting(false)
        setFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : '提交失败，请重试'
        })
        scheduleFeedbackClear()
      }, remaining)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>领养申请</h2>
          <button
            onClick={onClose}
            style={{
              width: 44,
              height: 44,
              minWidth: 44,
              minHeight: 44,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: 'none'
            }}
            aria-label="关闭"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: 16, background: '#FFF8F0', borderRadius: 10, marginBottom: 24 }}>
          <div style={{ fontWeight: 600, color: '#F5A623', marginBottom: 4 }}>申请领养</div>
          <div style={{ fontSize: 14, color: '#666' }}>
            {animal.name} · {animal.breed} · {animal.age}岁
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">姓名</label>
            <input
              type="text"
              name="applicantName"
              className="form-input"
              value={formData.applicantName}
              onChange={handleChange}
              placeholder="请输入您的姓名"
              autoComplete="off"
            />
            {errors.applicantName && (
              <div style={{ color: '#FF4D4F', fontSize: 12, marginTop: 4 }}>{errors.applicantName}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">联系电话</label>
            <input
              type="tel"
              name="phone"
              className="form-input"
              value={formData.phone}
              onChange={handleChange}
              placeholder="请输入手机号码"
              autoComplete="off"
            />
            {errors.phone && (
              <div style={{ color: '#FF4D4F', fontSize: 12, marginTop: 4 }}>{errors.phone}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">住址</label>
            <input
              type="text"
              name="address"
              className="form-input"
              value={formData.address}
              onChange={handleChange}
              placeholder="请输入您的详细住址"
              autoComplete="off"
            />
            {errors.address && (
              <div style={{ color: '#FF4D4F', fontSize: 12, marginTop: 4 }}>{errors.address}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">领养理由</label>
            <textarea
              name="reason"
              className="form-textarea"
              value={formData.reason}
              onChange={handleChange}
              placeholder="请简要描述您的领养理由..."
              rows={4}
            />
            {errors.reason && (
              <div style={{ color: '#FF4D4F', fontSize: 12, marginTop: 4 }}>{errors.reason}</div>
            )}
          </div>

          {feedback && (
            <div
              className={`feedback-message feedback-${feedback.type} ${
                feedbackFading ? 'feedback-fade-out' : ''
              }`}
            >
              {feedback.type === 'success' ? (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#52C41A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FF4D4F"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <div className="spinner" />
                提交中...
              </>
            ) : (
              '提交申请'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
