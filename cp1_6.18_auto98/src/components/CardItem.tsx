import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import type { Card } from '../store'

interface CardItemProps {
  card: Card
  index: number
  isFiltered?: boolean
  onDragStart?: (index: number) => void
  onDragOver?: (index: number) => void
  onDragEnd?: () => void
  isDragging?: boolean
}

export const CardItem: React.FC<CardItemProps> = ({
  card,
  index,
  isFiltered = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging = false,
}) => {
  const deleteCard = useStore((state) => state.deleteCard)
  const setTop = useStore((state) => state.setTop)
  const openEditor = useStore((state) => state.openEditor)

  const [showMenu, setShowMenu] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [isEntering, setIsEntering] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsEntering(false)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(!showMenu)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteCard(card.id)
    setShowMenu(false)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    openEditor(card)
    setShowMenu(false)
  }

  const handleTop = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTop(card.id)
    setShowMenu(false)
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(index)
    }
    e.dataTransfer.effectAllowed = 'move'
    setTimeout(() => {
      setShowDetail(false)
    }, 0)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (onDragOver) {
      onDragOver(index)
    }
  }

  const handleDragEnd = () => {
    if (onDragEnd) {
      onDragEnd()
    }
  }

  const toggleDetail = () => {
    if (!isDragging) {
      setShowDetail(!showDetail)
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  return (
    <>
      <style>{`
        @keyframes cardEnter {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes cardExit {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.8);
          }
        }
        @keyframes fadeSlideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes detailEnter {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes menuFadeIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-5px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>

      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onClick={toggleDetail}
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
          cursor: 'pointer',
          transition: isDragging
            ? 'none'
            : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: isDragging
            ? 'scale(0.9) rotate(2deg)'
            : isEntering
            ? 'scale(0.8) translateY(20px)'
            : 'scale(1)',
          opacity: isFiltered ? 0 : 1,
          animation: isEntering ? 'cardEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none',
          position: 'relative',
          overflow: 'hidden',
          borderTop: `4px solid ${card.themeColor}`,
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isDragging) {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.06)'
          }
        }}
      >
        {card.isTop && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '16px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#FFB347',
              padding: '2px 10px',
              borderRadius: '10px',
              zIndex: 1,
            }}
          >
            置顶
          </div>
        )}

        <div
          ref={menuRef}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 10,
          }}
        >
          <button
            onClick={handleMenuClick}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: '#999',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)'
              e.currentTarget.style.color = '#666'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#999'
            }}
          >
            ⋮
          </button>

          {showMenu && (
            <div
              style={{
                position: 'absolute',
                top: '32px',
                right: 0,
                backgroundColor: '#fff',
                borderRadius: '10px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
                padding: '6px',
                minWidth: '120px',
                animation: 'menuFadeIn 0.2s ease-out',
                zIndex: 100,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleTop}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#555',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                📌 {card.isTop ? '取消置顶' : '置顶'}
              </button>
              <button
                onClick={handleEdit}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#555',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                ✏️ 编辑
              </button>
              <button
                onClick={handleDelete}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#e74c3c',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef0f0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                🗑️ 删除
              </button>
            </div>
          )}
        </div>

        {card.image && (
          <div
            style={{
              marginBottom: '14px',
              borderRadius: '10px',
              overflow: 'hidden',
              marginTop: card.isTop ? '24px' : '0',
            }}
          >
            <img
              src={card.image}
              alt="card"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          </div>
        )}

        <div
          style={{
            fontSize: '14px',
            lineHeight: 1.7,
            color: '#333',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginTop: card.isTop && !card.image ? '24px' : '0',
            display: '-webkit-box',
            WebkitLineClamp: 6,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {card.content}
        </div>

        {card.tags.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginTop: '14px',
            }}
          >
            {card.tags.map((tag, tagIndex) => (
              <span
                key={tagIndex}
                style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: card.themeColor,
                  color: '#555',
                  fontWeight: 500,
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div
          style={{
            fontSize: '12px',
            color: '#bbb',
            marginTop: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{formatDate(card.createdAt)}</span>
          <span style={{ opacity: 0.6 }}>点击查看详情</span>
        </div>
      </div>

      {showDetail && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            animation: 'fadeIn 0.3s ease-out',
            padding: '20px',
          }}
          onClick={toggleDetail}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>

          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
              animation: 'detailEnter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              position: 'relative',
              borderTop: `6px solid ${card.themeColor}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {card.isTop && (
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '32px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: '#FFB347',
                  padding: '4px 14px',
                  borderRadius: '12px',
                }}
              >
                📌 置顶
              </div>
            )}

            <button
              onClick={toggleDetail}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#f5f5f5',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#eee'
                e.currentTarget.style.transform = 'rotate(90deg)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5'
                e.currentTarget.style.transform = 'rotate(0deg)'
              }}
            >
              ✕
            </button>

            <div style={{ marginTop: card.isTop ? '40px' : '0' }}>
              {card.image && (
                <div
                  style={{
                    marginBottom: '24px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={card.image}
                    alt="detail"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                    }}
                  />
                </div>
              )}

              <div
                style={{
                  fontSize: '16px',
                  lineHeight: 1.8,
                  color: '#333',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {card.content}
              </div>

              {card.tags.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginTop: '24px',
                  }}
                >
                  {card.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      style={{
                        fontSize: '13px',
                        padding: '6px 14px',
                        borderRadius: '14px',
                        backgroundColor: card.themeColor,
                        color: '#555',
                        fontWeight: 500,
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div
                style={{
                  marginTop: '24px',
                  paddingTop: '20px',
                  borderTop: '1px solid #f0f0f0',
                  fontSize: '13px',
                  color: '#999',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>创建于 {formatDate(card.createdAt)}</span>
                <span style={{ fontSize: '12px' }}>共 {card.content.length} 字</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
