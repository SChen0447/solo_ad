import { useState, useEffect } from 'react'
import { MessageSquare, Check, X, Clock, User, ArrowRightLeft, CreditCard } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

interface ExchangeMessage {
  id: string
  fromUserName: string
  fromUserAvatar: string
  fromUserCredit: number
  itemTitle: string
  myItemTitle: string
  reason: string
  contactTime: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: number
}

export function Messages() {
  const { user, incrementSuccessfulExchanges } = useAuthStore()
  const [messages, setMessages] = useState<ExchangeMessage[]>([
    {
      id: 'msg-001',
      fromUserName: '李华',
      fromUserAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lihua',
      fromUserCredit: 115,
      itemTitle: 'iPad Pro 2021',
      myItemTitle: '索尼 WH-1000XM4 耳机',
      reason: '我正好需要一副降噪耳机，我的iPad保养得很好，几乎全新，想和您交换！',
      contactTime: '2026-06-20 19:00',
      status: 'pending',
      createdAt: Date.now() - 3600000,
    },
    {
      id: 'msg-002',
      fromUserName: '王芳',
      fromUserAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangfang',
      fromUserCredit: 105,
      itemTitle: '《百年孤独》精装版',
      myItemTitle: 'Kindle Paperwhite',
      reason: '我是藏书爱好者，一直想收藏这本。我的Kindle用得很少，希望能交换成功~',
      contactTime: '2026-06-21 15:00',
      status: 'pending',
      createdAt: Date.now() - 7200000,
    },
    {
      id: 'msg-003',
      fromUserName: '张伟',
      fromUserAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangwei',
      fromUserCredit: 120,
      itemTitle: '小米空气净化器Pro H',
      myItemTitle: '戴森吸尘器 V7',
      reason: '交换成功！很高兴认识你，希望以后还有机会交换其他物品。',
      contactTime: '2026-06-18 10:00',
      status: 'accepted',
      createdAt: Date.now() - 86400000,
    },
  ])
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (message: string) => {
    setNotification(message)
    setTimeout(() => setNotification(null), 4000)
  }

  const handleAccept = (msgId: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === msgId ? { ...msg, status: 'accepted' as const } : msg))
    )
    incrementSuccessfulExchanges()
    showNotification('已同意交换！双方各获得5信用分')
  }

  const handleReject = (msgId: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === msgId ? { ...msg, status: 'rejected' as const } : msg))
    )
    showNotification('已拒绝交换请求')
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return `${Math.floor(diff / 86400000)}天前`
  }

  const pendingMessages = messages.filter((m) => m.status === 'pending')
  const handledMessages = messages.filter((m) => m.status !== 'pending')

  if (!user) return null

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#1a1a1a',
            margin: '0 0 8px 0',
          }}
        >
          消息中心
        </h1>
        <p style={{ color: '#666', margin: '0 0 32px 0' }}>
          管理您的交换请求和通知
        </p>

        {pendingMessages.length > 0 && (
          <>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#1a1a1a' }}>
              待处理请求 ({pendingMessages.length})
            </h2>
            <div style={{ marginBottom: '32px' }}>
              {pendingMessages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '24px',
                    marginBottom: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    border: '2px solid #ff7e67',
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                    <img
                      src={msg.fromUserAvatar}
                      alt={msg.fromUserName}
                      style={{ width: '48px', height: '48px', borderRadius: '50%' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <User size={16} style={{ color: '#666' }} />
                        <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{msg.fromUserName}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
                          <CreditCard size={14} style={{ color: '#7ec8a3' }} />
                          <span style={{ fontSize: '12px', color: '#7ec8a3', fontWeight: 500 }}>
                            {msg.fromUserCredit}分
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#999' }}>
                        <Clock size={12} />
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#faf8f5',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>对方物品</div>
                        <div style={{ fontWeight: 500, color: '#1a1a1a' }}>{msg.itemTitle}</div>
                      </div>
                      <ArrowRightLeft size={20} style={{ color: '#ff7e67' }} />
                      <div style={{ flex: 1, textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>您的物品</div>
                        <div style={{ fontWeight: 500, color: '#1a1a1a' }}>{msg.myItemTitle}</div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>交换理由</div>
                      <p style={{ margin: 0, fontSize: '14px', color: '#333', lineHeight: 1.6 }}>{msg.reason}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} style={{ color: '#666' }} />
                      <span style={{ fontSize: '13px', color: '#666' }}>期望联系时间: {msg.contactTime}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => handleAccept(msg.id)}
                      style={{
                        flex: 1,
                        padding: '12px 24px',
                        background: '#7ec8a3',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'transform 0.15s',
                      }}
                      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <Check size={16} />
                      同意交换
                    </button>
                    <button
                      onClick={() => handleReject(msg.id)}
                      style={{
                        flex: 1,
                        padding: '12px 24px',
                        background: '#fff',
                        color: '#ef4444',
                        border: '1px solid #ef4444',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'transform 0.15s',
                      }}
                      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
                      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <X size={16} />
                      拒绝
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#1a1a1a' }}>
          历史消息
        </h2>

        {handledMessages.length === 0 && pendingMessages.length === 0 ? (
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '60px 20px',
              textAlign: 'center',
              color: '#999',
            }}
          >
            <MessageSquare size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <p style={{ fontSize: '16px', margin: '0 0 8px 0' }}>暂无消息</p>
            <p style={{ fontSize: '14px' }}>发布物品后，就会收到其他用户的交换请求啦</p>
          </div>
        ) : (
          handledMessages.map((msg) => (
            <div
              key={msg.id}
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '20px 24px',
                marginBottom: '12px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                opacity: 0.8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={msg.fromUserAvatar}
                  alt={msg.fromUserName}
                  style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 500, color: '#1a1a1a' }}>{msg.fromUserName}</span>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: msg.status === 'accepted' ? '#dcfce7' : '#fee2e2',
                        color: msg.status === 'accepted' ? '#166534' : '#991b1b',
                      }}
                    >
                      {msg.status === 'accepted' ? '已同意' : '已拒绝'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                    想和您交换: {msg.itemTitle} ↔ {msg.myItemTitle}
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: '#999' }}>{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {notification && (
        <div
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '24px',
            background: '#323232',
            color: '#fff',
            padding: '16px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            animation: 'slideIn 0.3s ease',
            zIndex: 2000,
          }}
        >
          {notification}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
