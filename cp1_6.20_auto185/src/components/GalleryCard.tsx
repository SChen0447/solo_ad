import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { Inspiration } from '../api'
import { useNavigate } from 'react-router-dom'

interface GalleryCardProps {
  inspiration: Inspiration
  index: number
}

const GalleryCard: React.FC<GalleryCardProps> = ({ inspiration, index }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [imgBeforeLoaded, setImgBeforeLoaded] = useState(false)
  const [imgAfterLoaded, setImgAfterLoaded] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

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
      { rootMargin: '200px' }
    )

    if (cardRef.current) {
      observer.observe(cardRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleClick = () => {
    navigate(`/record/${inspiration.id}`, {
      state: { inspiration, category: inspiration.category },
    })
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.4, delay: index * 0.2 }}
      whileHover={{ y: -4, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      transitionHover={{ duration: 0.3, ease: 'easeOut' }}
      onClick={handleClick}
      style={{
        width: 320,
        padding: 20,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: '45%',
            height: 160,
            overflow: 'hidden',
            borderRadius: '8px 0 0 8px',
            backgroundColor: '#F8F9FA',
            position: 'relative',
          }}
        >
          {!imgBeforeLoaded && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#CCCCCC',
              }}
            >
              <i className="fas fa-spinner fa-spin" />
            </div>
          )}
          {isVisible && (
            <img
              src={inspiration.beforeImage}
              alt="改造前"
              onLoad={() => setImgBeforeLoaded(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: imgBeforeLoaded ? 'block' : 'none',
              }}
            />
          )}
        </div>
        <div
          style={{
            width: 2,
            height: 160,
            backgroundColor: '#aaaaaa',
          }}
        />
        <div
          style={{
            width: '45%',
            height: 160,
            overflow: 'hidden',
            borderRadius: '0 8px 8px 0',
            backgroundColor: '#F8F9FA',
            position: 'relative',
          }}
        >
          {!imgAfterLoaded && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#CCCCCC',
              }}
            >
              <i className="fas fa-spinner fa-spin" />
            </div>
          )}
          {isVisible && (
            <img
              src={inspiration.afterImage}
              alt="改造后"
              onLoad={() => setImgAfterLoaded(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: imgAfterLoaded ? 'block' : 'none',
              }}
            />
          )}
        </div>
      </div>

      <h3
        style={{
          fontSize: 16,
          color: '#333333',
          lineHeight: 1.4,
          marginBottom: 8,
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={inspiration.title}
      >
        {inspiration.title}
      </h3>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: '#999999' }}>
          @{inspiration.author}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <i
            className="fas fa-heart"
            style={{ fontSize: 16, color: '#FF6B6B' }}
          />
          <span style={{ fontSize: 12, color: '#5D4E37' }}>
            {inspiration.likes}
          </span>
        </span>
      </div>
    </motion.div>
  )
}

export default GalleryCard
