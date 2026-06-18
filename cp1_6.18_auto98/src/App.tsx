import { useState, useMemo, useEffect, useCallback } from 'react'
import { useStore } from './store'
import { CardEditor } from './components/CardEditor'
import { CardItem } from './components/CardItem'
import { SearchBar } from './components/SearchBar'
import { THEME_COLORS } from './store'

function App() {
  const cards = useStore((state) => state.cards)
  const getFilteredCards = useStore((state) => state.getFilteredCards)
  const reorderCards = useStore((state) => state.reorderCards)
  const openEditor = useStore((state) => state.openEditor)

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [buttonColor] = useState(THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)])
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const filteredCards = useMemo(() => getFilteredCards(), [getFilteredCards, cards])

  const columns = useMemo(() => {
    if (windowWidth < 600) return 1
    if (windowWidth < 900) return 2
    if (windowWidth < 1200) return 3
    return 3
  }, [windowWidth])

  const isNarrowScreen = windowWidth < 900

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index)
  }, [])

  const handleDragOver = useCallback((index: number) => {
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index)
    }
  }, [draggedIndex])

  const handleDragEnd = useCallback(() => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      reorderCards(draggedIndex, dragOverIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex, dragOverIndex, reorderCards])

  const handleAddClick = () => {
    openEditor()
  }

  const cardStyle = (index: number) => {
    const isDragging = draggedIndex === index
    const isDragOver = dragOverIndex === index && draggedIndex !== index

    return {
      opacity: isDragging ? 0.5 : 1,
      transform: isDragging
        ? 'scale(0.95) rotate(2deg)'
        : isDragOver
        ? 'translateY(-8px)'
        : 'translateY(0)',
      transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      zIndex: isDragging ? 100 : 1,
    }
  }

  const masonryCards = useMemo(() => {
    const cols: typeof filteredCards[] = Array.from({ length: columns }, () => [])
    filteredCards.forEach((card, index) => {
      const colIndex = index % columns
      cols[colIndex].push(card)
    })
    return cols
  }, [filteredCards, columns])

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F5F2EB',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
      }}
    >
      <style>{`
        @keyframes breathe {
          0%, 100% {
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
            transform: scale(1.05);
          }
        }
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          flexDirection: isNarrowScreen ? 'column' : 'row',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            width: isNarrowScreen ? '100%' : '260px',
            flexShrink: 0,
            padding: isNarrowScreen ? '20px' : '28px 20px',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(10px)',
            borderRight: isNarrowScreen ? 'none' : '1px solid rgba(0, 0, 0, 0.05)',
            borderBottom: isNarrowScreen ? '1px solid rgba(0, 0, 0, 0.05)' : 'none',
            position: isNarrowScreen ? 'relative' : 'sticky',
            top: 0,
            height: isNarrowScreen ? 'auto' : '100vh',
            overflowY: isNarrowScreen ? 'visible' : 'auto',
            boxSizing: 'border-box',
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: `linear-gradient(135deg, ${buttonColor} 0%, #fff 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              }}
            >
              💡
            </div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#333',
                margin: 0,
              }}
            >
              灵感速记板
            </h1>
          </div>

          <button
            onClick={handleAddClick}
            style={{
              width: isNarrowScreen ? 'auto' : '100%',
              padding: '12px 24px',
              borderRadius: '14px',
              border: 'none',
              background: `linear-gradient(135deg, ${buttonColor} 0%, ${THEME_COLORS[(THEME_COLORS.indexOf(buttonColor) + 3) % THEME_COLORS.length]} 100%)`,
              color: '#555',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '24px',
              animation: 'breathe 2.5s ease-in-out infinite',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)'
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            新建灵感
          </button>

          {!isNarrowScreen && <SearchBar />}
        </div>

        {isNarrowScreen && (
          <div
            style={{
              padding: '0 20px 20px',
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
            }}
          >
            <SearchBar />
          </div>
        )}

        <div
          style={{
            flex: 1,
            padding: isNarrowScreen ? '20px' : '28px 32px',
            overflowX: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#333',
                margin: 0,
              }}
            >
              我的灵感
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#999',
                  marginLeft: '10px',
                }}
              >
                共 {filteredCards.length} 张
              </span>
            </h2>
          </div>

          {filteredCards.length > 0 ? (
            <div
              style={{
                display: 'flex',
                gap: '20px',
                alignItems: 'flex-start',
              }}
            >
              {masonryCards.map((col, colIndex) => (
                <div
                  key={colIndex}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                  }}
                >
                  {col.map((card) => {
                    const cardIndex = filteredCards.findIndex((c) => c.id === card.id)
                    return (
                      <div
                        key={card.id}
                        style={cardStyle(cardIndex)}
                      >
                        <CardItem
                          card={card}
                          index={cardIndex}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDragEnd={handleDragEnd}
                          isDragging={draggedIndex === cardIndex}
                        />
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
              }}
            >
              <div
                style={{
                  fontSize: '64px',
                  marginBottom: '20px',
                  opacity: 0.5,
                }}
              >
                🌸
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: '#999',
                  marginBottom: '8px',
                }}
              >
                还没有灵感卡片
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#bbb',
                }}
              >
                点击左上角的 + 按钮，记录你的第一个灵感吧
              </div>
            </div>
          )}
        </div>
      </div>

      <CardEditor />
    </div>
  )
}

export default App
