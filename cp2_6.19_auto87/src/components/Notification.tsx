import { useEffect, useState } from 'react'
import type { Notification as NotificationType } from '../types'

interface NotificationProps {
  notification: NotificationType | null
  onClose: () => void
}

export default function Notification({ notification, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (notification) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [notification, onClose])

  if (!notification) return null

  const bgColor = notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className={`${bgColor} text-white px-4 py-3 text-center shadow-lg`}>
        {notification.message}
      </div>
    </div>
  )
}
