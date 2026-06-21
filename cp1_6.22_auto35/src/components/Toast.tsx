import { X } from 'lucide-react'
import { useStore } from '@/store'

const borderColor = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  info: 'border-l-blue-500',
  loading: 'border-l-yellow-500',
}

export default function Toast() {
  const { toasts, removeToast } = useStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed right-4 top-4 z-[100] flex flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`animate-slide-in flex items-start gap-3 min-w-[300px] max-w-[420px] rounded-lg border-l-4 bg-dark-card px-4 py-3 text-white shadow-lg ${borderColor[toast.type] ?? 'border-l-blue-500'}`}
        >
          <p className="flex-1 text-sm">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-white/50 transition-colors duration-200 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
