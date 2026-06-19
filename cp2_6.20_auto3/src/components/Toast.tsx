import type { ToastState } from '../types'

interface ToastProps {
  toast: ToastState | null
  onClose: () => void
}

const Toast = ({ toast, onClose }: ToastProps) => {
  if (!toast) return null

  return (
    <div className="toast-container">
      <div
        key={toast.id}
        className={`toast ${toast.type} toast-enter`}
        onClick={onClose}
      >
        <span style={{ marginRight: '8px' }}>
          {toast.type === 'success' && '✓'}
          {toast.type === 'error' && '✕'}
          {toast.type === 'info' && 'ℹ'}
        </span>
        {toast.message}
      </div>
    </div>
  )
}

export default Toast
