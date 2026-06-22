import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Idea, getRankedIdeas, updateIdeaPriority } from '../api/ideas'
import Toast from '../components/Toast'

const PrioritizationBoard: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draggedIdea, setDraggedIdea] = useState<Idea | null>(null)
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 })
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const boardRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const fetchIdeas = useCallback(async () => {
    try {
      const data = await getRankedIdeas()
      setIdeas(data)
    } catch (error) {
      setToastMessage('加载数据失败')
      setToastType('error')
      setShowToast(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIdeas()
  }, [fetchIdeas])

  const highPriority = ideas.filter(i => i.voteCount >= 10).sort((a, b) => b.voteCount - a.voteCount)
  const mediumPriority = ideas.filter(i => i.voteCount >= 5 && i.voteCount < 10).sort((a, b) => b.voteCount - a.voteCount)
  const lowPriority = ideas.filter(i => i.voteCount < 5).sort((a, b) => b.voteCount - a.voteCount)

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, idea: Idea) => {
    e.preventDefault()
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const cardElement = cardRefs.current[idea.id]
    if (cardElement) {
      const rect = cardElement.getBoundingClientRect()
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top
      })
    }

    setDraggedIdea(idea)
    setDragPosition({ x: clientX, y: clientY })
  }

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!draggedIdea) return
    
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY
    
    setDragPosition({ x: clientX, y: clientY })
  }, [draggedIdea])

  const handleDragEnd = useCallback(async (e: MouseEvent | TouchEvent) => {
    if (!draggedIdea || !boardRef.current) {
      setDraggedIdea(null)
      return
    }

    const clientX = 'changedTouches' in e 
      ? (e as TouchEvent).changedTouches[0].clientX 
      : (e as MouseEvent).clientX
    const clientY = 'changedTouches' in e 
      ? (e as TouchEvent).changedTouches[0].clientY 
      : (e as MouseEvent).clientY

    const columns = boardRef.current.querySelectorAll('.board-column')
    let targetPriority: 'high' | 'medium' | 'low' | null = null

    columns.forEach((col) => {
      const rect = col.getBoundingClientRect()
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        targetPriority = col.getAttribute('data-priority') as 'high' | 'medium' | 'low'
      }
    })

    if (targetPriority && targetPriority !== draggedIdea.priority) {
      try {
        await updateIdeaPriority(draggedIdea.id, targetPriority)
        
        setIdeas(prev => 
          prev.map(idea => 
            idea.id === draggedIdea.id 
              ? { ...idea, priority: targetPriority as 'high' | 'medium' | 'low' }
              : idea
          )
        )
        
        setToastMessage('优先级已更新')
        setToastType('success')
        setShowToast(true)
      } catch (error) {
        setToastMessage('更新失败，请重试')
        setToastType('error')
        setShowToast(true)
      }
    }

    setDraggedIdea(null)
  }, [draggedIdea])

  useEffect(() => {
    if (draggedIdea) {
      const handleMove = (e: MouseEvent) => handleDragMove(e)
      const handleEnd = (e: MouseEvent) => handleDragEnd(e)
      const handleTouchMove = (e: TouchEvent) => handleDragMove(e)
      const handleTouchEnd = (e: TouchEvent) => handleDragEnd(e)

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleEnd)
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleTouchEnd)

      return () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleEnd)
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [draggedIdea, handleDragMove, handleDragEnd])

  const getColumnConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          title: '高优先级',
          subtitle: '票数 ≥ 10',
          bgColor: '#FEF2F2',
          accentColor: '#EF4444',
          data: highPriority
        }
      case 'medium':
        return {
          title: '中优先级',
          subtitle: '票数 5 - 9',
          bgColor: '#FFFBEB',
          accentColor: '#F59E0B',
          data: mediumPriority
        }
      case 'low':
        return {
          title: '低优先级',
          subtitle: '票数 0 - 4',
          bgColor: '#ECFDF5',
          accentColor: '#10B981',
          data: lowPriority
        }
      default:
        return { title: '', subtitle: '', bgColor: '', accentColor: '', data: [] }
    }
  }

  const renderBoardCard = (idea: Idea, index: number) => {
    const isDragging = draggedIdea?.id === idea.id
    
    return (
      <div
        key={idea.id}
        ref={el => { cardRefs.current[idea.id] = el }}
        className={`board-card ${isDragging ? 'dragging' : ''}`}
        style={{
          animationDelay: `${index * 80}ms`,
          animation: !isLoading ? 'fadeInUp 0.5s ease forwards' : undefined,
          opacity: isDragging ? 0 : undefined
        }}
        onMouseDown={(e) => handleDragStart(e, idea)}
        onTouchStart={(e) => handleDragStart(e, idea)}
      >
        <div className="card-priority-badge" style={{ background: idea.priority === 'high' ? '#FEE2E2' : idea.priority === 'medium' ? '#FEF3C7' : '#D1FAE5', color: idea.priority === 'high' ? '#DC2626' : idea.priority === 'medium' ? '#D97706' : '#059669' }}>
          {idea.priority === 'high' ? '高' : idea.priority === 'medium' ? '中' : '低'}
        </div>
        <h4 className="board-card-title">{idea.title}</h4>
        <p className="board-card-desc">{idea.description}</p>
        <div className="board-card-footer">
          <span className="board-card-author">{idea.author}</span>
          <span className="board-card-votes">{idea.voteCount} 票</span>
        </div>
      </div>
    )
  }

  return (
    <div className="prioritization-board" ref={boardRef}>
      <div className="board-header">
        <h2>优先级看板</h2>
        <p>拖拽卡片到不同列来调整创意的优先级</p>
      </div>

      {isLoading ? (
        <div className="loading-placeholder">
          <div className="loading-spinner" />
          <p>加载中...</p>
        </div>
      ) : (
        <div className="board-columns">
          {['high', 'medium', 'low'].map(priority => {
            const config = getColumnConfig(priority)
            return (
              <div
                key={priority}
                className={`board-column ${draggedIdea ? 'drag-active' : ''}`}
                data-priority={priority}
                style={{ background: config.bgColor }}
              >
                <div className="column-header">
                  <div className="column-title-group">
                    <div className="column-dot" style={{ background: config.accentColor }} />
                    <h3 className="column-title">{config.title}</h3>
                  </div>
                  <span className="column-count">{config.data.length}</span>
                </div>
                <p className="column-subtitle">{config.subtitle}</p>
                
                <div className="column-cards">
                  {config.data.length === 0 ? (
                    <div className="empty-column">
                      <p>暂无创意</p>
                    </div>
                  ) : (
                    config.data.map((idea, index) => renderBoardCard(idea, index))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {draggedIdea && (
        <div
          className="dragged-card"
          style={{
            left: dragPosition.x - dragOffset.x,
            top: dragPosition.y - dragOffset.y
          }}
        >
          <div className="card-priority-badge" style={{ 
            background: draggedIdea.priority === 'high' ? '#FEE2E2' : 
                      draggedIdea.priority === 'medium' ? '#FEF3C7' : '#D1FAE5',
            color: draggedIdea.priority === 'high' ? '#DC2626' : 
                   draggedIdea.priority === 'medium' ? '#D97706' : '#059669'
          }}>
            {draggedIdea.priority === 'high' ? '高' : draggedIdea.priority === 'medium' ? '中' : '低'}
          </div>
          <h4 className="board-card-title">{draggedIdea.title}</h4>
          <p className="board-card-desc">{draggedIdea.description}</p>
          <div className="board-card-footer">
            <span className="board-card-author">{draggedIdea.author}</span>
            <span className="board-card-votes">{draggedIdea.voteCount} 票</span>
          </div>
        </div>
      )}

      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}

      <style>{`
        .prioritization-board {
          position: relative;
          padding: 0 24px;
        }
        
        .board-header {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .board-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: #1F2937;
          margin: 0 0 8px;
        }
        
        .board-header p {
          font-size: 14px;
          color: #6B7280;
          margin: 0;
        }
        
        .board-columns {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .board-column {
          border-radius: 16px;
          padding: 20px;
          min-height: 500px;
          transition: background 0.25s ease, box-shadow 0.25s ease;
          border: 2px solid transparent;
        }
        
        .board-column.drag-active {
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .column-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        
        .column-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .column-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        
        .column-title {
          font-size: 18px;
          font-weight: 700;
          color: #1F2937;
          margin: 0;
        }
        
        .column-count {
          font-size: 14px;
          font-weight: 600;
          color: #6B7280;
          background: rgba(255, 255, 255, 0.8);
          padding: 2px 10px;
          border-radius: 12px;
        }
        
        .column-subtitle {
          font-size: 12px;
          color: #9CA3AF;
          margin: 0 0 16px;
        }
        
        .column-cards {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .empty-column {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 0;
          color: #9CA3AF;
          font-size: 13px;
        }
        
        .board-card {
          background: #FFFFFF;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          cursor: grab;
          transition: box-shadow 0.25s ease, transform 0.25s ease;
          position: relative;
          user-select: none;
        }
        
        .board-card:hover {
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }
        
        .board-card.dragging {
          opacity: 0.3;
        }
        
        .card-priority-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
        }
        
        .board-card-title {
          font-size: 15px;
          font-weight: 600;
          color: #1F2937;
          margin: 0 0 8px;
          padding-right: 36px;
          line-height: 1.4;
        }
        
        .board-card-desc {
          font-size: 13px;
          color: #6B7280;
          margin: 0 0 12px;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .board-card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 8px;
          border-top: 1px solid #F3F4F6;
        }
        
        .board-card-author {
          font-size: 12px;
          color: #9CA3AF;
        }
        
        .board-card-votes {
          font-size: 13px;
          font-weight: 600;
          color: #6366F1;
        }
        
        .dragged-card {
          position: fixed;
          width: 280px;
          background: #FFFFFF;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
          pointer-events: none;
          z-index: 3000;
          opacity: 0.9;
          transform: rotate(2deg);
        }
        
        .loading-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          color: #9CA3AF;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #E5E7EB;
          border-top-color: #6366F1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (max-width: 1024px) {
          .board-columns {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .board-column {
            min-height: auto;
          }
        }
      `}</style>
    </div>
  )
}

export default PrioritizationBoard
