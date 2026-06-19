import { type Dispatch } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error'
  exiting?: boolean
}

interface ToastAction {
  type: string
  payload?: any
}

export default function Toast({ toasts, dispatch }: { toasts: ToastItem[]; dispatch: Dispatch<ToastAction> }) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className="toast toast-enter" style={{ display: 'flex' }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      ))}
    </div>
  )
}
