import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Heart,
  ShoppingBag,
  Filter,
  ListFilter,
  PackagePlus
} from 'lucide-react'
import { Order, orderApi } from '../api/requests'
import { ThankCard } from './ThankCard'

type FilterType = 'all' | 'favorites'

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newOrder, setNewOrder] = useState({
    customerName: '',
    bouquetName: '',
    purchaseDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      const data = await orderApi.getAll()
      setOrders(data)
    } catch (err) {
      console.error('Failed to load orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    let result = orders
    if (filter === 'favorites') {
      result = result.filter(o => o.isFavorite)
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      result = result.filter(
        o =>
          o.customerName.toLowerCase().includes(term) ||
          o.bouquetName.toLowerCase().includes(term)
      )
    }
    return [...result].sort(
      (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    )
  }, [orders, searchTerm, filter])

  async function handleToggleFavorite(id: string, isFavorite: boolean) {
    try {
      const updated = await orderApi.toggleFavorite(id, isFavorite)
      setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)))
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!newOrder.customerName.trim() || !newOrder.bouquetName.trim()) return
    try {
      const created = await orderApi.create(newOrder)
      setOrders(prev => [created, ...prev])
      setNewOrder({
        customerName: '',
        bouquetName: '',
        purchaseDate: new Date().toISOString().split('T')[0]
      })
      setShowNewForm(false)
    } catch (err) {
      console.error('Failed to create order:', err)
    }
  }

  const favoriteCount = orders.filter(o => o.isFavorite).length

  return (
    <div style={{ width: '100%' }}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          marginBottom: '18px',
          padding: '14px 18px',
          background: 'linear-gradient(135deg, #FFF5E6 0%, #FFE8EE 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(232, 160, 191, 0.35)',
          boxShadow: '0 4px 16px rgba(232, 160, 191, 0.12)'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShoppingBag size={22} color="#D48AA6" />
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '19px',
                  fontWeight: 700,
                  color: '#8B4A6B'
                }}
              >
                客户订单与感谢卡
              </h2>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '12px',
                  color: '#A16785'
                }}
              >
                共 {orders.length} 个订单 · {favoriteCount} 个已收藏 ❤️
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            onClick={() => setShowNewForm(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #E8A0BF 0%, #D48AA6 100%)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(232, 160, 191, 0.38)'
            }}
          >
            <PackagePlus size={16} />
            新增订单
          </motion.button>
        </div>

        <AnimatePresence>
          {showNewForm && (
            <motion.form
              onSubmit={handleCreateOrder}
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: '14px' }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                alignItems: 'flex-end',
                overflow: 'hidden'
              }}
            >
              <div style={{ flex: '1 1 160px', minWidth: '140px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#8B4A6B',
                    marginBottom: '4px'
                  }}
                >
                  客户姓名
                </label>
                <input
                  type="text"
                  value={newOrder.customerName}
                  onChange={e =>
                    setNewOrder(prev => ({ ...prev, customerName: e.target.value }))
                  }
                  placeholder="如：张女士"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid rgba(232, 160, 191, 0.45)',
                    background: '#fff',
                    fontSize: '13px',
                    color: '#6B3A55',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ flex: '1 1 180px', minWidth: '160px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#8B4A6B',
                    marginBottom: '4px'
                  }}
                >
                  花束名称
                </label>
                <input
                  type="text"
                  value={newOrder.bouquetName}
                  onChange={e =>
                    setNewOrder(prev => ({ ...prev, bouquetName: e.target.value }))
                  }
                  placeholder="如：浪漫红玫瑰花束"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid rgba(232, 160, 191, 0.45)',
                    background: '#fff',
                    fontSize: '13px',
                    color: '#6B3A55',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ flex: '0 0 150px', minWidth: '130px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#8B4A6B',
                    marginBottom: '4px'
                  }}
                >
                  购买日期
                </label>
                <input
                  type="date"
                  value={newOrder.purchaseDate}
                  onChange={e =>
                    setNewOrder(prev => ({ ...prev, purchaseDate: e.target.value }))
                  }
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid rgba(232, 160, 191, 0.45)',
                    background: '#fff',
                    fontSize: '13px',
                    color: '#6B3A55',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#8B4A6B',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ✨ 生成
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setShowNewForm(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid rgba(232, 160, 191, 0.5)',
                    background: '#fff',
                    color: '#8B4A6B',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  取消
                </motion.button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '16px'
        }}
      >
        <div
          style={{
            flex: '1 1 240px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Search
            size={17}
            color="#C26A92"
            style={{ position: 'absolute', left: '14px', zIndex: 1 }}
          />
          <motion.input
            type="text"
            placeholder="搜索客户姓名或花束名称..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            whileFocus={{
              boxShadow: '0 0 0 3px rgba(232, 160, 191, 0.25)'
            }}
            transition={{ duration: 0.2 }}
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              borderRadius: '14px',
              border: '1.5px solid rgba(232, 160, 191, 0.4)',
              background: '#fff',
              fontSize: '13.5px',
              color: '#6B3A55',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {([
            { key: 'all', label: '全部', icon: ListFilter, count: orders.length },
            { key: 'favorites', label: '最爱感谢', icon: Heart, count: favoriteCount }
          ] as const).map(item => {
            const active = filter === item.key
            const Icon = item.icon
            return (
              <motion.button
                key={item.key}
                onClick={() => setFilter(item.key as FilterType)}
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 15px',
                  borderRadius: '14px',
                  border: active
                    ? '1.5px solid rgba(232, 160, 191, 0.7)'
                    : '1.5px solid rgba(232, 160, 191, 0.3)',
                  background: active
                    ? 'linear-gradient(135deg, #FFE4EF 0%, #FFF0E4 100%)'
                    : '#fff',
                  color: active ? '#8B4A6B' : '#A16785',
                  fontSize: '13px',
                  fontWeight: active ? 700 : 600,
                  cursor: 'pointer',
                  boxShadow: active ? '0 3px 10px rgba(232, 160, 191, 0.18)' : 'none'
                }}
              >
                <Icon size={15} fill={active && item.key === 'favorites' ? '#FF5E95' : 'none'} />
                <span>{item.label}</span>
                <span
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #E8A0BF, #D48AA6)'
                      : 'rgba(232, 160, 191, 0.2)',
                    color: active ? '#fff' : '#8B4A6B',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: '10px'
                  }}
                >
                  {item.count}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#C26A92',
            fontSize: '14px'
          }}
        >
          加载中...
        </div>
      ) : filteredOrders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            background:
              'linear-gradient(160deg, rgba(255, 245, 230, 0.6) 0%, rgba(255, 232, 238, 0.6) 100%)',
            borderRadius: '18px',
            border: '1px dashed rgba(232, 160, 191, 0.5)'
          }}
        >
          <Filter size={40} color="#E8A0BF" style={{ marginBottom: '10px' }} />
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#8B4A6B' }}>
            {filter === 'favorites' ? '还没有收藏的感谢卡哦~' : '暂无订单记录'}
          </div>
          <div style={{ fontSize: '12.5px', color: '#A16785', marginTop: '6px' }}>
            {filter === 'favorites'
              ? '点击感谢卡右下角的爱心即可收藏 ❤️'
              : '点击"新增订单"按钮创建第一张感谢卡吧~'}
          </div>
        </motion.div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '16px'
          }}
        >
          <AnimatePresence mode="popLayout">
            {filteredOrders.map(order => (
              <ThankCard
                key={order.id}
                order={order}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
