import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import GalleryCard from '../components/GalleryCard'
import { getInspirations } from '../api'
import type { Inspiration } from '../api'
import { categories, categoryColors } from '../styles/theme'

const GalleryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCategory = searchParams.get('category') || '塑料瓶'
  const [activeCategory, setActiveCategory] = useState(initialCategory)
  const [inspirations, setInspirations] = useState<Inspiration[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInspirations = async () => {
      setLoading(true)
      try {
        const data = await getInspirations(activeCategory)
        setInspirations(data)
      } catch (err) {
        console.error('获取灵感列表失败:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchInspirations()
  }, [activeCategory])

  const handleCategoryChange = (label: string) => {
    setActiveCategory(label)
    setSearchParams({ category: label })
  }

  return (
    <div>
      <h2
        style={{
          textAlign: 'center',
          marginBottom: 32,
          fontSize: 28,
        }}
      >
        改造灵感画廊
      </h2>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'center',
          marginBottom: 40,
        }}
      >
        {categories.map((cat) => {
          const isActive = activeCategory === cat.label
          return (
            <motion.button
              key={cat.key}
              onClick={() => handleCategoryChange(cat.label)}
              whileTap={{ scale: 0.95 }}
              animate={{
                backgroundColor: isActive
                  ? categoryColors[cat.label]
                  : '#ECF0F1',
                color: isActive ? '#FFFFFF' : '#555555',
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                height: 40,
                padding: '0 16px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {cat.label}
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: 60 }}
          >
            <i
              className="fas fa-spinner fa-spin"
              style={{ fontSize: 32, color: '#D4A373' }}
            />
            <p style={{ marginTop: 16, color: '#7A5C3F' }}>加载中...</p>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, 320px)',
              gap: 24,
              justifyContent: 'center',
            }}
          >
            {inspirations.map((item, index) => (
              <GalleryCard
                key={item.id}
                inspiration={item}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && inspirations.length === 0 && (
        <p
          style={{
            textAlign: 'center',
            padding: 60,
            color: '#999999',
            fontSize: 16,
          }}
        >
          暂无该类别的改造灵感
        </p>
      )}
    </div>
  )
}

export default GalleryPage
