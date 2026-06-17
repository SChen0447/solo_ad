import { useRef, useState, useCallback } from 'react'
import { CanvasBoard, type CanvasBoardHandle } from './CanvasBoard'
import type { Stroke } from './Analyzer'
import type { EmotionResult } from './EmotionMapper'

export default function App() {
  const boardRef = useRef<CanvasBoardHandle>(null)
  const [emotion, setEmotion] = useState<EmotionResult | null>(null)
  const [, setStrokes] = useState<Stroke[]>([])

  const handleEmotionChange = useCallback((em: EmotionResult | null) => {
    setEmotion(em)
  }, [])

  const handleStrokesChange = useCallback((strokes: Stroke[]) => {
    setStrokes(strokes)
  }, [])

  const handleClear = useCallback(() => {
    boardRef.current?.clear()
  }, [])

  const handleSave = useCallback(() => {
    boardRef.current?.save()
  }, [])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e1e2e 0%, #2a2a3e 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-200px',
          right: '-200px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,99,255,0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '-200px',
          left: '-200px',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(78,205,196,0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      <header style={{ marginBottom: '24px', textAlign: 'center', zIndex: 2 }}>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 700,
            background: 'linear-gradient(90deg, #6c63ff 0%, #4ecdc4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px',
            letterSpacing: '2px'
          }}
        >
          字迹情绪镜
        </h1>
        <p style={{ color: '#888899', fontSize: '14px', maxWidth: '480px', lineHeight: 1.6 }}>
          在画板上随意书写，系统将通过笔迹特征实时分析你的情绪状态
        </p>
      </header>

      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', zIndex: 2 }}>
        <CanvasBoard
          ref={boardRef}
          onEmotionChange={handleEmotionChange}
          onStrokesChange={handleStrokesChange}
        />

        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '22%',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '8px',
            pointerEvents: 'none'
          }}
        >
          {emotion && (
            <>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 700,
                  color: emotion.color,
                  textShadow: `0 0 20px ${emotion.color}55`,
                  transition: 'color 0.3s ease, transform 0.3s ease',
                  animation: 'emotionPop 0.4s ease-out',
                  letterSpacing: '4px'
                }}
              >
                {emotion.label}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  padding: '10px 14px',
                  background: 'rgba(30, 30, 46, 0.7)',
                  borderRadius: '10px',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${emotion.color}33`
                }}
              >
                <DimensionBar label="活力" value={emotion.energy} color="#ff6584" />
                <DimensionBar label="压力" value={emotion.stress} color="#ffaa33" />
                <DimensionBar label="稳定" value={emotion.stability} color="#4ecdc4" />
              </div>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginTop: '24px',
          zIndex: 2
        }}
      >
        <ActionButton onClick={handleClear} gradient={['#6c63ff', '#5a52d5']}>
          清空画板
        </ActionButton>
        <ActionButton onClick={handleSave} gradient={['#4ecdc4', '#3dbdb5']}>
          保存图片
        </ActionButton>
      </div>

      <footer style={{ marginTop: '32px', color: '#555566', fontSize: '12px', zIndex: 2 }}>
        书写完成后等待1.5秒自动分析 · 支持鼠标与触摸笔
      </footer>

      <style>{`
        @keyframes emotionPop {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes btnShine {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </div>
  )
}

interface DimensionBarProps {
  label: string
  value: number
  color: string
}

function DimensionBar({ label, value, color }: DimensionBarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '140px' }}>
      <span style={{ color: '#aaaaaa', fontSize: '12px', width: '32px', flexShrink: 0 }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: '6px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '3px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            height: '100%',
            background: color,
            borderRadius: '3px',
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 8px ${color}66`
          }}
        />
      </div>
      <span style={{ color: color, fontSize: '11px', width: '28px', textAlign: 'right', flexShrink: 0 }}>
        {value}%
      </span>
    </div>
  )
}

interface ActionButtonProps {
  onClick: () => void
  children: React.ReactNode
  gradient: [string, string]
}

function ActionButton({ onClick, children, gradient }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 28px',
        fontSize: '14px',
        fontWeight: 600,
        color: '#ffffff',
        background: `linear-gradient(135deg, ${gradient[0]}cc 0%, ${gradient[1]}cc 100%)`,
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(4px)',
        boxShadow: `0 4px 16px ${gradient[0]}33`,
        letterSpacing: '1px',
        userSelect: 'none'
      }}
      onMouseEnter={(e) => {
        const t = e.currentTarget
        t.style.background = `linear-gradient(135deg, ${gradient[0]}ff 0%, ${gradient[1]}ff 100%)`
        t.style.transform = 'translateY(-3px)'
        t.style.boxShadow = `0 8px 24px ${gradient[0]}55`
      }}
      onMouseLeave={(e) => {
        const t = e.currentTarget
        t.style.background = `linear-gradient(135deg, ${gradient[0]}cc 0%, ${gradient[1]}cc 100%)`
        t.style.transform = 'translateY(0)'
        t.style.boxShadow = `0 4px 16px ${gradient[0]}33`
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)'
      }}
    >
      {children}
    </button>
  )
}
