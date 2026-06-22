import React, { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
  duration?: number
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => setIsVisible(true), 10)
    
    const timer2 = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => {
        onClose()
      }, 300)
    }, duration)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [duration, onClose])

  return (
    <>
      <div
        className={`toast ${type} ${isVisible ? 'visible' : ''} ${isLeaving ? 'leaving' : ''}`}
      >
        {message}
      </div>
      <style>{`
        .toast {
          position: fixed;
          top: 80px;
          right: -400px;
          padding: 12px 24px;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 500;
          z-index: 2000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .toast.success {
          background: #10B981;
        }
        
        .toast.error {
          background: #EF4444;
        }
        
        .toast.visible {
          right: 32px;
        }
        
        .toast.leaving {
          right: -400px;
        }
      `}</style>
    </>
  )
}

export default Toast
