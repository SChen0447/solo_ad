import React, { useState, useCallback } from 'react'
import RetroCard from './RetroCard'
import type { Card, CardColumn } from '../api'
import { createCard, updateCardColumn } from '../api'

interface RetroBoardProps {
  team: string
  author: string
  cards: Card[]
  onCardAdded: (card: Card) => void
  onCardUpdated: (card: Card) => void
}

interface ColumnConfig {
  key: CardColumn
  title: string
  icon: string
  bgColor: string
  headerColor: string
}

const columns: ColumnConfig[] = [
  { key: 'highlight', title: '亮点', icon: '🌟', bgColor: '#ecfdf5', headerColor: '#059669' },
  { key: 'improvement', title: '改进点', icon: '🔧', bgColor: '#fff7ed', headerColor: '#ea580c' },
  { key: 'action', title: '行动项', icon: '✅', bgColor: '#eff6ff', headerColor: '#2563eb' }
]

const RetroBoard: React.FC<RetroBoardProps> = ({ team, author, cards, onCardAdded, onCardUpdated }) => {
  const [newCardContent, setNewCardContent] = useState<{ [key in CardColumn]: string }>({
    highlight: '',
    improvement: '',
    action: ''
  })
  const [dragOverColumn, setDragOverColumn] = useState<CardColumn | null>(null)
  const [draggedCard, setDraggedCard] = useState<Card | null>(null)

  const getCardsByColumn = useCallback((column: CardColumn): Card[] => {
    return cards
      .filter(card => card.column === column)
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [cards])

  const handleAddCard = async (column: CardColumn) => {
    const content = newCardContent[column].trim()
    if (!content) return
    try {
      const newCard = await createCard(team, author, content, column)
      onCardAdded(newCard)
      setNewCardContent(prev => ({ ...prev, [column]: '' }))
    } catch (err) {
      console.error('Failed to create card:', err)
    }
  }

  const handleDragStart = (e: React.DragEvent, card: Card) => {
    setDraggedCard(card)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.dropEffect = 'move'
    e.dataTransfer.setData('text/plain', card.id)
    e.dataTransfer.setData('cardId', card.id)
    const target = e.currentTarget as HTMLElement
    if (target) {
      e.dataTransfer.setDragImage(target, 20, 20)
    }
  }

  const handleDragEnd = () => {
    setDraggedCard(null)
    setDragOverColumn(null)
  }

  const handleDragOver = (e: React.DragEvent, column: CardColumn) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverColumn !== column) {
      setDragOverColumn(column)
    }
  }

  const handleDragLeave = (e: React.DragEvent, column: CardColumn) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (
      x < rect.left ||
      x > rect.right ||
      y < rect.top ||
      y > rect.bottom
    ) {
      if (dragOverColumn === column) {
        setDragOverColumn(null)
      }
    }
  }

  const handleDrop = async (e: React.DragEvent, column: CardColumn) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverColumn(null)
    const cardId = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('cardId')
    if (!cardId) return
    const card = cards.find(c => c.id === cardId)
    if (!card || card.column === column) return
    try {
      const updated = await updateCardColumn(cardId, column)
      onCardUpdated(updated)
    } catch (err) {
      console.error('Failed to update card column:', err)
    }
  }

  const totalCards = cards.length

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: '#f1f5f9',
        padding: '24px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '24px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}
      >
        {columns.map(col => {
          const columnCards = getCardsByColumn(col.key)
          const isHighlighted = dragOverColumn === col.key
          return (
            <div
              key={col.key}
              style={{
                width: '320px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 'calc(100vh - 128px)'
              }}
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDragLeave={(e) => handleDragLeave(e, col.key)}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div
                style={{
                  backgroundColor: col.bgColor,
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                  border: isHighlighted ? '2px dashed #6366f1' : '2px solid transparent',
                  transition: 'border-color 0.2s ease'
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 600,
                    color: col.headerColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>{col.icon}</span>
                  <span>{col.title}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#64748b'
                    }}
                  >
                    {columnCards.length}
                  </span>
                </h3>
              </div>

              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '12px',
                  marginBottom: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                }}
              >
                <textarea
                  value={newCardContent[col.key]}
                  onChange={(e) => setNewCardContent(prev => ({
                    ...prev,
                    [col.key]: e.target.value
                  }))}
                  placeholder={`添加新的${col.title}...`}
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '14px',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366f1'
                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0'
                    e.target.style.boxShadow = 'none'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAddCard(col.key)
                    }
                  }}
                />
                <button
                  onClick={() => handleAddCard(col.key)}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#4f46e5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#6366f1'
                  }}
                >
                  添加
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  padding: '4px',
                  overflowY: 'auto',
                  maxHeight: 'calc(100vh - 320px)',
                  border: isHighlighted ? '2px dashed #6366f1' : '2px solid transparent',
                  borderRadius: '12px',
                  transition: 'border-color 0.2s ease',
                  backgroundColor: isHighlighted ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                }}
              >
                {columnCards.map(card => (
                  <div key={card.id} onDragEnd={handleDragEnd}>
                    <RetroCard
                      card={card}
                      onUpdate={onCardUpdated}
                      onDragStart={handleDragStart}
                    />
                  </div>
                ))}
                {columnCards.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '32px 16px',
                      color: '#94a3b8',
                      fontSize: '13px'
                    }}
                  >
                    暂无卡片
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '24px',
          color: '#64748b',
          fontSize: '14px'
        }}
      >
        共 {totalCards} 张卡片
      </div>
    </div>
  )
}

export default RetroBoard
