import { useState, useEffect } from 'react'
import { useBubbleStore } from '../stores/bubbleStore'
import * as THREE from 'three'

interface ControlPanelProps {
  showInput: boolean
  inputPosition: THREE.Vector3 | null
  onCloseInput: () => void
  onSubmitInput: (text: string) => void
}

export function ControlPanel({
  showInput,
  inputPosition,
  onCloseInput,
  onSubmitInput
}: ControlPanelProps) {
  const {
    bubbles,
    highlightedBubbleId,
    editingBubbleId,
    setHighlightedBubble,
    setEditingBubble,
    updateBubbleText,
    reorganizeBubbles,
    isReorganizing
  } = useBubbleStore()

  const [isMobile, setIsMobile] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [inputText, setInputText] = useState('')
  const [editText, setEditText] = useState('')

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (showInput) {
      setInputText('')
    }
  }, [showInput])

  useEffect(() => {
    if (editingBubbleId) {
      const bubble = bubbles.find(b => b.id === editingBubbleId)
      if (bubble) {
        setEditText(bubble.text)
      }
    }
  }, [editingBubbleId, bubbles])

  const handleSubmit = () => {
    if (inputText.trim()) {
      onSubmitInput(inputText.trim())
      setInputText('')
    }
  }

  const handleEditSubmit = () => {
    if (editingBubbleId && editText.trim()) {
      updateBubbleText(editingBubbleId, editText.trim())
    }
    setEditingBubble(null)
  }

  const handleEditCancel = () => {
    setEditingBubble(null)
  }

  const handleBubbleClick = (id: string) => {
    setHighlightedBubble(id)
    setEditingBubble(id)
  }

  const editingBubble = bubbles.find(b => b.id === editingBubbleId)

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: isDrawerOpen ? '70vh' : '60px',
        width: '100%',
        background: 'rgba(13, 11, 31, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '16px 16px 0 0',
        border: '1px solid rgba(255,255,255,0.1)',
        borderBottom: 'none',
        padding: isDrawerOpen ? '20px' : '15px',
        zIndex: 1000,
        transition: 'all 0.3s ease',
        overflow: 'hidden'
      }
    : {
        position: 'fixed',
        left: '10px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '240px',
        maxHeight: '80vh',
        background: 'rgba(13, 11, 31, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '20px',
        zIndex: 1000,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }

  return (
    <>
      <div style={panelStyle}>
        {isMobile ? (
          <div
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: isDrawerOpen ? 'auto' : '100%',
              marginBottom: isDrawerOpen ? '15px' : 0
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                opacity: 0.8
              }}
            >
              {isDrawerOpen ? '▼ 收起面板' : '▲ 气泡诗学 · 展开面板'}
            </span>
          </div>
        ) : (
          <div style={{ marginBottom: '15px' }}>
            <h2
              style={{
                color: '#d4a5ff',
                fontSize: '16px',
                fontWeight: 600,
                margin: 0,
                marginBottom: '5px'
              }}
            >
              气泡诗学
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '11px',
                margin: 0
              }}
            >
              点击空白处添加气泡 · 双击气泡编辑
            </p>
          </div>
        )}

        {(isDrawerOpen || !isMobile) && (
          <>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                marginBottom: '15px',
                paddingRight: '5px',
                maxHeight: isMobile ? '50vh' : '50vh',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.3) transparent'
              }}
            >
              <div
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '12px',
                  marginBottom: '10px'
                }}
              >
                气泡列表 ({bubbles.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {bubbles.map((bubble, index) => (
                  <div
                    key={bubble.id}
                    onClick={() => handleBubbleClick(bubble.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background:
                        highlightedBubbleId === bubble.id
                          ? 'rgba(212, 165, 255, 0.2)'
                          : 'rgba(255,255,255,0.05)',
                      border:
                        highlightedBubbleId === bubble.id
                          ? `1px solid ${bubble.color}`
                          : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: bubble.color,
                          boxShadow: `0 0 8px ${bubble.color}`
                        }}
                      />
                      <span
                        style={{
                          color: '#fff',
                          fontSize: '12px',
                          opacity: 0.85,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {index + 1}. {bubble.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={reorganizeBubbles}
              disabled={isReorganizing}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: isReorganizing
                  ? 'rgba(165, 201, 255, 0.3)'
                  : 'linear-gradient(135deg, rgba(212, 165, 255, 0.4), rgba(165, 201, 255, 0.4))',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isReorganizing ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {isReorganizing ? '重组中...' : '✨ 重新排列气泡'}
            </button>
          </>
        )}
      </div>

      {showInput && inputPosition && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(13, 11, 31, 0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '16px',
            border: '1px solid rgba(212, 165, 255, 0.4)',
            padding: '24px',
            zIndex: 2000,
            minWidth: '320px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}
        >
          <h3
            style={{
              color: '#d4a5ff',
              fontSize: '16px',
              margin: 0,
              marginBottom: '16px'
            }}
          >
            添加新气泡
          </h3>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
              if (e.key === 'Escape') onCloseInput()
            }}
            placeholder="输入一句诗意的文字..."
            autoFocus
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: '14px',
              marginBottom: '16px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onCloseInput}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!inputText.trim()}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                background: inputText.trim()
                  ? 'linear-gradient(135deg, #d4a5ff, #a5c9ff)'
                  : 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 500,
                cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease'
              }}
            >
              确认
            </button>
          </div>
        </div>
      )}

      {editingBubbleId && editingBubble && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(13, 11, 31, 0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '16px',
            border: `1px solid ${editingBubble.color}`,
            padding: '24px',
            zIndex: 2000,
            minWidth: '320px',
            boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 30px ${editingBubble.color}40`
          }}
        >
          <h3
            style={{
              color: editingBubble.color,
              fontSize: '16px',
              margin: 0,
              marginBottom: '16px'
            }}
          >
            编辑气泡文字
          </h3>
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEditSubmit()
              if (e.key === 'Escape') handleEditCancel()
            }}
            autoFocus
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.08)',
              border: `1px solid ${editingBubble.color}60`,
              color: '#fff',
              fontSize: '14px',
              marginBottom: '16px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleEditCancel}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              取消
            </button>
            <button
              onClick={handleEditSubmit}
              disabled={!editText.trim()}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                background: editText.trim()
                  ? `linear-gradient(135deg, ${editingBubble.color}, #a5c9ff)`
                  : 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#0d0b1f',
                fontSize: '13px',
                fontWeight: 600,
                cursor: editText.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease'
              }}
            >
              保存
            </button>
          </div>
        </div>
      )}
    </>
  )
}
