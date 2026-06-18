import React, { useState, useEffect, useCallback } from 'react'
import { useStoryStore } from '../../store/useStoryStore'

export const PreviewPlayer: React.FC = () => {
  const {
    isPreviewMode,
    previewNodeId,
    nodes,
    setPreviewMode,
    setPreviewNode,
    evaluateCondition,
    previewVariables,
  } = useStoryStore()

  const [isVisible, setIsVisible] = useState(false)
  const [isFadingIn, setIsFadingIn] = useState(false)
  const [showContent, setShowContent] = useState(true)

  const currentNode = nodes.find((n) => n.id === previewNodeId)

  useEffect(() => {
    if (isPreviewMode) {
      setIsVisible(true)
      requestAnimationFrame(() => {
        setIsFadingIn(true)
      })
    } else {
      setIsFadingIn(false)
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [isPreviewMode])

  useEffect(() => {
    if (previewNodeId) {
      setShowContent(false)
      const timer = setTimeout(() => {
        setShowContent(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [previewNodeId])

  const handleClose = useCallback(() => {
    setPreviewMode(false)
  }, [setPreviewMode])

  const handleOptionClick = useCallback((targetNodeId: string | null) => {
    if (targetNodeId) {
      setShowContent(false)
      setTimeout(() => {
        setPreviewNode(targetNodeId)
      }, 200)
    }
  }, [setPreviewNode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPreviewMode) return
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPreviewMode, handleClose])

  const visibleOptions = currentNode
    ? currentNode.options.filter((opt) => evaluateCondition(opt.condition))
    : []

  if (!isVisible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#000000cc',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isFadingIn ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
      onClick={handleClose}
    >
      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          color: '#fff',
          fontSize: '20px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
            'rgba(255, 255, 255, 0.2)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
            'rgba(255, 255, 255, 0.1)'
        }}
      >
        ✕
      </button>

      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '13px',
        }}
      >
        预览模式 · 按 ESC 退出
      </div>

      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        {currentNode?.title || '未命名节点'}
      </div>

      <div
        style={{
          maxWidth: '700px',
          width: '90%',
          textAlign: 'center',
          padding: '40px',
          opacity: showContent ? 1 : 0,
          transform: showContent ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {currentNode ? (
          <>
            <p
              style={{
                fontSize: '28px',
                lineHeight: 1.6,
                color: '#ffffff',
                margin: 0,
                marginBottom: '40px',
                fontWeight: 300,
                letterSpacing: '0.5px',
              }}
            >
              {currentNode.content || '（此节点暂无内容）'}
            </p>

            {visibleOptions.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                {visibleOptions.map((option, idx) => (
                  <button
                    key={option.id}
                    onClick={() => handleOptionClick(option.targetNodeId)}
                    disabled={!option.targetNodeId}
                    style={{
                      width: '240px',
                      height: '48px',
                      borderRadius: '8px',
                      backgroundColor: option.targetNodeId ? '#4fc3f7' : '#555',
                      color: option.targetNodeId ? '#1a1a1a' : '#888',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: option.targetNodeId ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                      animation: `slideIn 0.3s ease-out ${idx * 0.05}s both`,
                    }}
                    onMouseEnter={(e) => {
                      if (option.targetNodeId) {
                        ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          '#81d4fa'
                        ;(e.currentTarget as HTMLButtonElement).style.transform =
                          'scale(1.03)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (option.targetNodeId) {
                        ;(e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          '#4fc3f7'
                        ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
                      }
                    }}
                  >
                    {option.text || '未命名选项'}
                  </button>
                ))}
              </div>
            ) : (
              <div
                style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '14px',
                  marginTop: '40px',
                }}
              >
                — 故事结束 —
              </div>
            )}
          </>
        ) : (
          <p
            style={{
              fontSize: '20px',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            请先选择一个节点开始预览
          </p>
        )}
      </div>

      {Object.keys(previewVariables).length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          <div style={{ marginBottom: '4px', fontWeight: 600 }}>变量状态</div>
          {Object.entries(previewVariables).map(([key, value]) => (
            <div key={key}>
              {key}: {String(value)}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
