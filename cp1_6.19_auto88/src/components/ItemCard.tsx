import { useState, useRef, useEffect } from 'react'
import { Star, CreditCard, ArrowRightLeft } from 'lucide-react'
import type { Item } from '../stores/itemStore'
import { categoryLabel } from '../stores/itemStore'
import { useAuthStore } from '../stores/authStore'

interface ItemCardProps {
  item: Item
  onExchange: (item: Item) => void
}

export function ItemCard({ item, onExchange }: ItemCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.1 }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleExchangeClick = () => {
    setIsPressed(true)
    setTimeout(() => {
      setIsPressed(false)
      onExchange(item)
    }, 150)
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        fill={i < rating ? '#fbbf24' : 'none'}
        stroke={i < rating ? '#fbbf24' : '#d1d5db'}
      />
    ))
  }

  const isOwnItem = user?.id === item.userId

  return (
    <div
      className="item-card"
      style={{
        width: '300px',
        height: '340px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        transition: 'all 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.15)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'
      }}
    >
      <div
        ref={imgRef}
        className="image-wrapper"
        style={{
          width: '200px',
          height: '200px',
          margin: '16px auto 12px',
          borderRadius: '12px',
          overflow: 'hidden',
          background: '#f0f0f0',
          position: 'relative',
        }}
      >
        {!imageLoaded && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, #e0e0e0 0%, #f5f5f5 50%, #e0e0e0 100%)',
              backgroundSize: '200% 100%',
              animation: 'pulse 0.8s ease-in-out infinite',
            }}
          />
        )}
        {isVisible && (
          <img
            src={item.imageUrl}
            alt={item.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
          />
        )}
      </div>

      <div style={{ padding: '0 20px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          {renderStars(item.condition)}
        </div>

        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#1a1a1a',
            margin: '0 0 8px 0',
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {item.title}
        </h3>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            background: '#e8f0fe',
            color: '#1a73e8',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 500,
            alignSelf: 'flex-start',
            marginBottom: 'auto',
          }}
        >
          <ArrowRightLeft size={12} />
          期望交换: {categoryLabel(item.expectedCategory)}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img
              src={item.userAvatar}
              alt={item.userName}
              style={{ width: '24px', height: '24px', borderRadius: '50%' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CreditCard size={14} style={{ color: '#7ec8a3' }} />
              <span style={{ fontSize: '12px', color: '#666' }}>{item.userCreditScore}分</span>
            </div>
          </div>

          {!isOwnItem && (
            <button
              onClick={handleExchangeClick}
              style={{
                padding: '8px 16px',
                background: '#ff7e67',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
                transform: isPressed ? 'scale(0.95)' : 'scale(1)',
              }}
            >
              申请交换
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
