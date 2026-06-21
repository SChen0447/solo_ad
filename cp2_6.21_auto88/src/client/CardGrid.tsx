import { useState, useEffect, useMemo } from 'react'
import type { Card, Rarity } from './types'
import { getAllCards, addCard } from './api'
import { RARITY_COLORS, RARITY_NAMES } from './types'

interface CardGridProps {
  selectedCards?: string[]
  onCardSelect?: (card: Card) => void
  selectable?: boolean
  showAddForm?: boolean
}

export default function CardGrid({
  selectedCards = [],
  onCardSelect,
  selectable = false,
  showAddForm = true
}: CardGridProps) {
  const [allCards, setAllCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [rarityFilter, setRarityFilter] = useState<string>('all')
  const [newCard, setNewCard] = useState({
    name: '',
    rarity: 'common' as Rarity,
    attack: 3,
    defense: 3,
    imageUrl: ''
  })

  const pageSize = 24

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true)
      try {
        const data = await getAllCards()
        setAllCards(data.cards)
      } catch (e) {
        console.error('Failed to fetch cards:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const filteredCards = useMemo(() => {
    return allCards.filter(card => {
      const matchesSearch = card.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRarity = rarityFilter === 'all' || card.rarity === rarityFilter
      return matchesSearch && matchesRarity
    })
  }, [allCards, searchQuery, rarityFilter])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, rarityFilter])

  const paginatedCards = useMemo(() => {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return filteredCards.slice(start, end)
  }, [filteredCards, page])

  const total = filteredCards.length
  const totalPages = Math.ceil(total / pageSize)

  const handleAddCard = async () => {
    if (!newCard.name.trim()) return
    try {
      const card = await addCard({
        name: newCard.name,
        rarity: newCard.rarity,
        attack: newCard.attack,
        defense: newCard.defense,
        imageUrl: newCard.imageUrl || undefined
      } as Omit<Card, 'id'>)
      setAllCards(prev => [...prev, card])
      setNewCard({ name: '', rarity: 'common', attack: 3, defense: 3, imageUrl: '' })
      setShowForm(false)
    } catch (e) {
      console.error('Failed to add card:', e)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const isSelected = (cardId: string) => selectedCards.includes(cardId)

  const handleCardClick = (card: Card) => {
    if (selectable && onCardSelect) {
      onCardSelect(card)
    }
  }

  return (
    <div className="card-grid-container">
      <div className="card-grid-header">
        <h2 className="section-title">牌组收藏</h2>
        {showAddForm && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '取消' : '添加卡牌'}
          </button>
        )}
      </div>

      {showForm && showAddForm && (
        <div className="add-card-form">
          <input
            type="text"
            placeholder="卡牌名称"
            value={newCard.name}
            onChange={e => setNewCard(prev => ({ ...prev, name: e.target.value }))}
            className="form-input"
          />
          <select
            value={newCard.rarity}
            onChange={e => setNewCard(prev => ({ ...prev, rarity: e.target.value as Rarity }))}
            className="form-select"
          >
            <option value="common">普通</option>
            <option value="rare">稀有</option>
            <option value="epic">史诗</option>
            <option value="legendary">传说</option>
          </select>
          <div className="form-row">
            <label>攻击
              <input
                type="number"
                min="1"
                max="10"
                value={newCard.attack}
                onChange={e => setNewCard(prev => ({ ...prev, attack: Number(e.target.value) }))}
                className="form-input-small"
              />
            </label>
            <label>防御
              <input
                type="number"
                min="1"
                max="10"
                value={newCard.defense}
                onChange={e => setNewCard(prev => ({ ...prev, defense: Number(e.target.value) }))}
                className="form-input-small"
              />
            </label>
          </div>
          <input
            type="text"
            placeholder="插画URL (可选)"
            value={newCard.imageUrl}
            onChange={e => setNewCard(prev => ({ ...prev, imageUrl: e.target.value }))}
            className="form-input"
          />
          <button className="btn-primary" onClick={handleAddCard}>确认添加</button>
        </div>
      )}

      <div className="search-filter-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="搜索卡牌名称..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="clear-search" 
              onClick={() => setSearchQuery('')}
              aria-label="清除搜索"
            >
              ✕
            </button>
          )}
        </div>
        <select
          value={rarityFilter}
          onChange={e => setRarityFilter(e.target.value)}
          className="rarity-filter"
        >
          <option value="all">全部稀有度</option>
          <option value="common">普通</option>
          <option value="rare">稀有</option>
          <option value="epic">史诗</option>
          <option value="legendary">传说</option>
        </select>
      </div>

      <div className="filter-info">
        {searchQuery || rarityFilter !== 'all' ? (
          <span>找到 <strong>{total}</strong> 张卡牌</span>
        ) : (
          <span>共 <strong>{total}</strong> 张卡牌</span>
        )}
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : paginatedCards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🃏</div>
          <div className="empty-text">没有找到匹配的卡牌</div>
          <div className="empty-hint">试试其他搜索词或筛选条件</div>
        </div>
      ) : (
        <div className="card-grid">
          {paginatedCards.map(card => (
            <div
              key={card.id}
              className={`card-item ${isSelected(card.id) ? 'selected' : ''} ${selectable ? 'selectable' : ''}`}
              onClick={() => handleCardClick(card)}
              style={{ borderColor: RARITY_COLORS[card.rarity] }}
            >
              <div className="card-rarity-badge" style={{ color: RARITY_COLORS[card.rarity] }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12,2 22,7 22,17 12,22 2,17 2,7" fill="none" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className="card-image">
                <img src={card.imageUrl} alt={card.name} />
              </div>
              <div className="card-info">
                <div className="card-name">{card.name}</div>
                <div className="card-rarity" style={{ color: RARITY_COLORS[card.rarity] }}>
                  {RARITY_NAMES[card.rarity]}
                </div>
                <div className="card-stats">
                  <span className="stat-attack">⚔ {card.attack}</span>
                  <span className="stat-defense">🛡 {card.defense}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-page"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            上一页
          </button>
          <span className="page-info">第 {page} / {totalPages} 页 (共 {total} 张)</span>
          <button
            className="btn-page"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            下一页
          </button>
        </div>
      )}

      <style>{`
        .card-grid-container {
          padding: 20px;
        }
        .card-grid-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 40px;
          font-weight: bold;
          color: #F59E0B;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
          margin: 0;
        }
        .btn-primary {
          min-width: 120px;
          height: 44px;
          padding: 0 24px;
          border-radius: 22px;
          background: linear-gradient(135deg, #F59E0B, #D97706);
          color: #1E293B;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.3s ease;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }
        .add-card-form {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 20px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          margin-bottom: 20px;
          align-items: center;
        }
        .form-input {
          height: 40px;
          padding: 0 16px;
          border-radius: 8px;
          border: 1px solid #475569;
          background: #1E293B;
          color: #E5E7EB;
          font-size: 14px;
          min-width: 150px;
        }
        .form-input:focus {
          outline: none;
          border-color: #F59E0B;
        }
        .form-select {
          height: 40px;
          padding: 0 16px;
          border-radius: 8px;
          border: 1px solid #475569;
          background: #1E293B;
          color: #E5E7EB;
          font-size: 14px;
          cursor: pointer;
        }
        .form-row {
          display: flex;
          gap: 16px;
          align-items: center;
        }
        .form-row label {
          display: flex;
          flex-direction: column;
          font-size: 12px;
          color: #9CA3AF;
          gap: 4px;
        }
        .form-input-small {
          width: 70px;
          height: 36px;
          padding: 0 12px;
          border-radius: 8px;
          border: 1px solid #475569;
          background: #1E293B;
          color: #E5E7EB;
          font-size: 14px;
        }
        .search-filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
        }
        .search-input-wrapper {
          position: relative;
          flex: 0 0 auto;
          width: 320px;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 14px;
          opacity: 0.7;
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          height: 40px;
          padding: 0 40px 0 40px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: #334155;
          color: #FFFFFF;
          font-size: 14px;
          transition: border-color 0.2s ease;
        }
        .search-input::placeholder {
          color: #9CA3AF;
        }
        .search-input:focus {
          outline: none;
          border-color: #F59E0B;
        }
        .clear-search {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #475569;
          color: #FFFFFF;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: background 0.2s ease;
        }
        .clear-search:hover {
          background: #64748B;
        }
        .rarity-filter {
          width: 180px;
          height: 40px;
          padding: 0 14px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: #334155;
          color: #FFFFFF;
          font-size: 14px;
          cursor: pointer;
          transition: border-color 0.2s ease;
        }
        .rarity-filter:focus {
          outline: none;
          border-color: #F59E0B;
        }
        .rarity-filter option {
          background: #1E293B;
          color: #FFFFFF;
        }
        .filter-info {
          text-align: center;
          color: #9CA3AF;
          font-size: 14px;
          margin-bottom: 16px;
        }
        .filter-info strong {
          color: #F59E0B;
          font-weight: 600;
        }
        .loading {
          text-align: center;
          padding: 40px;
          color: #9CA3AF;
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }
        .empty-text {
          font-size: 18px;
          color: #D1D5DB;
          margin-bottom: 8px;
        }
        .empty-hint {
          font-size: 14px;
          color: #64748B;
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(4, 200px);
          gap: 24px;
          justify-content: center;
          margin-bottom: 24px;
        }
        .card-item {
          width: 200px;
          height: 280px;
          border-radius: 12px;
          background: #1E293B;
          border-bottom: 2px solid #E5E7EB;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
          cursor: default;
        }
        .card-item.selectable {
          cursor: pointer;
        }
        .card-item:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.4);
        }
        .card-item.selected {
          box-shadow: 0 0 0 3px #F59E0B;
        }
        .card-rarity-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          z-index: 2;
        }
        .card-image {
          width: 100%;
          height: 160px;
          overflow: hidden;
          background: #334155;
        }
        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .card-info {
          padding: 12px;
        }
        .card-name {
          font-size: 16px;
          font-weight: 600;
          color: #F9FAFB;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .card-rarity {
          font-size: 12px;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .card-stats {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          color: #D1D5DB;
        }
        .stat-attack {
          color: #EF4444;
          font-weight: 600;
        }
        .stat-defense {
          color: #3B82F6;
          font-weight: 600;
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 20px;
        }
        .btn-page {
          min-width: 100px;
          height: 40px;
          padding: 0 20px;
          border-radius: 20px;
          background: #475569;
          color: #E5E7EB;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        .btn-page:hover:not(:disabled) {
          background: #64748B;
        }
        .btn-page:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .page-info {
          color: #9CA3AF;
          font-size: 14px;
        }
        @media (max-width: 900px) {
          .card-grid {
            grid-template-columns: repeat(2, 200px);
          }
          .search-filter-bar {
            flex-direction: column;
          }
          .search-input-wrapper {
            width: 100%;
            max-width: 300px;
          }
          .rarity-filter {
            width: 100%;
            max-width: 300px;
          }
        }
      `}</style>
    </div>
  )
}
