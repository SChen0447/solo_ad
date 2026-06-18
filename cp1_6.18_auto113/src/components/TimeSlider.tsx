import { useRef, useState, useEffect, useCallback } from 'react'
import { useStore, HISTORICAL_NODES, STYLE_CONFIG } from '@store/useStore'
import { applyStyle } from '@modules/StyleManager'

const buttonStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(201,169,110,0.18), rgba(201,169,110,0.08))',
  color: '#e8d4a0',
  border: '1px solid rgba(201,169,110,0.4)',
  padding: '8px 18px',
  borderRadius: '6px',
  fontSize: '13px',
  fontFamily: 'Microsoft YaHei, sans-serif',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(201,169,110,0.15)',
  letterSpacing: '0.5px',
}

export function TimeSlider() {
  const currentYear = useStore((s) => s.currentYear)
  const startYear = useStore((s) => s.startYear)
  const endYear = useStore((s) => s.endYear)
  const setCurrentYear = useStore((s) => s.setCurrentYear)
  const setIsDraggingSlider = useStore((s) => s.setIsDraggingSlider)
  const setLightingTint = useStore((s) => s.setLightingTint)

  const sliderRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [trailPositions, setTrailPositions] = useState<
    { x: number; opacity: number; id: number }[]
  >([])
  const [hoverBtn, setHoverBtn] = useState<string | null>(null)
  const trailIdRef = useRef(0)
  const lastTrailTime = useRef(0)

  const progress = ((currentYear - startYear) / (endYear - startYear)) * 100

  const xToYear = useCallback(
    (x: number, rect: DOMRect) => {
      const p = Math.max(0, Math.min(1, (x - rect.left) / rect.width))
      return Math.round(startYear + p * (endYear - startYear))
    },
    [startYear, endYear]
  )

  const handleDrag = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return
      const rect = sliderRef.current.getBoundingClientRect()
      const year = xToYear(clientX, rect)
      setCurrentYear(year)

      const now = Date.now()
      if (now - lastTrailTime.current > 40) {
        lastTrailTime.current = now
        const x = ((year - startYear) / (endYear - startYear)) * 100
        const id = trailIdRef.current++
        setTrailPositions((prev) =>
          [...prev, { x, opacity: 0.8, id }].slice(-20)
        )
      }

      const style = applyStyle(year)
      setLightingTint(style.lightingTint)
    },
    [setCurrentYear, xToYear, startYear, endYear, setLightingTint]
  )

  useEffect(() => {
    if (!isDragging) return
    const onMouseMove = (e: MouseEvent) => handleDrag(e.clientX)
    const onMouseUp = () => {
      setIsDragging(false)
      setIsDraggingSlider(false)
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) handleDrag(e.touches[0].clientX)
    }
    const onTouchEnd = () => {
      setIsDragging(false)
      setIsDraggingSlider(false)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [isDragging, handleDrag, setIsDraggingSlider])

  useEffect(() => {
    if (trailPositions.length === 0) return
    const interval = setInterval(() => {
      setTrailPositions((prev) =>
        prev
          .map((t) => ({ ...t, opacity: t.opacity * 0.92 }))
          .filter((t) => t.opacity > 0.05)
      )
    }, 40)
    return () => clearInterval(interval)
  }, [trailPositions.length])

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    setIsDraggingSlider(true)
    handleDrag(e.clientX)
  }

  const handleSliderTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDragging(true)
      setIsDraggingSlider(true)
      handleDrag(e.touches[0].clientX)
    }
  }

  const handleNodeClick = (year: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentYear(year)
    const style = applyStyle(year)
    setLightingTint(style.lightingTint)
  }

  const currentStyle = applyStyle(currentYear)
  const currentNode = HISTORICAL_NODES.reduce((prev, curr) =>
    Math.abs(curr.year - currentYear) < Math.abs(prev.year - currentYear)
      ? curr
      : prev
  )

  const getBtnStyle = (id: string): React.CSSProperties => ({
    ...buttonStyle,
    transform: hoverBtn === id ? 'scale(1.1)' : 'scale(1)',
    boxShadow:
      hoverBtn === id
        ? '0 4px 16px rgba(201,169,110,0.4), inset 0 1px 0 rgba(201,169,110,0.25), 0 0 12px rgba(201,169,110,0.2)'
        : buttonStyle.boxShadow,
    borderColor: hoverBtn === id ? 'rgba(201,169,110,0.7)' : 'rgba(201,169,110,0.4)',
  })

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '24px 60px 36px',
        background:
          'linear-gradient(to top, rgba(15, 10, 8, 0.95) 0%, rgba(15, 10, 8, 0.6) 70%, transparent 100%)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          pointerEvents: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <span
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#e8d4a0',
              textShadow: '0 0 20px rgba(201,169,110,0.5)',
              fontFamily: 'Georgia, serif',
              letterSpacing: '1px',
            }}
          >
            公元 {currentYear} 年
          </span>
          <span
            style={{
              fontSize: '16px',
              color: '#c9a96e',
              padding: '4px 12px',
              background: 'rgba(201, 169, 110, 0.12)',
              borderRadius: '4px',
              border: '1px solid rgba(201, 169, 110, 0.3)',
              fontFamily: 'Microsoft YaHei, sans-serif',
            }}
          >
            {STYLE_CONFIG[currentNode.style].name} · {currentNode.label}
          </span>
          <span
            style={{
              fontSize: '13px',
              color: '#a89070',
              fontFamily: 'Microsoft YaHei, sans-serif',
            }}
          >
            {STYLE_CONFIG[currentNode.style].description}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onMouseEnter={() => setHoverBtn('prev')}
            onMouseLeave={() => setHoverBtn(null)}
            onClick={() => {
              const idx = Math.max(
                0,
                HISTORICAL_NODES.findIndex((n) => n.year === currentNode.year) - 1
              )
              setCurrentYear(HISTORICAL_NODES[idx].year)
              const s = applyStyle(HISTORICAL_NODES[idx].year)
              setLightingTint(s.lightingTint)
            }}
            style={getBtnStyle('prev')}
          >
            ◀ 上一时代
          </button>
          <button
            onMouseEnter={() => setHoverBtn('next')}
            onMouseLeave={() => setHoverBtn(null)}
            onClick={() => {
              const idx = Math.min(
                HISTORICAL_NODES.length - 1,
                HISTORICAL_NODES.findIndex((n) => n.year === currentNode.year) + 1
              )
              setCurrentYear(HISTORICAL_NODES[idx].year)
              const s = applyStyle(HISTORICAL_NODES[idx].year)
              setLightingTint(s.lightingTint)
            }}
            style={getBtnStyle('next')}
          >
            下一时代 ▶
          </button>
        </div>
      </div>

      <div
        ref={sliderRef}
        onMouseDown={handleSliderMouseDown}
        onTouchStart={handleSliderTouchStart}
        style={{
          position: 'relative',
          height: '60px',
          pointerEvents: 'auto',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: 0,
            right: 0,
            height: '6px',
            background:
              'linear-gradient(90deg, rgba(92,74,58,0.6) 0%, rgba(96,125,139,0.6) 45%, rgba(139,69,19,0.6) 100%)',
            borderRadius: '3px',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${STYLE_CONFIG.tang.tint.getStyle()} 0%, ${STYLE_CONFIG.song.tint.getStyle()} 45%, ${currentStyle.lightingTint.getStyle()} 100%)`,
              borderRadius: '3px',
              boxShadow: `0 0 16px ${currentStyle.lightingTint.getStyle()}80`,
              transition: isDragging ? 'none' : 'width 0.3s ease',
            }}
          />
        </div>

        {trailPositions.map((t) => (
          <div
            key={t.id}
            style={{
              position: 'absolute',
              top: '16px',
              left: `${t.x}%`,
              width: '22px',
              height: '22px',
              marginLeft: '-11px',
              borderRadius: '50%',
              background: currentStyle.lightingTint.getStyle(),
              opacity: t.opacity * 0.4,
              boxShadow: `0 0 20px ${currentStyle.lightingTint.getStyle()}`,
              pointerEvents: 'none',
              transform: `scale(${0.5 + t.opacity * 0.8})`,
              transition: 'opacity 0.1s linear',
            }}
          />
        ))}

        {HISTORICAL_NODES.map((node) => {
          const nodeProgress =
            ((node.year - startYear) / (endYear - startYear)) * 100
          const isActive = node.year === currentNode.year
          const isPast = node.year <= currentYear
          const cfg = STYLE_CONFIG[node.style]

          return (
            <div
              key={node.year}
              onClick={(e) => handleNodeClick(node.year, e)}
              style={{
                position: 'absolute',
                top: '24px',
                left: `${nodeProgress}%`,
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: isActive ? '18px' : isPast ? '12px' : '10px',
                  height: isActive ? '18px' : isPast ? '12px' : '10px',
                  borderRadius: '50%',
                  background: isActive
                    ? cfg.tint.getStyle()
                    : isPast
                    ? cfg.roofColor.clone().lerp(cfg.tint, 0.4).getStyle()
                    : 'rgba(100, 90, 80, 0.5)',
                  border: isActive
                    ? `2px solid #fff6e0`
                    : `1px solid ${isPast ? 'rgba(201,169,110,0.6)' : 'rgba(100,90,80,0.6)'}`,
                  boxShadow: isActive
                    ? `0 0 20px ${cfg.tint.getStyle()}cc, 0 0 8px #fff6e080`
                    : isPast
                    ? `0 0 8px ${cfg.tint.getStyle()}60`
                    : 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: isActive ? '30px' : '24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                  fontSize: isActive ? '13px' : '11px',
                  color: isActive ? '#e8d4a0' : '#8a7a60',
                  fontFamily: 'Microsoft YaHei, sans-serif',
                  fontWeight: isActive ? 600 : 400,
                  textShadow: isActive ? '0 0 10px rgba(201,169,110,0.5)' : 'none',
                  transition: 'all 0.3s ease',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ textAlign: 'center' }}>{node.label}</div>
                <div
                  style={{
                    fontSize: isActive ? '11px' : '10px',
                    opacity: 0.8,
                    marginTop: '2px',
                    color: isActive ? '#c9a96e' : '#6a5a48',
                  }}
                >
                  {node.year}
                </div>
              </div>
            </div>
          )
        })}

        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: `${progress}%`,
            transform: 'translate(-50%, -50%)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${currentStyle.lightingTint.getStyle()} 0%, transparent 70%)`,
            pointerEvents: 'none',
            zIndex: 3,
            transition: isDragging ? 'none' : 'left 0.3s ease',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: `${progress}%`,
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: currentStyle.lightingTint.getStyle(),
            border: '3px solid #fff6e0',
            boxShadow: `0 0 24px ${currentStyle.lightingTint.getStyle()}, 0 4px 12px rgba(0,0,0,0.4)`,
            pointerEvents: 'none',
            zIndex: 4,
            transition: isDragging ? 'none' : 'left 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}
