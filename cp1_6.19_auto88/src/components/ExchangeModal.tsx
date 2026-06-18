import { useState } from 'react'
import { X, Send, Clock, MessageSquare } from 'lucide-react'
import axios from 'axios'
import type { Item } from '../stores/itemStore'
import { categoryLabel } from '../stores/itemStore'
import { useAuthStore } from '../stores/authStore'

interface ExchangeModalProps {
  isOpen: boolean
  onClose: () => void
  targetItem: Item | null
  myItems: Item[]
  onSuccess: (message: string) => void
}

export function ExchangeModal({ isOpen, onClose, targetItem, myItems, onSuccess }: ExchangeModalProps) {
  const [selectedMyItem, setSelectedMyItem] = useState<string>('')
  const [reason, setReason] = useState('')
  const [contactTime, setContactTime] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const { user } = useAuthStore()

  if (!isOpen || !targetItem || !user) return null

  const handleSubmit = async () => {
    if (!selectedMyItem || !reason || !contactTime) {
      return
    }

    setIsPressed(true)
    setTimeout(() => setIsPressed(false), 150)
    setIsSubmitting(true)

    try {
      await axios.post('/api/exchange/request', {
        fromUserId: user.id,
        toUserId: targetItem.userId,
        fromItemId: selectedMyItem,
        toItemId: targetItem.id,
        reason,
        contactTime,
      })

      onSuccess('交换请求已发送！对方将收到通知。')
      handleClose()
    } catch (error) {
      console.error('Failed to send exchange request:', error)
      onSuccess('发送失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedMyItem('')
    setReason('')
    setContactTime('')
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0, color: '#1a1a1a' }}>
            申请交换
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '8px',
              display: 'flex',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={20} color="#666" />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              padding: '16px',
              background: '#faf8f5',
              borderRadius: '12px',
              marginBottom: '24px',
            }}
          >
            <img
              src={targetItem.imageUrl}
              alt={targetItem.title}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '8px',
                objectFit: 'cover',
              }}
            />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0', color: '#1a1a1a' }}>
                {targetItem.title}
              </h3>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  background: '#e8f0fe',
                  color: '#1a73e8',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              >
                期望交换: {categoryLabel(targetItem.expectedCategory)}
              </span>
              <p style={{ fontSize: '13px', color: '#666', margin: '8px 0 0 0' }}>
                所有者: {targetItem.userName}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
              选择您要交换的物品
            </label>
            <select
              value={selectedMyItem}
              onChange={(e) => setSelectedMyItem(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                background: '#fff',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#ff7e67')}
              onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
            >
              <option value="">请选择您的物品</option>
              {myItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            {myItems.length === 0 && (
              <p style={{ fontSize: '12px', color: '#ff7e67', marginTop: '4px' }}>
                您还没有发布任何物品，请先在个人中心发布
              </p>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
              <MessageSquare size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              交换理由
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请说明您想交换的原因..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#ff7e67')}
              onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
              <Clock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              期望联系时间
            </label>
            <input
              type="datetime-local"
              value={contactTime}
              onChange={(e) => setContactTime(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#ff7e67')}
              onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedMyItem || !reason || !contactTime}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: '#ff7e67',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting || !selectedMyItem || !reason || !contactTime ? 0.6 : 1,
              transition: 'transform 0.15s ease, opacity 0.2s',
              transform: isPressed ? 'scale(0.95)' : 'scale(1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {isSubmitting ? (
              <span>发送中...</span>
            ) : (
              <>
                <Send size={16} />
                发送交换请求
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
