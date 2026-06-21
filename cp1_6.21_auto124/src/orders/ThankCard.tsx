import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Flower2, Calendar, Sparkles } from 'lucide-react'
import { Order } from '../api/requests'

interface ThankCardProps {
  order: Order
  onToggleFavorite: (id: string, isFavorite: boolean) => void
}

interface Particle {
  id: number
  x: number
  y: number
  delay: number
}

export function ThankCard({ order, onToggleFavorite }: ThankCardProps) {
  const [isHoveringHeart, setIsHoveringHeart] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const [particleKey, setParticleKey] = useState(0)

  function triggerParticles() {
    const newParticles: Particle[] = []
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3
      const dist = 24 + Math.random() * 18
      newParticles.push({
        id: Date.now() + i,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        delay: i * 8
      })
    }
    setParticleKey(k => k + 1)
    setParticles(newParticles)
    setTimeout(() => setParticles([]), 350)
  }

  function handleHeartClick() {
    triggerParticles()
    onToggleFavorite(order.id, !order.isFavorite)
  }

  function handleHeartEnter() {
    setIsHoveringHeart(true)
    triggerParticles()
  }

  function handleHeartLeave() {
    setIsHoveringHeart(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24, duration: 0.2 }}
      whileHover={{ y: -4, scale: 1.01 }}
      style={{
        position: 'relative',
        borderRadius: '18px',
        overflow: 'hidden',
        padding: '2px',
        background:
          'linear-gradient(135deg, rgba(232, 160, 191, 0.5) 0%, rgba(255, 245, 230, 0.3) 50%, rgba(232, 160, 191, 0.4) 100%)',
        boxShadow:
          '0 8px 28px rgba(232, 160, 191, 0.18), inset 0 1px 0 rgba(255,255,255,0.6)'
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: '16px',
          padding: '20px 22px 18px',
          background:
            'linear-gradient(160deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 245, 238, 0.45) 100%)',
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          border: '1px solid rgba(255, 255, 255, 0.55)',
          minHeight: '150px'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255, 182, 209, 0.55) 0%, rgba(255, 182, 209, 0) 70%)',
            pointerEvents: 'none'
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-30px',
            left: '-20px',
            width: '110px',
            height: '110px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255, 224, 178, 0.5) 0%, rgba(255, 224, 178, 0) 70%)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background:
                  'linear-gradient(135deg, rgba(232, 160, 191, 0.35) 0%, rgba(255, 245, 230, 0.6) 100%)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.7)'
              }}
            >
              <Flower2 size={15} color="#C26A92" />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#8B4A6B'
                }}
              >
                感谢卡片
              </span>
              <Sparkles size={13} color="#E8B64E" />
            </div>

            <div style={{ position: 'relative', width: '40px', height: '40px' }}>
              <AnimatePresence key={particleKey}>
                {particles.map(p => (
                  <motion.span
                    key={p.id}
                    initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                    animate={{
                      scale: [0, 1.3, 0.6],
                      x: p.x,
                      y: p.y,
                      opacity: [0, 1, 0.4, 0]
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.3,
                      delay: p.delay / 1000,
                      ease: 'easeOut'
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background:
                        'radial-gradient(circle, #FF6BA1 0%, #FF9EC1 50%, rgba(255, 107, 161, 0) 100%)',
                      boxShadow: '0 0 8px rgba(255, 107, 161, 0.7)',
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'none'
                    }}
                  />
                ))}
              </AnimatePresence>

              {particles.length > 0 &&
                [...Array(4)].map((_, i) => (
                  <motion.span
                    key={`ring-${particleKey}-${i}`}
                    initial={{ scale: 0.3, opacity: 0.9 }}
                    animate={{ scale: 2.2 + i * 0.3, opacity: 0 }}
                    transition={{
                      duration: 0.4,
                      delay: i * 0.04,
                      ease: 'easeOut'
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      border: '1.5px solid rgba(255, 107, 161, 0.65)',
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'none'
                    }}
                  />
                ))}

              <motion.button
                onClick={handleHeartClick}
                onMouseEnter={handleHeartEnter}
                onMouseLeave={handleHeartLeave}
                whileHover={isHoveringHeart ? { scale: 1.2 } : { scale: 1.08 }}
                whileTap={{ scale: 0.88 }}
                animate={{
                  scale: order.isFavorite ? [1, 1.25, 1.08] : 1
                }}
                transition={{
                  duration: 0.25,
                  type: 'spring',
                  stiffness: 420,
                  damping: 16
                }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: order.isFavorite
                    ? 'radial-gradient(circle, rgba(255, 107, 161, 0.25) 0%, rgba(255, 107, 161, 0.08) 70%)'
                    : 'rgba(255, 255, 255, 0.6)',
                  border: `1.5px solid ${
                    order.isFavorite ? 'rgba(255, 107, 161, 0.5)' : 'rgba(232, 160, 191, 0.3)'
                  }`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  zIndex: 2
                }}
                title={order.isFavorite ? '取消收藏' : '收藏为最爱感谢'}
              >
                <motion.div
                  animate={{
                    fill: order.isFavorite ? '#FF5E95' : 'none',
                    color: order.isFavorite ? '#FF5E95' : '#E8A0BF'
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <Heart size={17} fill={order.isFavorite ? '#FF5E95' : 'none'} />
                </motion.div>
              </motion.button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              marginTop: '4px'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#8B4A6B'
                }}
              >
                亲爱的 {order.customerName}：
              </span>
            </div>

            <div
              style={{
                fontSize: '14.5px',
                lineHeight: 1.75,
                color: '#6B3A55',
                fontStyle: 'italic',
                padding: '10px 14px',
                background:
                  'linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 245, 238, 0.5) 100%)',
                borderRadius: '12px',
                borderLeft: '3.5px solid rgba(232, 160, 191, 0.7)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)'
              }}
            >
              <Sparkles
                size={13}
                color="#E8B64E"
                style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }}
              />
              {order.quote}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginTop: '4px',
                paddingTop: '10px',
                borderTop: '1px dashed rgba(232, 160, 191, 0.35)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  background: 'rgba(255, 255, 255, 0.55)',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.7)'
                }}
              >
                <Flower2 size={13} color="#D97706" />
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#92400E'
                  }}
                >
                  💐 {order.bouquetName}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  background: 'rgba(255, 255, 255, 0.55)',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.7)'
                }}
              >
                <Calendar size={13} color="#8B4A6B" />
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#8B4A6B'
                  }}
                >
                  购买于 {order.purchaseDate}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              textAlign: 'right',
              marginTop: '12px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#C26A92'
            }}
          >
            — 花语轩全体员工 🌸
          </div>
        </div>
      </div>
    </motion.div>
  )
}
