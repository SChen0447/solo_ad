import React, { useState, useRef, useEffect } from 'react'
import { useStore, THEME_COLORS } from '../store'

export const CardEditor: React.FC = () => {
  const isEditorOpen = useStore((state) => state.isEditorOpen)
  const editingCard = useStore((state) => state.editingCard)
  const closeEditor = useStore((state) => state.closeEditor)
  const addCard = useStore((state) => state.addCard)
  const editCard = useStore((state) => state.editCard)

  const [content, setContent] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [selectedColor, setSelectedColor] = useState(THEME_COLORS[0])
  const [image, setImage] = useState<string | undefined>(undefined)
  const [isDragging, setIsDragging] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingCard) {
      setContent(editingCard.content)
      setTagsInput(editingCard.tags.join(', '))
      setSelectedColor(editingCard.themeColor)
      setImage(editingCard.image)
    } else {
      setContent('')
      setTagsInput('')
      setSelectedColor(THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)])
      setImage(undefined)
    }
  }, [editingCard, isEditorOpen])

  const handleClose = () => {
    closeEditor()
  }

  const handleSave = () => {
    if (!content.trim()) return

    setIsSaving(true)

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    setTimeout(() => {
      if (editingCard) {
        editCard(editingCard.id, {
          content: content.trim(),
          tags,
          themeColor: selectedColor,
          image,
        })
      } else {
        addCard({
          content: content.trim(),
          tags,
          themeColor: selectedColor,
          image,
        })
      }
      setIsSaving(false)
      closeEditor()
    }, 300)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files[0] && files[0].type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target?.result as string)
      }
      reader.readAsDataURL(files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target?.result as string)
      }
      reader.readAsDataURL(files[0])
    }
  }

  const removeImage = () => {
    setImage(undefined)
  }

  if (!isEditorOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.3s ease-out',
      }}
      onClick={handleClose}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          width: '90%',
          maxWidth: '520px',
          maxHeight: '85vh',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          background: `linear-gradient(135deg, ${selectedColor}dd 0%, ${selectedColor}99 100%)`,
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '24px 24px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#333' }}>
            {editingCard ? '编辑灵感' : '记录灵感'}
          </h3>
          <button
            onClick={handleClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)'
              e.currentTarget.style.transform = 'rotate(90deg)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)'
              e.currentTarget.style.transform = 'rotate(0deg)'
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: '0 24px 24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              borderRadius: '12px',
              border: isDragging
                ? '2px dashed rgba(255, 255, 255, 0.8)'
                : '2px dashed rgba(255, 255, 255, 0.4)',
              backgroundColor: isDragging
                ? 'rgba(255, 255, 255, 0.3)'
                : 'rgba(255, 255, 255, 0.15)',
              minHeight: image ? 'auto' : '100px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              padding: image ? '12px' : '20px',
              position: 'relative',
            }}
          >
            {image ? (
              <>
                <img
                  src={image}
                  alt="preview"
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    maxHeight: '200px',
                    objectFit: 'cover',
                  }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeImage()
                  }}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ✕
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'rgba(0, 0, 0, 0.5)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
                <div style={{ fontSize: '14px' }}>拖拽或点击上传图片</div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="记录你的灵感..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '16px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              fontSize: '15px',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'all 0.3s ease',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.85)'
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.6)'
            }}
          />

          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="标签（用逗号分隔）"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'inherit',
              transition: 'all 0.3s ease',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.85)'
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.6)'
            }}
          />

          <div>
            <div
              style={{
                fontSize: '13px',
                color: 'rgba(0, 0, 0, 0.5)',
                marginBottom: '10px',
              }}
            >
              选择主题色
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {THEME_COLORS.map((color, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: selectedColor === color ? '3px solid #fff' : '2px solid transparent',
                    backgroundColor: color,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: selectedColor === color ? 'scale(1.15)' : 'scale(1)',
                    boxShadow:
                      selectedColor === color
                        ? '0 2px 8px rgba(0, 0, 0, 0.15)'
                        : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedColor !== color) {
                      e.currentTarget.style.transform = 'scale(1.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedColor !== color) {
                      e.currentTarget.style.transform = 'scale(1)'
                    }
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px 24px 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={handleClose}
            style={{
              padding: '10px 24px',
              borderRadius: '25px',
              border: 'none',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              color: '#555',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!content.trim() || isSaving}
            style={{
              padding: '10px 28px',
              borderRadius: '25px',
              border: 'none',
              backgroundColor: content.trim() ? '#fff' : 'rgba(255, 255, 255, 0.4)',
              color: content.trim() ? '#333' : '#999',
              fontSize: '14px',
              fontWeight: 600,
              cursor: content.trim() && !isSaving ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              transform: isSaving ? 'scale(0.95)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              if (content.trim() && !isSaving) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = isSaving ? 'scale(0.95)' : 'scale(1)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {isSaving ? '保存中...' : editingCard ? '保存修改' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
