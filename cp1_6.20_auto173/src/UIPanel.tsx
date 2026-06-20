import { useState, useEffect } from 'react'
import type { BuildingData, FloorData } from './types'
import { FLOOR_HEIGHT_CONST } from './buildingData'

interface UIPanelProps {
  clippingY: number
  maxHeight: number
  buildingData: BuildingData
  onClippingYChange: (y: number) => void
  isAutoAnimating: boolean
  onToggleAutoAnimation: () => void
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  right: 20,
  bottom: 140,
  width: 240,
  padding: 16,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  borderRadius: 12,
  color: '#e0e0e0',
  fontSize: 16,
  zIndex: 10,
  backdropFilter: 'blur(4px)',
}

const sliderContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
}

const verticalSliderStyle: React.CSSProperties = {
  width: 200,
  height: 6,
  cursor: 'pointer',
  accentColor: '#00BFFF',
}

const infoPanelStyle: React.CSSProperties = {
  position: 'absolute',
  left: 20,
  top: 20,
  width: 200,
  padding: 14,
  backgroundColor: 'rgba(30, 30, 30, 0.85)',
  borderRadius: 8,
  color: '#e0e0e0',
  fontSize: 16,
  zIndex: 10,
  transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
  backdropFilter: 'blur(4px)',
}

const controlBarStyle: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  bottom: 40,
  width: 600,
  height: 32,
  backgroundColor: 'rgba(80, 80, 80, 0.4)',
  borderRadius: 8,
  overflow: 'hidden',
  zIndex: 10,
}

const buttonStyle: React.CSSProperties = {
  marginTop: 12,
  padding: '8px 16px',
  backgroundColor: '#00BFFF',
  color: '#000',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
  width: '100%',
  transition: 'background-color 0.2s',
}

function getCurrentFloor(buildingData: BuildingData, clippingY: number): FloorData | null {
  if (clippingY <= 0) return null
  const floorIndex = Math.min(
    Math.floor(clippingY / FLOOR_HEIGHT_CONST),
    buildingData.totalFloors - 1
  )
  if (floorIndex < 0 || floorIndex >= buildingData.floors.length) return null
  return buildingData.floors[floorIndex]
}

export function UIPanel({
  clippingY,
  maxHeight,
  buildingData,
  onClippingYChange,
  isAutoAnimating,
  onToggleAutoAnimation,
}: UIPanelProps) {
  const [panelVisible, setPanelVisible] = useState(false)
  const [prevFloorIndex, setPrevFloorIndex] = useState(-1)

  const currentFloor = getCurrentFloor(buildingData, clippingY)
  const progress = (clippingY / maxHeight) * 100

  useEffect(() => {
    const floorIdx = currentFloor?.floorIndex ?? -1
    if (floorIdx !== prevFloorIndex) {
      setPanelVisible(false)
      const timer = setTimeout(() => {
        setPanelVisible(floorIdx >= 0)
        setPrevFloorIndex(floorIdx)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [currentFloor, prevFloorIndex])

  const gradientProgressStyle: React.CSSProperties = {
    width: `${progress}%`,
    height: '100%',
    background: `linear-gradient(90deg, #00BFFF 0%, #8A2BE2 100%)`,
    transition: 'width 0.1s linear',
  }

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: `calc(${progress}% - 10px)`,
    transform: 'translateY(-50%)',
    width: 20,
    height: 20,
    backgroundColor: '#ffffff',
    border: '2px solid #00BFFF',
    borderRadius: '50%',
    cursor: 'grab',
    boxShadow: '0 2px 8px rgba(0, 191, 255, 0.4)',
  }

  return (
    <>
      <div
        style={{
          ...infoPanelStyle,
          opacity: panelVisible && currentFloor ? 1 : 0,
          transform: panelVisible && currentFloor ? 'translateY(0)' : 'translateY(-10px)',
          pointerEvents: panelVisible && currentFloor ? 'auto' : 'none',
        }}
      >
        {currentFloor && (
          <>
            <div style={{ fontWeight: 'bold', marginBottom: 10, fontSize: 18, color: '#00BFFF' }}>
              第 {currentFloor.floorIndex + 1} 层
            </div>
            <div style={{ marginBottom: 10, opacity: 0.9 }}>
              房间数量: {currentFloor.rooms.length}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
              <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>房间面积:</div>
              {currentFloor.rooms.map((room) => (
                <div
                  key={room.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 13,
                    padding: '3px 0',
                    opacity: 0.85,
                  }}
                >
                  <span>{room.id}</span>
                  <span style={{ color: '#00BFFF' }}>{room.area.toFixed(2)} ㎡</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={panelStyle}>
        <div style={sliderContainerStyle}>
          <div style={{ fontSize: 13, opacity: 0.8, alignSelf: 'flex-start' }}>
            剖切高度: {clippingY.toFixed(1)} / {maxHeight}
          </div>
          <input
            type="range"
            min={0}
            max={maxHeight}
            step={0.5}
            value={clippingY}
            onChange={(e) => onClippingYChange(parseFloat(e.target.value))}
            style={verticalSliderStyle}
            disabled={isAutoAnimating}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 11, opacity: 0.6 }}>
            <span>底层</span>
            <span>顶层</span>
          </div>
          <button
            style={{
              ...buttonStyle,
              backgroundColor: isAutoAnimating ? '#8A2BE2' : '#00BFFF',
            }}
            onClick={onToggleAutoAnimation}
          >
            {isAutoAnimating ? '停止动画' : '自动剖切动画'}
          </button>
        </div>
      </div>

      <div style={controlBarStyle}>
        <div style={gradientProgressStyle} />
        <div
          style={handleStyle}
          onMouseDown={(e) => {
            if (isAutoAnimating) return
            e.preventDefault()
            const startX = e.clientX
            const bar = e.currentTarget.parentElement!
            const rect = bar.getBoundingClientRect()
            const startY = clippingY

            const onMouseMove = (moveEvent: MouseEvent) => {
              const deltaX = moveEvent.clientX - startX
              const deltaPercent = deltaX / rect.width
              const newY = Math.max(0, Math.min(maxHeight, startY + deltaPercent * maxHeight))
              const roundedY = Math.round(newY * 2) / 2
              onClippingYChange(roundedY)
            }

            const onMouseUp = () => {
              document.removeEventListener('mousemove', onMouseMove)
              document.removeEventListener('mouseup', onMouseUp)
            }

            document.addEventListener('mousemove', onMouseMove)
            document.addEventListener('mouseup', onMouseUp)
          }}
        />
      </div>
    </>
  )
}
