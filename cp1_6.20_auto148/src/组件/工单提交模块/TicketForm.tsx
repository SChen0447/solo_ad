import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { createTicket } from '../../services/ticketService'
import { CreateTicketRequest, TicketCategory } from '../../types'

const TicketForm: React.FC = () => {
  const [formData, setFormData] = useState<CreateTicketRequest>({
    customerName: '',
    category: '功能建议',
    description: '',
    attachmentUrl: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories: TicketCategory[] = ['功能建议', '缺陷报告', '服务投诉', '其他']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      await createTicket(formData)
      setSuccess(true)
      setFormData({
        customerName: '',
        category: '功能建议',
        description: '',
        attachmentUrl: '',
      })
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('提交失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="form-container" style={styles.container}>
      <h1 style={styles.title}>提交客户反馈</h1>
      
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.successMessage}
        >
          ✓ 工单提交成功！
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.errorMessage}
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>客户名称</label>
          <input
            type="text"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            required
            style={styles.input}
            placeholder="请输入客户名称"
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>反馈内容分类</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
            style={styles.input}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>详细描述</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            style={styles.textarea}
            placeholder="请详细描述反馈内容..."
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>附件URL（可选）</label>
          <input
            type="url"
            name="attachmentUrl"
            value={formData.attachmentUrl}
            onChange={handleChange}
            style={styles.input}
            placeholder="https://..."
          />
        </div>

        <motion.button
          type="submit"
          disabled={isSubmitting}
          style={styles.submitButton}
          whileHover={{ backgroundColor: '#1d4ed8', scale: 1.03 }}
          transition={{ duration: 0.2 }}
        >
          {isSubmitting ? '提交中...' : '提交工单'}
        </motion.button>
      </form>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: 640,
    margin: '0 auto',
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 24,
  },
  successMessage: {
    padding: '12px 16px',
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    borderRadius: 8,
    border: '1px solid #10b981',
    marginBottom: 16,
  },
  errorMessage: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    borderRadius: 8,
    marginBottom: 16,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    width: '100%',
    height: 40,
    padding: '0 12px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  textarea: {
    width: '100%',
    height: 120,
    padding: 12,
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s ease',
  },
  submitButton: {
    width: '100%',
    height: 44,
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
}

export default TicketForm
