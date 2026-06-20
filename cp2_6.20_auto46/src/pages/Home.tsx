import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ItemCard from '@/components/ItemCard'
import { fetchItems, type Item } from '@/api'
import { Loader2, Sparkles } from 'lucide-react'

const PAGE_SIZE = 12

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const res = await fetchItems(page, PAGE_SIZE)
      setItems(prev => [...prev, ...res.items])
      setHasMore(res.hasMore)
      setPage(p => p + 1)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [page, loading, hasMore])

  useEffect(() => {
    loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) loadMore()
      })
    }, { rootMargin: '200px' })
    io.observe(el)
    return () => io.disconnect()
  }, [loadMore])

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="page-wrap"
    >
      <div className="home-hero">
        <div className="home-hero-inner">
          <div>
            <h1 className="home-title">
              <Sparkles size={28} style={{ color: '#FF9F43' }} />
              邻里闲置换物，温暖每一个角落
            </h1>
            <p className="home-subtitle">免费交换闲置，举手之劳帮助邻居，让小区更有爱</p>
          </div>
        </div>
      </div>

      <div className="waterfall">
        <AnimatePresence>
          {items.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </AnimatePresence>
      </div>

      <div ref={sentinelRef} className="load-more">
        {loading && (
          <div className="spinner-wrap">
            <Loader2 className="spinner" size={24} />
            <span>加载中...</span>
          </div>
        )}
        {!hasMore && items.length > 0 && <div className="no-more">— 到底啦，邻居发布更多闲置吧 —</div>}
      </div>
    </motion.div>
  )
}
