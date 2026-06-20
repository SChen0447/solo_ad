import { useState, useEffect } from 'react'
import { X, User, Phone, MapPin, FileText, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { Animal } from '@/types'
import { useAppStore } from '@/store'
import styles from './AdoptForm.module.css'

interface Props {
  animal: Animal | null
  onClose: () => void
}

type FeedbackState = {
  type: 'success' | 'error'
  message: string
} | null

export default function AdoptForm({ animal, onClose }: Props) {
  const submitAdoption = useAppStore((s) => s.submitAdoption)
  const [form, setForm] = useState({
    applicantName: '',
    phone: '',
    address: '',
    reason: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [focused, setFocused] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (feedback) {
      const fadeTimer = setTimeout(() => {
        setFeedback(null)
      }, 2000)
      return () => clearTimeout(fadeTimer)
    }
  }, [feedback])

  useEffect(() => {
    if (animal) {
      setForm({ applicantName: '', phone: '', address: '', reason: '' })
      setSubmitting(false)
      setFeedback(null)
    }
  }, [animal])

  if (!animal) return null

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!form.applicantName || !form.phone || !form.address || !form.reason) {
      setFeedback({ type: 'error', message: '请填写所有必填字段' })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    setTimeout(async () => {
      const result = await submitAdoption({
        ...form,
        animalId: animal.id,
      })
      setSubmitting(false)
      if (result.success) {
        setFeedback({ type: 'success', message: '申请已提交' })
        setTimeout(() => {
          onClose()
        }, 1200)
      } else {
        setFeedback({ type: 'error', message: result.error || '提交失败，请重试' })
      }
    }, 300)
  }

  const handleClose = () => {
    if (!submitting) onClose()
  }

  return (
    <>
      <div className={styles.overlay} onClick={handleClose} />
      <div className={styles.modal} role="dialog" aria-modal="true">
        <button className={styles.closeBtn} onClick={handleClose} aria-label="关闭" disabled={submitting}>
          <X size={20} />
        </button>

        <div className={styles.header}>
          <h2 className={styles.title}>申请领养</h2>
          <p className={styles.subtitle}>申请领养 <strong>{animal.name}</strong>（{animal.breed}）</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={`${styles.field} ${focused.applicantName ? styles.fieldFocused : ''}`}>
            <User size={18} className={styles.fieldIcon} />
            <input
              type="text"
              name="applicantName"
              placeholder="您的姓名 *"
              value={form.applicantName}
              onChange={handleChange}
              onFocus={() => setFocused((p) => ({ ...p, applicantName: true }))}
              onBlur={() => setFocused((p) => ({ ...p, applicantName: false }))}
              className={styles.input}
              disabled={submitting}
            />
          </div>

          <div className={`${styles.field} ${focused.phone ? styles.fieldFocused : ''}`}>
            <Phone size={18} className={styles.fieldIcon} />
            <input
              type="tel"
              name="phone"
              placeholder="联系电话 *"
              value={form.phone}
              onChange={handleChange}
              onFocus={() => setFocused((p) => ({ ...p, phone: true }))}
              onBlur={() => setFocused((p) => ({ ...p, phone: false }))}
              className={styles.input}
              disabled={submitting}
            />
          </div>

          <div className={`${styles.field} ${focused.address ? styles.fieldFocused : ''}`}>
            <MapPin size={18} className={styles.fieldIcon} />
            <input
              type="text"
              name="address"
              placeholder="家庭住址 *"
              value={form.address}
              onChange={handleChange}
              onFocus={() => setFocused((p) => ({ ...p, address: true }))}
              onBlur={() => setFocused((p) => ({ ...p, address: false }))}
              className={styles.input}
              disabled={submitting}
            />
          </div>

          <div className={`${styles.field} ${styles.fieldTextarea} ${focused.reason ? styles.fieldFocused : ''}`}>
            <FileText size={18} className={styles.fieldIcon} />
            <textarea
              name="reason"
              rows={4}
              placeholder="请说说您的领养理由 *"
              value={form.reason}
              onChange={handleChange}
              onFocus={() => setFocused((p) => ({ ...p, reason: true }))}
              onBlur={() => setFocused((p) => ({ ...p, reason: false }))}
              className={styles.textarea}
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            className={`btn-primary ${styles.submitBtn}`}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className={styles.spin} />
                提交中...
              </>
            ) : (
              '提交申请'
            )}
          </button>
        </form>

        {feedback && (
          <div
            className={`${styles.feedback} ${
              feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle size={22} />
            ) : (
              <XCircle size={22} />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>
    </>
  )
}
