import { useEffect, useState } from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      <div
        className={`relative bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl
                    transition-all duration-300 ${
                      isVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                    }`}
      >
        <h3 className="text-xl font-semibold text-gray-800 mb-3">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-lg bg-gray-200 text-gray-700
                       hover:bg-gray-300 transition-colors duration-200"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 rounded-lg bg-[#1a237e] text-white
                       hover:bg-[#283593] transition-colors duration-200"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  )
}
