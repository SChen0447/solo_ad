import { useState, useEffect, useCallback, useRef } from 'react'
import { TimeLineCanvas } from './components/TimeLineCanvas'
import { CardEditor } from './components/CardEditor'
import { Minimap } from './components/Minimap'
import { Card, useGridStore } from './modules/GridStore'
import { parseText, parseImage, isValidImageFile } from './modules/CardParser'
import './styles/global.css'

function App() {
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showPasteInput, setShowPasteInput] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const cards = useGridStore(state => state.cards)
  const addCard = useGridStore(state => state.addCard)
  const updateCard = useGridStore(state => state.updateCard)
  const setViewport = useGridStore(state => state.setViewport)
  const viewportWidth = useGridStore(state => state.viewportWidth)

  useEffect(() => {
    const handleResize = () => {
      setViewport(window.innerWidth, window.innerHeight)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setViewport])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        if (!showPasteInput && !editingCard) {
          e.preventDefault()
          setShowPasteInput(true)
        }
      }
      if (e.key === 'Escape') {
        setShowPasteInput(false)
        setPasteText('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showPasteInput, editingCard])

  const handleCardDoubleClick = useCallback((card: Card) => {
    setEditingCard(card)
  }, [])

  const handleCardHover = useCallback((card: Card | null) => {
    setHoveredCard(card)
  }, [])

  const handleEditorSave = useCallback((id: string, updates: Partial<Card>) => {
    updateCard(id, updates)
  }, [updateCard])

  const handleEditorClose = useCallback(() => {
    setEditingCard(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const text = e.dataTransfer.getData('text/plain')

    if (files.length > 0) {
      for (const file of files) {
        if (isValidImageFile(file)) {
          try {
            const card = await parseImage(file)
            addCard(card)
          } catch (error) {
            console.error('Failed to parse image:', error)
          }
        }
      }
    }

    if (text) {
      const parsedCards = parseText(text)
      for (const card of parsedCards) {
        addCard(card)
      }
    }
  }, [addCard])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    for (const file of files) {
      if (isValidImageFile(file)) {
        try {
          const card = await parseImage(file)
          addCard(card)
        } catch (error) {
          console.error('Failed to parse image:', error)
        }
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [addCard])

  const handlePasteSubmit = useCallback(() => {
    if (pasteText.trim()) {
      const parsedCards = parseText(pasteText)
      for (const card of parsedCards) {
        addCard(card)
      }
    }
    setShowPasteInput(false)
    setPasteText('')
  }, [pasteText, addCard])

  const loadDemoData = useCallback(() => {
    const demoTexts = [
      '2023-01-01\n新年的第一天，阳光明媚，和家人一起吃了一顿丰盛的早餐。这是新的开始，充满了希望。',
      '2023-02-14\n情人节，收到了一束美丽的玫瑰花。虽然天气很冷，但心里暖暖的。',
      '2023-03-20\n春天来了，公园里的樱花都开了。和朋友一起去野餐，拍了很多漂亮的照片。',
      '2023-05-01\n劳动节假期，去了海边。海浪拍打着沙滩，心情特别平静。',
      '2023-07-15\n夏天的夜晚，和朋友一起看星星。聊了很多关于未来的事情。',
      '这是一段没有日期的记录\n记录当下的心情和感受，不需要特定的时间标记。',
      '2023-10-01\n国庆节，去了一个新的城市旅行。看到了很多不同的风景，认识了很多有趣的人。',
      '2023-12-25\n圣诞节，街道上挂满了彩灯。和朋友们交换了礼物，每个人都很开心。',
      '2024-01-01\n新的一年又开始了。回首过去的一年，有太多值得回忆的事情。',
      '2024-03-08\n妇女节，给妈妈送了一束花。她笑得很开心，我也很开心。'
    ]

    for (const text of demoTexts) {
      const parsedCards = parseText(text)
      for (const card of parsedCards) {
        setTimeout(() => {
          addCard(card)
        }, cards.length * 100)
      }
    }
  }, [addCard, cards.length])

  return (
    <div
      className="app-container"
      style={{
        width: '100%',
        height: '100vh',
        backgroundColor: 'var(--bg-primary)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        className="header"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(180deg, rgba(26, 26, 46, 0.95) 0%, rgba(26, 26, 46, 0) 100%)',
          pointerEvents: 'none'
        }}
      >
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-title)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--accent-line)',
              boxShadow: '0 0 12px var(--accent-line)'
            }}
          />
          滚动时光轴
        </h1>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            pointerEvents: 'auto'
          }}
        >
          {cards.length === 0 && (
            <button
              onClick={loadDemoData}
              style={{
                padding: '10px 20px',
                backgroundColor: 'rgba(79, 209, 197, 0.1)',
                border: '1px solid var(--accent-line)',
                borderRadius: '8px',
                color: 'var(--accent-line)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(79, 209, 197, 0.2)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(79, 209, 197, 0.1)'
              }}
            >
              加载示例数据
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(160, 174, 192, 0.1)',
              border: '1px solid rgba(160, 174, 192, 0.3)',
              borderRadius: '8px',
              color: 'var(--text-title)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(160, 174, 192, 0.2)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(160, 174, 192, 0.1)'
            }}
          >
            上传图片
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          <button
            onClick={() => setShowPasteInput(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(79, 209, 197, 0.1)',
              border: '1px solid var(--accent-line)',
              borderRadius: '8px',
              color: 'var(--accent-line)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(79, 209, 197, 0.2)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(79, 209, 197, 0.1)'
            }}
          >
            粘贴文本
          </button>
        </div>
      </div>

      <div
        className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: viewportWidth > 768 ? '600px' : '90%',
          padding: '20px',
          border: isDragOver ? '2px dashed var(--accent-line)' : '2px dashed rgba(160, 174, 192, 0.3)',
          borderRadius: '12px',
          backgroundColor: isDragOver ? 'rgba(79, 209, 197, 0.05)' : 'rgba(22, 33, 62, 0.5)',
          textAlign: 'center',
          color: isDragOver ? 'var(--accent-line)' : 'var(--text-note)',
          fontSize: '14px',
          zIndex: 50,
          transition: 'all 0.3s ease',
          backdropFilter: 'blur(4px)'
        }}
      >
        {isDragOver ? (
          <span style={{ fontWeight: 600 }}>释放以上传内容</span>
        ) : (
          <span>拖拽图片到此处，或使用上方按钮上传 / 粘贴文本（Ctrl+V）</span>
        )}
      </div>

      {showPasteInput && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            animation: 'fadeIn 0.3s ease forwards'
          }}
          onClick={() => {
            setShowPasteInput(false)
            setPasteText('')
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'rgba(22, 33, 62, 0.95)',
              borderRadius: '16px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(160, 174, 192, 0.2)',
              animation: 'editorPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            }}
          >
            <h3
              style={{
                margin: '0 0 16px 0',
                color: 'var(--text-title)',
                fontSize: '18px',
                fontWeight: 600
              }}
            >
              粘贴文本内容
            </h3>
            <p
              style={{
                margin: '0 0 12px 0',
                color: 'var(--text-note)',
                fontSize: '13px'
              }}
            >
              支持自动识别时间标记如 2023-01-01 或 2023/01/01
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={8}
              autoFocus
              placeholder="在这里粘贴文本内容..."
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(26, 26, 46, 0.8)',
                border: '1px solid rgba(160, 174, 192, 0.3)',
                borderRadius: '10px',
                color: 'var(--text-title)',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                marginBottom: '16px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handlePasteSubmit()
                }
              }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowPasteInput(false)
                  setPasteText('')
                }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  backgroundColor: 'rgba(160, 174, 192, 0.1)',
                  border: '1px solid rgba(160, 174, 192, 0.3)',
                  borderRadius: '8px',
                  color: 'var(--text-note)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(160, 174, 192, 0.2)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(160, 174, 192, 0.1)'
                }}
              >
                取消
              </button>
              <button
                onClick={handlePasteSubmit}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  backgroundColor: 'var(--accent-line)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#1A1A2E',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 15px rgba(79, 209, 197, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(79, 209, 197, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(79, 209, 197, 0.3)'
                }}
              >
                确定（Ctrl+Enter）
              </button>
            </div>
          </div>
        </div>
      )}

      {hoveredCard && !editingCard && (
        <div
          className="hover-tooltip"
          style={{
            position: 'fixed',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 20px',
            backgroundColor: 'rgba(22, 33, 62, 0.95)',
            borderRadius: '10px',
            border: `1px solid ${hoveredCard.color}40`,
            boxShadow: `0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px ${hoveredCard.color}20`,
            zIndex: 100,
            animation: 'fadeIn 0.2s ease forwards',
            backdropFilter: 'blur(8px)',
            maxWidth: '400px',
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '6px'
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: hoveredCard.color,
                boxShadow: `0 0 8px ${hoveredCard.color}`
              }}
            />
            <span
              style={{
                color: 'var(--text-title)',
                fontWeight: 600,
                fontSize: '14px'
              }}
            >
              {hoveredCard.title}
            </span>
          </div>
          <p
            style={{
              margin: 0,
              color: 'var(--text-note)',
              fontSize: '12px',
              lineHeight: 1.5
            }}
          >
            {hoveredCard.content}
          </p>
          <p
            style={{
              margin: '8px 0 0 0',
              color: hoveredCard.isUnfiled ? '#F6AD55' : 'var(--accent-line)',
              fontSize: '11px'
            }}
          >
            {hoveredCard.isUnfiled
              ? '未归档'
              : hoveredCard.timestamp?.toISOString().split('T')[0] || '未知日期'}
          </p>
          <p
            style={{
              margin: '4px 0 0 0',
              color: 'rgba(160, 174, 192, 0.6)',
              fontSize: '10px'
            }}
          >
            双击编辑内容
          </p>
        </div>
      )}

      <div style={{ paddingTop: '120px' }}>
        <TimeLineCanvas
          onCardDoubleClick={handleCardDoubleClick}
          onCardHover={handleCardHover}
        />
      </div>

      <Minimap />

      <CardEditor
        card={editingCard}
        onClose={handleEditorClose}
        onSave={handleEditorSave}
      />

      {cards.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'var(--text-note)',
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              fontSize: '48px',
              marginBottom: '16px',
              opacity: 0.5
            }}
          >
            📅
          </div>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>
            时光轴还是空的
          </p>
          <p style={{ fontSize: '13px', opacity: 0.7 }}>
            拖拽图片或粘贴文本开始创建你的记忆时光轴
          </p>
        </div>
      )}
    </div>
  )
}

export default App
