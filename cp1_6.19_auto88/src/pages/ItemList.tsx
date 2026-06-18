import { useEffect, useRef, useCallback, useState } from 'react'
import { Search, Filter, RefreshCw } from 'lucide-react'
import { useItemStore, type Item, type ItemCategory } from '../stores/itemStore'
import { ItemCard } from '../components/ItemCard'
import { ExchangeModal } from '../components/ExchangeModal'
import { useAuthStore } from '../stores/authStore'

const categories: { value: ItemCategory | 'all'; label: string }[] = [
  { value: 'all', label: '全部类别' },
  { value: 'electronics', label: '电子产品' },
  { value: 'books', label: '书籍' },
  { value: 'home', label: '家居' },
  { value: 'clothing', label: '服饰' },
  { value: 'other', label: '其他' },
]

export function ItemList() {
  const { items, loading, hasMore, currentPage, searchQuery, selectedCategory, fetchItems, setSearchQuery, setSelectedCategory } = useItemStore()
  const { user } = useAuthStore()
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false)
  const [targetItem, setTargetItem] = useState<Item | null>(null)
  const [notification, setNotification] = useState<string | null>(null)
  const observerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchItems(1, true)
  }, [searchQuery, selectedCategory])

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && hasMore && !loading) {
        fetchItems(currentPage + 1)
      }
    },
    [hasMore, loading, currentPage, fetchItems]
  )

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 })
    if (observerRef.current) {
      observer.observe(observerRef.current)
    }
    return () => observer.disconnect()
  }, [handleObserver])

  const showNotification = (message: string) => {
    setNotification(message)
    setTimeout(() => setNotification(null), 4000)
  }

  const handleExchange = (item: Item) => {
    setTargetItem(item)
    setExchangeModalOpen(true)
  }

  const myItems = items.filter((item) => item.userId === user?.id)

  const SkeletonCard = () => (
    <div
      style={{
        width: '300px',
        height: '340px',
        background: '#ffffff',
        borderRadius: '16px',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '200px',
          height: '200px',
          margin: '0 auto 12px',
          borderRadius: '12px',
          background: 'linear-gradient(90deg, #e0e0e0 0%, #f5f5f5 50%, #e0e0e0 100%)',
          backgroundSize: '200% 100%',
          animation: 'skeleton-pulse 0.8s ease-in-out infinite',
        }}
      />
      <div
        style={{
          height: '16px',
          width: '60%',
          marginBottom: '12px',
          borderRadius: '4px',
          background: 'linear-gradient(90deg, #e0e0e0 0%, #f5f5f5 50%, #e0e0e0 100%)',
          backgroundSize: '200% 100%',
          animation: 'skeleton-pulse 0.8s ease-in-out infinite',
          animationDelay: '0.1s',
        }}
      />
      <div
        style={{
          height: '24px',
          width: '40%',
          borderRadius: '6px',
          background: 'linear-gradient(90deg, #e0e0e0 0%, #f5f5f5 50%, #e0e0e0 100%)',
          backgroundSize: '200% 100%',
          animation: 'skeleton-pulse 0.8s ease-in-out infinite',
          animationDelay: '0.2s',
        }}
      />
    </div>
  )

  return (
    <div style={{ padding: '24px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#1a1a1a',
            margin: '0 0 24px 0',
          }}
        >
          发现好物
        </h1>

        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '32px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#999',
              }}
            />
            <input
              type="text"
              placeholder="搜索物品名称或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px 14px 48px',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                fontSize: '14px',
                background: '#fff',
                outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ff7e67'
                e.target.style.boxShadow = '0 0 0 3px rgba(255,126,103,0.1)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <div style={{ position: 'relative', minWidth: '160px' }}>
            <Filter
              size={18}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#999',
              }}
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as ItemCategory | 'all')}
              style={{
                width: '100%',
                padding: '14px 16px 14px 48px',
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                fontSize: '14px',
                background: '#fff',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
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

          <button
            onClick={() => fetchItems(1, true)}
            disabled={loading}
            style={{
              padding: '14px 24px',
              border: '1px solid #e0e0e0',
              background: '#fff',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#666',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = '#ff7e67'
                e.currentTarget.style.color = '#ff7e67'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e0e0e0'
              e.currentTarget.style.color = '#666'
            }}
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            刷新
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px',
            justifyItems: 'center',
          }}
        >
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onExchange={handleExchange} />
          ))}

          {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>

        {!loading && items.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: '#999',
            }}
          >
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>暂无物品</p>
            <p style={{ fontSize: '14px' }}>快来发布第一个闲置物品吧！</p>
          </div>
        )}

        <div ref={observerRef} style={{ height: '40px', marginTop: '20px' }} />

        {!hasMore && items.length > 0 && (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
            — 已加载全部物品 —
          </p>
        )}
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
        @keyframes skeleton-pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
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
        .spinning {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .item-card {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}
