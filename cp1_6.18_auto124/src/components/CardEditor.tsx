import { useState, useEffect, useRef } from 'react'
import { Card, useGridStore } from '../modules/GridStore'
import { formatDate } from '../modules/CardParser'

interface CardEditorProps {
  card: Card | null
  onClose: () => void
  onSave: (id: string, updates: Partial<Card>) => void
}

export const CardEditor = ({ card, onClose, onSave }: CardEditorProps) => {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [isUnfiled, setIsUnfiled] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const updateCard = useGridStore(state => state.updateCard)

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setContent(card.content)
      setIsUnfiled(card.isUnfiled)
      if (card.timestamp) {
        setDateStr(formatDate(card.timestamp))
      } else {
        setDateStr('')
      }
    }
  }, [card])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (card) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [card, onClose])

  if (!card) return null

  const handleSave = () => {
    let timestamp: Date | null = null

    if (!isUnfiled && dateStr) {
      const parsedDate = new Date(dateStr)
      if (!isNaN(parsedDate.getTime())) {
        timestamp = parsedDate
      }
    }

    onSave(card.id, {
      title: title.substring(0, 30),
      content: content.substring(0, 200),
      timestamp,
      isUnfiled: isUnfiled || !timestamp,
      isUpdating: true
    })

    setTimeout(() => {
      updateCard(card.id, { isUpdating: false })
    }, 400)

    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      onClose()
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateStr(e.target.value)
    if (e.target.value) {
      setIsUnfiled(false)
    }
  }

  const handleUnfiledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsUnfiled(e.target.checked)
    if (e.target.checked) {
      setDateStr('')
    }
  }

  return (
    <div
      ref={overlayRef}
      className="editor-overlay"
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease forwards'
      }}
    >
      <div
        ref={editorRef}
        className="editor-container"
        style={{
          backgroundColor: 'rgba(22, 33, 62, 0.95)',
          borderRadius: '20px',
          padding: '32px',
          width: '90%',
          maxWidth: '500px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          border: `2px solid ${card.color}40`,
          animation: 'editorPopIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
        }}
      >
        <h2
          style={{
            margin: '0 0 24px 0',
            color: 'var(--text-title)',
            fontSize: '24px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: card.color,
              boxShadow: `0 0 12px ${card.color}`
            }}
          />
          编辑卡片
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label
              style={{
                display: 'block',
                color: 'var(--text-note)',
                fontSize: '14px',
                marginBottom: '8px',
                fontWeight: 500
              }}
            >
              标题（最多30字）
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={30}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(26, 26, 46, 0.8)',
                border: '1px solid rgba(160, 174, 192, 0.3)',
                borderRadius: '10px',
                color: 'var(--text-title)',
                fontSize: '16px',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = card.color
                e.target.style.boxShadow = `0 0 0 3px ${card.color}20`
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(160, 174, 192, 0.3)'
                e.target.style.boxShadow = 'none'
              }}
              placeholder="输入标题..."
            />
            <div
              style={{
                textAlign: 'right',
                marginTop: '4px',
                fontSize: '12px',
                color: title.length >= 30 ? '#F6AD55' : 'var(--text-note)'
              }}
            >
              {title.length}/30
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                color: 'var(--text-note)',
                fontSize: '14px',
                marginBottom: '8px',
                fontWeight: 500
              }}
            >
              注释（最多200字）
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={200}
              rows={4}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'rgba(26, 26, 46, 0.8)',
                border: '1px solid rgba(160, 174, 192, 0.3)',
                borderRadius: '10px',
                color: 'var(--text-title)',
                fontSize: '14px',
                outline: 'none',
                resize: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                lineHeight: 1.5
              }}
              onFocus={(e) => {
                e.target.style.borderColor = card.color
                e.target.style.boxShadow = `0 0 0 3px ${card.color}20`
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(160, 174, 192, 0.3)'
                e.target.style.boxShadow = 'none'
              }}
              placeholder="输入注释内容..."
            />
            <div
              style={{
                textAlign: 'right',
                marginTop: '4px',
                fontSize: '12px',
                color: content.length >= 200 ? '#F6AD55' : 'var(--text-note)'
              }}
            >
              {content.length}/200
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                color: 'var(--text-note)',
                fontSize: '14px',
                marginBottom: '8px',
                fontWeight: 500
              }}
            >
              时间戳
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="date"
                value={dateStr}
                onChange={handleDateChange}
                disabled={isUnfiled}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  backgroundColor: 'rgba(26, 26, 46, 0.8)',
                  border: '1px solid rgba(160, 174, 192, 0.3)',
                  borderRadius: '10px',
                  color: 'var(--text-title)',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  boxSizing: 'border-box',
                  opacity: isUnfiled ? 0.5 : 1,
                  cursor: isUnfiled ? 'not-allowed' : 'pointer'
                }}
                onFocus={(e) => {
                  if (!isUnfiled) {
                    e.target.style.borderColor = card.color
                    e.target.style.boxShadow = `0 0 0 3px ${card.color}20`
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(160, 174, 192, 0.3)'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-note)', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={isUnfiled}
                  onChange={handleUnfiledChange}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    accentColor: card.color
                  }}
                />
                未归档
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '14px 24px',
              backgroundColor: 'rgba(160, 174, 192, 0.1)',
              border: '1px solid rgba(160, 174, 192, 0.3)',
              borderRadius: '10px',
              color: 'var(--text-note)',
              fontSize: '15px',
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
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '14px 24px',
              backgroundColor: card.color,
              border: 'none',
              borderRadius: '10px',
              color: '#1A1A2E',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: `0 4px 15px ${card.color}40`
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = `0 6px 20px ${card.color}60`
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = `0 4px 15px ${card.color}40`
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
