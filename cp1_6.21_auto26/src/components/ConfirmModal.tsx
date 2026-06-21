import { AlertTriangle, X } from 'lucide-react'
import { useState } from 'react'

interface Props {
  open: boolean
  title: string
  message: React.ReactNode
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
}

export function ConfirmModal({
  open, title, message, confirmText = '确认', cancelText = '取消', danger = false, onClose, onConfirm
}: Props) {
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function confirm() {
    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="alertdialog" aria-modal="true">
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={20} color={danger ? '#C62828' : 'var(--primary)'} />
            {title}
          </h3>
          <button type="button" className="modal-close" aria-label="关闭" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ paddingBottom: 12 }}>
          <div style={{ color: 'var(--text)', fontSize: 14 }}>{message}</div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={confirm}
            disabled={loading}
          >
            {loading ? '处理中…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
