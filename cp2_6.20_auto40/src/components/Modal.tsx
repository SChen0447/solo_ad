/* ============================================
 * 通用弹窗组件
 * 调用关系：被 ActivityListPage、EquipmentPage、ActivityDetailPage 调用
 * 数据流向：父组件控制 isOpen/onClose → 子组件渲染模态框 → children 展示表单内容
 * ============================================ */

import React, { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
  width?: string
}

const Modal: React.FC<ModalProps> = ({ isOpen, title, children, onClose, width = '500px' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{ width }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
