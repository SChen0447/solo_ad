import { useState } from 'react'
import { CreditCard, Package, Award, Star, Plus, Upload, Check } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useItemStore, type ItemCategory } from '../stores/itemStore'
import { ItemCard } from '../components/ItemCard'
import { ExchangeModal } from '../components/ExchangeModal'
import type { Item } from '../stores/itemStore'

const categories: { value: ItemCategory; label: string }[] = [
  { value: 'electronics', label: '电子产品' },
  { value: 'books', label: '书籍' },
  { value: 'home', label: '家居' },
  { value: 'clothing', label: '服饰' },
  { value: 'other', label: '其他' },
]

export function Profile() {
  const { user, incrementSuccessfulExchanges } = useAuthStore()
  const { items, addItem } = useItemStore()
  const [isPressed, setIsPressed] = useState(false)
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false)
  const [targetItem, setTargetItem] = useState<Item | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'electronics' as ItemCategory,
    condition: 3,
    expectedCategory: 'books',
    expectedValueMin: 50,
    expectedValueMax: 200,
    imageUrl: '',
  })

  const myItems = items.filter((item) => item.userId === user?.id)

  const showNotification = (message: string) => {
    setNotification(message)
    setTimeout(() => setNotification(null), 4000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsPressed(true)
    setTimeout(() => setIsPressed(false), 150)

    if (!formData.imageUrl) {
      formData.imageUrl = `https://picsum.photos/seed/${Date.now()}/400/400`
    }

    await addItem({
      ...formData,
      userName: user.name,
      userAvatar: user.avatar,
      userCreditScore: user.creditScore,
    })

    setFormData({
      title: '',
      description: '',
      category: 'electronics',
      condition: 3,
      expectedCategory: 'books',
      expectedValueMin: 50,
      expectedValueMax: 200,
      imageUrl: '',
    })

    showNotification('物品发布成功！')
  }

  const handleExchange = (item: Item) => {
    setTargetItem(item)
    setExchangeModalOpen(true)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#7ec8a3'
    if (score >= 70) return '#fbbf24'
    if (score >= 60) return '#f97316'
    return '#ef4444'
  }

  if (!user) return null

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: '80px', height: '80px', borderRadius: '50%', border: '4px solid #ff7e67' }}
            />
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: '#1a1a1a' }}>
                {user.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} style={{ color: getScoreColor(user.creditScore) }} />
                <span style={{ fontSize: '16px', fontWeight: 600, color: getScoreColor(user.creditScore) }}>
                  信用分: {user.creditScore}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                background: '#faf8f5',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <Package size={28} style={{ color: '#ff7e67', marginBottom: '8px' }} />
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a' }}>{myItems.length}</div>
              <div style={{ fontSize: '13px', color: '#666' }}>已发布物品</div>
            </div>
            <div
              style={{
                background: '#faf8f5',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <Check size={28} style={{ color: '#7ec8a3', marginBottom: '8px' }} />
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a' }}>{user.successfulExchanges}</div>
              <div style={{ fontSize: '13px', color: '#666' }}>成功交换</div>
            </div>
            <div
              style={{
                background: '#faf8f5',
                padding: '20px',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <Star size={28} style={{ color: '#fbbf24', marginBottom: '8px' }} />
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a' }}>{user.consecutiveSuccess}</div>
              <div style={{ fontSize: '13px', color: '#666' }}>连续成功</div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px 0', color: '#1a1a1a' }}>
              <Award size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px', color: '#fbbf24' }} />
              成就徽章
            </h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {user.badges.length === 0 ? (
                <span style={{ color: '#999', fontSize: '14px' }}>暂无徽章，完成3次连续交换可获得"交换达人"徽章</span>
              ) : (
                user.badges.map((badge, index) => (
                  <span
                    key={index}
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                      color: '#fff',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 500,
                      boxShadow: '0 2px 8px rgba(251,191,36,0.4)',
                    }}
                  >
                    🏆 {badge}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            marginBottom: '32px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 24px 0', color: '#1a1a1a' }}>
            <Plus size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: '#ff7e67' }} />
            发布新物品
          </h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
                  物品标题
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="输入物品名称"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#ff7e67')}
                  onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
                  物品类别
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
                物品描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="详细描述物品的使用情况、特点等"
                rows={3}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#ff7e67')}
                onBlur={(e) => (e.target.style.borderColor = '#e0e0e0')}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
                  新旧程度 ({formData.condition}星)
                </label>
                <div style={{ display: 'flex', gap: '4px', padding: '8px 0' }}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData({ ...formData, condition: i + 1 })}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0',
                        transition: 'transform 0.15s',
                      }}
                      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.9)')}
                      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <Star
                        size={24}
                        fill={i < formData.condition ? '#fbbf24' : 'none'}
                        stroke={i < formData.condition ? '#fbbf24' : '#d1d5db'}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
                  期望交换类别
                </label>
                <select
                  value={formData.expectedCategory}
                  onChange={(e) => setFormData({ ...formData, expectedCategory: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
                  图片URL (可选)
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="留空自动生成"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
                  期望最低价值 (元)
                </label>
                <input
                  type="number"
                  value={formData.expectedValueMin}
                  onChange={(e) => setFormData({ ...formData, expectedValueMin: Number(e.target.value) })}
                  min="0"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#333', marginBottom: '8px' }}>
                  期望最高价值 (元)
                </label>
                <input
                  type="number"
                  value={formData.expectedValueMax}
                  onChange={(e) => setFormData({ ...formData, expectedValueMax: Number(e.target.value) })}
                  min={formData.expectedValueMin}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px 24px',
                background: '#ff7e67',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
                transform: isPressed ? 'scale(0.95)' : 'scale(1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Upload size={18} />
              发布物品
            </button>
          </form>
        </div>

        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 24px 0', color: '#1a1a1a' }}>
            我的发布
          </h2>
          {myItems.length === 0 ? (
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '60px 20px',
                textAlign: 'center',
                color: '#999',
              }}
            >
              <Package size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p style={{ fontSize: '16px', margin: '0 0 8px 0' }}>您还没有发布任何物品</p>
              <p style={{ fontSize: '14px' }}>填写上方表单发布您的第一件闲置物品吧</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '24px',
                justifyItems: 'center',
              }}
            >
              {myItems.map((item) => (
                <ItemCard key={item.id} item={item} onExchange={handleExchange} />
              ))}
            </div>
          )}
        </div>
      </div>

      <ExchangeModal
        isOpen={exchangeModalOpen}
        onClose={() => setExchangeModalOpen(false)}
        targetItem={targetItem}
        myItems={myItems}
        onSuccess={showNotification}
      />

      {notification && (
        <div
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '24px',
            background: '#7ec8a3',
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
