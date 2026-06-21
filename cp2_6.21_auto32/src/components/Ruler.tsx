import React, { useRef } from 'react'

interface RulerProps {
  orientation: 'horizontal' | 'vertical'
  length: number
  scale?: number
  onAddGuideLine?: (position: number) => void
}

const Ruler: React.FC<RulerProps> = ({
  orientation,
  length,
  scale = 1,
  onAddGuideLine,
}) => {
  const rulerRef = useRef<HTMLDivElement>(null)

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!onAddGuideLine || !rulerRef.current) return
    const rect = rulerRef.current.getBoundingClientRect()
    const position = orientation === 'horizontal'
      ? (e.clientX - rect.left) / scale
      : (e.clientY - rect.top) / scale
    onAddGuideLine(Math.round(position))
  }

  const ticks: JSX.Element[] = []
  const scaledLength = length * scale
  const tickInterval = 10 * scale

  for (let pos = 0; pos <= scaledLength; pos += tickInterval) {
    const isMajor = pos % (50 * scale) === 0
    const tickHeight = isMajor ? 12 : 6
    const tickColor = isMajor ? '#9CA3AF' : '#D1D5DB'
    const originalPos = pos / scale

    if (orientation === 'horizontal') {
      ticks.push(
        <div
          key={`tick-${pos}`}
          style={{
            position: 'absolute',
            left: pos,
            bottom: 0,
            width: 1,
            height: tickHeight,
            backgroundColor: tickColor,
          }}
        />
      )
      if (isMajor) {
        ticks.push(
          <span
            key={`label-${pos}`}
            style={{
              position: 'absolute',
              left: pos + 3,
              top: 2,
              fontSize: 9,
              color: '#6B7280',
              userSelect: 'none',
              lineHeight: 1,
            }}
          >
            {Math.round(originalPos)}
          </span>
        )
      }
    } else {
      ticks.push(
        <div
          key={`tick-${pos}`}
          style={{
            position: 'absolute',
            top: pos,
            right: 0,
            width: tickHeight,
            height: 1,
            backgroundColor: tickColor,
          }}
        />
      )
      if (isMajor) {
        ticks.push(
          <span
            key={`label-${pos}`}
            style={{
              position: 'absolute',
              top: pos + 2,
              left: 2,
              fontSize: 9,
              color: '#6B7280',
              userSelect: 'none',
              lineHeight: 1,
              transformOrigin: 'left top',
              whiteSpace: 'nowrap',
            }}
          >
            {Math.round(originalPos)}
          </span>
        )
      }
    }
  }

  const baseStyle: React.CSSProperties = {
    position: 'relative',
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    boxSizing: 'border-box',
    flexShrink: 0,
    overflow: 'hidden',
  }

  if (orientation === 'horizontal') {
    return (
      <div
        ref={rulerRef}
        onDoubleClick={handleDoubleClick}
        style={{
          ...baseStyle,
          height: 24,
          width: scaledLength,
        }}
      >
        {ticks}
      </div>
    )
  }

  return (
    <div
      ref={rulerRef}
      onDoubleClick={handleDoubleClick}
      style={{
        ...baseStyle,
        width: 24,
        height: scaledLength,
      }}
    >
      {ticks}
    </div>
  )
}

export default Ruler
